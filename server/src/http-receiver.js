/**
 * HTTP Receiver
 *
 * Lightweight HTTP server enabling the browser extension to poll for
 * capture requests and submit completed captures. Uses Node.js built-in
 * http module - no Express or other dependencies.
 *
 * Endpoints:
 * - GET  /health             -> { status: "ok", pending: N }
 * - GET  /info               -> { capturesDir, projectRoot }
 * - GET  /requests/pending   -> { requests: [...] }
 * - POST /requests/:id/ack   -> { id, status: "acknowledged" }
 * - POST /captures           -> { filename, requestId? }
 */

import { createServer } from 'http';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, accessSync, constants as fsConstants, readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { LOG_PREFIX, SERVER_VERSION, DEFAULT_HTTP_PORT, ALLOWED_CONFIG_KEYS } from './constants.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { generateSessionKey } from './auth/session-key.js';
import { validateCapturePath } from './utils/validate-path.js';
import { runPostCaptureAudit } from '#src/analysis/post-capture-audit.js';
import { runArchive } from '#src/archive.js';
import { createWebSocketServer } from './ws-server.js';
import { WS_MESSAGES } from './ws-message-types.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { diffCaptures } from '#src/analysis/capture-diff.js';

/**
 * Capture payload limit. MCP tool responses target ~400KB for LLM context
 * windows, so captures above 5MB indicate a problem (typical captures are
 * 100-200KB for 200-element pages). Also prevents memory exhaustion from
 * malicious/buggy clients. A page would need ~6000+ visible elements to
 * approach this limit.
 */
const MAX_BODY = 5 * 1024 * 1024; // 5MB captures

/**
 * Snapshot payload limit. HTML snapshots include inline styles and are
 * larger than JSON captures, but are only used for server-side fidelity
 * comparison - never sent through MCP to the LLM.
 */
const MAX_SNAPSHOT = 10 * 1024 * 1024; // 10MB snapshots

/** Generate a capture filename from metadata. */
function generateFilename(metadata) {
  const url = metadata.url || 'unknown';
  let hostname;
  try { hostname = new URL(url).hostname; } catch { hostname = 'unknown'; }
  // Sanitize hostname: strip path traversal chars and anything not alphanumeric/dash/dot
  hostname = hostname.replace(/\.\./g, '').replace(/[^a-zA-Z0-9.-]/g, '') || 'unknown';
  const ts = (metadata.timestamp || new Date().toISOString())
    .replace(/[:.]/g, '').replace('T', '-').slice(0, 17);
  return `viewgraph-${hostname}-${ts}.json`;
}

/** Read the full request body with size limit. */
function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let settled = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { settled = true; req.destroy(); reject(new Error('Payload too large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => { if (!settled) resolve(Buffer.concat(chunks).toString()); });
    req.on('error', (err) => { if (!settled) { settled = true; reject(err); } });
  });
}

/** Send a JSON response. */
function json(res, status, data) {
  // CORS: Allow all origins. Security relies on:
  // 1. Binding to 127.0.0.1 (not network-accessible)
  // 2. Auth tokens on all POST endpoints
  // 3. No sensitive data in unauthenticated GET responses
  // Content scripts run in the page's origin, so we can't restrict by origin.
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

/**
 * Create an HTTP receiver.
 * @param {{ queue: object, capturesDir: string, port?: number }} options
 * @param {string} [options.secret] - Shared secret token. When set, all POST
 *   requests must include an `Authorization: Bearer <secret>` header. GET
 *   endpoints (/health, /requests/pending) remain open so monitoring works.
 */
export function createHttpReceiver({ queue, capturesDir, allowedDirs = [], port = DEFAULT_HTTP_PORT, indexer = null, onActivity = null, idleTimeoutMinutes = 60 }) {
  let server;
  let wsServer;

  // F21: Generate session key and create auth middleware
  const configDir = path.resolve(capturesDir, '..');
  let sessionSecret;
  try { sessionSecret = generateSessionKey(configDir); } catch { sessionSecret = null; }
  const auth = sessionSecret ? createAuthMiddleware({ secret: sessionSecret, requireAuth: false }) : null;

  /**
   * Verify the shared secret on mutating requests. Returns true if
   * authorized, false (and sends 401) if not.
   */


  /**
   * Derive the config.json path from a captures directory.
   * Always resolves to the parent of capturesDir (the .viewgraph/ dir).
   * Validates the result is within the expected project structure.
   */
  function safeConfigPath(dir) {
    const resolved = path.resolve(path.dirname(dir), 'config.json');
    // Ensure config path is within the parent of the captures dir
    const parent = path.resolve(path.dirname(dir));
    if (!resolved.startsWith(parent + path.sep) && resolved !== path.join(parent, 'config.json')) return null;
    return resolved;
  }

  async function handleRequest(req, res) {
    const { method, url } = req;
    if (onActivity) onActivity();

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization, x-capture-filename, x-captures-dir, x-vg-session, x-vg-timestamp, x-vg-signature',
      });
      return res.end();
    }

    // F21: Handshake endpoints
    if (auth && method === 'GET' && url === '/handshake') {
      const result = auth.handleHandshake();
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      return res.end(JSON.stringify(result));
    }

    if (auth && method === 'POST' && url === '/handshake/verify') {
      const body = await readBody(req);
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch { parsed = {}; }
      const result = auth.handleVerify(parsed);
      if (result) {
        res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
        return res.end(JSON.stringify(result));
      }
      res.writeHead(401, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      return res.end(JSON.stringify({ error: 'Invalid handshake response' }));
    }

    // F21: Validate auth on all other requests (if auth middleware exists)
    if (auth) {
      const authResult = auth.validateRequest({ method, url, headers: req.headers, body: '' });
      if (!authResult.valid) {
        res.writeHead(401, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
        return res.end(JSON.stringify({ error: 'Unauthorized', reason: authResult.reason }));
      }
    }

    // GET /health - server status, captures dir, and writability check
    if (method === 'GET' && url === '/health') {
      const dirExists = existsSync(capturesDir);
      let writable = false;
      if (dirExists) {
        try { accessSync(capturesDir, fsConstants.W_OK); writable = true; } catch { /* not writable */ }
      }
      return json(res, 200, { status: 'ok', capturesDir, dirExists, writable, pending: queue.getPending().length });
    }

    // GET /info - project info for auto-detection by the extension
    if (method === 'GET' && url === '/info') {
      const absCaptures = path.resolve(capturesDir);
      const projectRoot = absCaptures.endsWith('.viewgraph/captures')
        ? path.dirname(path.dirname(absCaptures))
        : path.dirname(absCaptures);
      let agent;
      try { agent = readFileSync(path.resolve(projectRoot, '.viewgraph', '.agent'), 'utf-8').trim(); } catch { /* not set */ }
      let urlPatterns = [];
      let trustedPatterns = [];
      try {
        const cfg = JSON.parse(readFileSync(path.resolve(projectRoot, '.viewgraph', 'config.json'), 'utf-8'));
        urlPatterns = cfg.urlPatterns || [];
        trustedPatterns = cfg.trustedPatterns || [];
      } catch { /* no config */ }
      return json(res, 200, { capturesDir: absCaptures, projectRoot, agent, urlPatterns, trustedPatterns, serverVersion: SERVER_VERSION, idleTimeoutMinutes });
    }

    // GET /config - read project config
    if (method === 'GET' && url === '/config') {
      const configFile = safeConfigPath(capturesDir);
      try {
        const raw = readFileSync(configFile, 'utf-8');
        return json(res, 200, JSON.parse(raw));
      } catch (err) {
        if (err.code === 'ENOENT') return json(res, 200, {});
        return json(res, 500, { error: 'Failed to read config' });
      }
    }

    // PUT /config - update project config (merges with existing)
    if (method === 'PUT' && url === '/config') {
      const configFile = safeConfigPath(capturesDir);
      let updates;
      try { updates = JSON.parse(await readBody(req)); } catch {
        return json(res, 400, { error: 'Invalid JSON body' });
      }
      // S1-1: Whitelist allowed config keys to prevent config poisoning from malicious websites
      // S1-3: Use shared whitelist from constants.js
      const sanitized = {};
      for (const [k, v] of Object.entries(updates)) {
        if (ALLOWED_CONFIG_KEYS.has(k)) sanitized[k] = v;
      }
      if (Object.keys(sanitized).length === 0) return json(res, 400, { error: 'No valid config keys provided' });
      let existing = {};
      try { existing = JSON.parse(readFileSync(configFile, 'utf-8')); } catch { /* new file */ }
      const merged = { ...existing, ...sanitized };
      writeFileSync(configFile, JSON.stringify(merged, null, 2) + '\n');
      return json(res, 200, merged);
    }

    // GET /requests/pending
    if (method === 'GET' && url === '/requests/pending') {
      const pending = queue.getPending().map((r) => ({
        id: r.id, url: r.url, createdAt: r.createdAt,
        ...(r.guidance ? { guidance: r.guidance } : {}),
        ...(r.purpose ? { purpose: r.purpose } : {}),
      }));
      return json(res, 200, { requests: pending });
    }

    // POST /requests/create - create a capture request (used by agents via HTTP)
    if (method === 'POST' && url === '/requests/create') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      const created = queue.create(body.url, { guidance: body.guidance, purpose: body.purpose });
      return json(res, 201, { requestId: created.id, status: created.status });
    }

    // POST /requests/:id/ack
    const ackMatch = method === 'POST' && url.match(/^\/requests\/([^/]+)\/ack$/);
    if (ackMatch) {
      const acked = queue.acknowledge(ackMatch[1]);
      if (!acked) return json(res, 404, { error: 'Request not found' });
      return json(res, 200, { id: acked.id, status: acked.status });
    }

    // POST /requests/:id/decline - user declines a capture request
    const declineMatch = method === 'POST' && url.match(/^\/requests\/([^/]+)\/decline$/);
    if (declineMatch) {
      const body = await readBody(req);
      let reason;
      try { reason = body ? JSON.parse(body).reason : undefined; } catch { /* optional body */ }
      const declined = queue.decline(declineMatch[1], reason);
      if (!declined) return json(res, 404, { error: 'Request not found' });
      return json(res, 200, { id: declined.id, status: 'declined', reason: declined.declineReason });
    }

    // POST /captures
    if (method === 'POST' && url === '/captures') {
      let body;
      try { body = await readBody(req); } catch {
        return json(res, 413, { error: 'Payload too large (max 5MB)' });
      }
      let capture;
      try { capture = JSON.parse(body); } catch {
        return json(res, 400, { error: 'Invalid JSON' });
      }
      if (!capture.metadata) return json(res, 400, { error: 'Missing metadata section' });

      // Resolve target directory: x-captures-dir header overrides default.
      // Must match an entry in allowedDirs to prevent arbitrary file writes.
      const overrideDir = req.headers['x-captures-dir'];
      let targetDir = capturesDir;
      if (overrideDir) {
        // CodeQL js/path-injection sanitizer pattern: resolve + startsWith guard.
        // The guard must be on the same variable used downstream.
        targetDir = path.resolve(overrideDir);
        if (!allowedDirs.some((d) => targetDir === d || targetDir.startsWith(d + path.sep))) {
          return json(res, 403, { error: 'Directory not in allowedDirs - add it to .viewgraphrc.json or VIEWGRAPH_ALLOWED_DIRS' });
        }
        if (!existsSync(targetDir)) {
          try { mkdirSync(targetDir, { recursive: true }); } catch {
            return json(res, 400, { error: `Cannot create directory: ${targetDir}` });
          }
        }
      }

      const filename = generateFilename(capture.metadata);
      const safePath = validateCapturePath(filename, targetDir);
      await writeFile(safePath, JSON.stringify(capture, null, 2));

      // Auto-learn: generate or update config.json when urlPatterns is empty
      // S3-1: Only auto-learn from localhost/file URLs to prevent remote URL injection
      try {
        const configFile = safeConfigPath(targetDir);
        if (configFile && capture.metadata?.url) {
          let shouldLearn = false;
          if (!existsSync(configFile)) {
            shouldLearn = true;
          } else {
            try {
              const existing = JSON.parse(readFileSync(configFile, 'utf8'));
              if (!existing.urlPatterns || existing.urlPatterns.length === 0) shouldLearn = true;
            } catch { shouldLearn = true; }
          }
          if (shouldLearn) {
            const captureUrl = new URL(capture.metadata.url);
            const isLocal = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(captureUrl.hostname) || capture.metadata.url.startsWith('file://');
            if (isLocal) {
              const pattern = `${captureUrl.hostname}${captureUrl.port ? ':' + captureUrl.port : ''}`;
              // S3-2: Merge into existing config to preserve user keys
              let existing = {};
              try { existing = JSON.parse(readFileSync(configFile, 'utf8')); } catch { /* new file */ }
              existing.urlPatterns = [pattern];
              if (!('autoAudit' in existing)) existing.autoAudit = false;
              if (!('smartSuggestions' in existing)) existing.smartSuggestions = true;
              // S3-3: Re-validate config path before write (CodeQL js/path-injection)
              const validatedConfig = safeConfigPath(targetDir);
              if (validatedConfig) {
                writeFileSync(validatedConfig, JSON.stringify(existing, null, 2));
                console.error(`${LOG_PREFIX} Auto-configured: ${validatedConfig} (pattern: ${pattern})`);
              }
            }
          }
        }
      } catch { /* best effort - non-blocking */ }

      // Check if this completes a pending request (BUG-022: match by requestId first)
      const matchById = capture.metadata.requestId ? queue.findById(capture.metadata.requestId) : null;
      const match = matchById || queue.findByUrl(capture.metadata.url);
      if (match) queue.complete(match.id, filename);

      // Post-capture auto-audit: run if enabled in project config, push via WS
      try {
        const configFile = safeConfigPath(targetDir);
        if (!configFile) throw new Error('skip');
        const cfg = JSON.parse(readFileSync(configFile, 'utf-8'));
        if (cfg.autoAudit) {
          // Find previous capture for regression detection
          let previousParsed = null;
          if (indexer) {
            const prev = indexer.list().find((c) => c.url === capture.metadata?.url && c.filename !== filename);
            if (prev) {
              try {
                const prevPath = validateCapturePath(prev.filename, targetDir);
                const prevRaw = await readFile(prevPath, 'utf-8');
                const prevResult = parseCapture(prevRaw);
                if (prevResult.ok) previousParsed = prevResult.data;
              } catch { /* previous capture unreadable - skip regression check */ }
            }
          }
          const audit = await runPostCaptureAudit(safePath, previousParsed);
          if (audit && wsServer) {
            wsServer.broadcast({ type: WS_MESSAGES.AUDIT_RESULTS, filename, audit });
          }
        }
      } catch { /* config missing or audit failed - non-blocking */ }

      // Rolling archive: move eligible resolved captures to archive/ (non-blocking)
      try { runArchive(targetDir, { keepLatestPerUrl: 2 }).catch(() => {}); } catch { /* best effort */ }

      // TracePulse bridge: push frontend errors to TP's log collector (non-blocking)
      // Enables get_correlated_errors to pair frontend failures with backend stack traces.
      try {
        const tpUrl = process.env.TRACEPULSE_COLLECTOR_URL;
        if (tpUrl) {
          const errors = [];
          const consoleErrs = capture.console?.errors || [];
          for (const err of consoleErrs.slice(0, 10)) {
            errors.push({ source: 'viewgraph', level: 'error', service: 'frontend', message: `[console.error] ${err.message || err}`, timestamp: capture.metadata?.timestamp });
          }
          const failedReqs = capture.network?.failed || [];
          for (const req of failedReqs.slice(0, 10)) {
            errors.push({ source: 'viewgraph', level: 'error', service: 'frontend', message: `[HTTP ${req.status || 'ERR'}] ${req.url || req.name || 'unknown'}`, timestamp: capture.metadata?.timestamp });
          }
          if (errors.length > 0) {
            for (const evt of errors) {
              fetch(`${tpUrl}/collect`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(evt), signal: AbortSignal.timeout(2000) }).catch(() => {});
            }
            console.error(`${LOG_PREFIX} Pushed ${errors.length} frontend error(s) to TracePulse`);
          }
        }
      } catch { /* TP not running or not configured - silent */ }

      return json(res, 201, { filename, requestId: match?.id ?? null });
    }

    // POST /snapshots - receive HTML snapshot from extension
    if (method === 'POST' && url === '/snapshots') {
      const filenameStem = req.headers['x-capture-filename'];
      if (!filenameStem) return json(res, 400, { error: 'Missing X-Capture-Filename header' });

      let body;
      try { body = await readBody(req, MAX_SNAPSHOT); } catch {
        return json(res, 413, { error: 'Payload too large (max 10MB)' });
      }

      const snapshotsDir = path.join(capturesDir, '..', 'snapshots');
      await mkdir(snapshotsDir, { recursive: true });
      // Validate the filename stays within the snapshots directory
      const filename = `${path.basename(filenameStem)}.html`;
      const safePath = validateCapturePath(filename, snapshotsDir);
      await writeFile(safePath, body);

      return json(res, 201, { filename });
    }

    // POST /screenshots - receive PNG screenshot from extension
    if (method === 'POST' && url === '/screenshots') {
      const screenshotFilename = req.headers['x-capture-filename'];
      if (!screenshotFilename) return json(res, 400, { error: 'Missing X-Capture-Filename header' });

      let body;
      try { body = await readBody(req, MAX_SNAPSHOT); } catch {
        return json(res, 413, { error: 'Payload too large (max 10MB)' });
      }

      const screenshotsDir = path.join(capturesDir, '..', 'screenshots');
      await mkdir(screenshotsDir, { recursive: true });
      const safeName = path.basename(screenshotFilename);
      const safePath = path.resolve(screenshotsDir, safeName);
      if (!safePath.startsWith(path.resolve(screenshotsDir))) return json(res, 400, { error: 'Invalid filename' });
      await writeFile(safePath, Buffer.from(body, 'binary'));

      return json(res, 201, { filename: safeName });
    }

    // GET /annotations/resolved?url=... - resolved annotations for a URL
    // Extension polls this on sidebar open to sync resolution state from Kiro.
    // Returns resolved annotations with comment/type/severity for display,
    // deduplicated by UUID (keeps the most recent resolution per annotation).
    if (method === 'GET' && url.startsWith('/annotations/resolved')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const pageUrl = params.get('url');
      if (!pageUrl) return json(res, 400, { error: 'Missing url parameter' });

      const seen = new Map(); // uuid -> enriched annotation (dedup, latest wins)
      for (const entry of indexer.list()) {
        try {
          const filePath = validateCapturePath(entry.filename, capturesDir);
          const raw = await readFile(filePath, 'utf-8');
          const capture = JSON.parse(raw);
          // Match captures whose URL shares the same origin and path prefix.
          const captureUrl = capture.metadata?.url;
          if (!captureUrl) continue;
          try {
            const cu = new URL(captureUrl);
            const pu = new URL(pageUrl.includes('://') ? pageUrl : `http://${pageUrl}`);
            if (cu.hostname !== pu.hostname) continue;
            if (pu.port && cu.port !== pu.port) continue;
            // Path prefix match: either is a prefix of the other
            if (pu.pathname !== '/' && !cu.pathname.startsWith(pu.pathname) && !pu.pathname.startsWith(cu.pathname)) continue;
          } catch { continue; }
          for (const ann of (capture.annotations || [])) {
            if (ann.resolved && ann.uuid && !seen.has(ann.uuid)) {
              seen.set(ann.uuid, {
                uuid: ann.uuid,
                comment: ann.comment || '',
                type: ann.type || 'element',
                severity: ann.severity || '',
                ancestor: ann.ancestor || '',
                resolution: ann.resolution,
              });
            }
          }
        } catch { continue; }
      }
      return json(res, 200, { resolved: [...seen.values()] });
    }

    // GET /captures/compare?a=file1&b=file2 - diff two captures
    if (method === 'GET' && url.startsWith('/captures/compare')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const fileA = params.get('a');
      const fileB = params.get('b');
      if (!fileA || !fileB) return json(res, 400, { error: 'Missing a or b parameter' });
      try {
        const pathA = validateCapturePath(fileA, capturesDir);
        const pathB = validateCapturePath(fileB, capturesDir);
        const [rawA, rawB] = await Promise.all([readFile(pathA, 'utf-8'), readFile(pathB, 'utf-8')]);
        const a = parseCapture(rawA);
        const b = parseCapture(rawB);
        if (!a.ok || !b.ok) return json(res, 500, { error: 'Failed to parse captures' });
        const diff = diffCaptures(a.data, b.data);
        const pick = (arr) => arr.slice(0, 10).map((n) => ({ tag: n.tag, text: (n.text || '').slice(0, 40) }));
        return json(res, 200, { diff: {
          added: diff.added.length, removed: diff.removed.length,
          moved: diff.moved.length, testidChanges: diff.testidChanges.length,
          addedElements: pick(diff.added), removedElements: pick(diff.removed),
          movedElements: diff.moved.slice(0, 10), testidDetails: diff.testidChanges.slice(0, 10),
        } });
      } catch (e) { console.error(`${LOG_PREFIX} Compare error:`, e.message); return json(res, 500, { error: 'Comparison failed' }); }
    }

    // GET /captures?url=... - list captures, optionally filtered by URL
    if (method === 'GET' && url.startsWith('/captures') && !url.startsWith('/captures/')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const urlFilter = params.get('url') || undefined;
      const list = indexer.list(urlFilter).slice(0, 20).map((e) => ({
        filename: e.filename, url: e.url, title: e.title, timestamp: e.timestamp, nodeCount: e.nodeCount,
      }));
      return json(res, 200, { captures: list });
    }

    // GET /baselines - list all baselines with metadata
    if (method === 'GET' && url.startsWith('/baselines') && !url.includes('/compare')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const urlFilter = params.get('url') || undefined;
      const { listBaselines } = await import('#src/baselines.js');
      const baselines = await listBaselines(capturesDir, urlFilter);
      return json(res, 200, { baselines });
    }

    // GET /baselines/compare?url=... - diff latest capture vs baseline
    if (method === 'GET' && url.startsWith('/baselines/compare')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const pageUrl = params.get('url');
      if (!pageUrl) return json(res, 400, { error: 'Missing url parameter' });
      const { getBaseline } = await import('#src/baselines.js');
      const baseline = await getBaseline(capturesDir, pageUrl);
      if (!baseline) return json(res, 200, { hasBaseline: false });
      const latest = indexer.getLatest(pageUrl);
      if (!latest) return json(res, 200, { hasBaseline: true, noCapture: true });
      const capPath = validateCapturePath(latest.filename, capturesDir);
      const capContent = await readFile(capPath, 'utf-8');
      const capResult = parseCapture(capContent);
      if (!capResult.ok) return json(res, 500, { error: 'Failed to parse capture' });
      const diff = diffCaptures(baseline, capResult.data);
      const pick = (arr) => arr.slice(0, 10).map((n) => ({ tag: n.tag, text: (n.text || '').slice(0, 40), selector: n.selector }));
      return json(res, 200, { hasBaseline: true, diff: {
        added: diff.added.length, removed: diff.removed.length,
        moved: diff.moved.length, testidChanges: diff.testidChanges.length,
        addedElements: pick(diff.added), removedElements: pick(diff.removed),
        movedElements: diff.moved.slice(0, 10), testidDetails: diff.testidChanges.slice(0, 10),
      } });
    }

    // POST /baselines - promote a capture to baseline
    if (method === 'POST' && url === '/baselines') {
      const body = await readBody(req);
      if (!body) return json(res, 400, { error: 'Missing body' });
      let parsed;
      try { parsed = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      const { filename } = parsed;
      if (!filename) return json(res, 400, { error: 'Missing filename' });
      const { setBaseline } = await import('#src/baselines.js');
      const result = await setBaseline(capturesDir, filename);
      return json(res, 200, result);
    }

    json(res, 404, { error: 'Not found' });
  }

  return {
    /** Start the HTTP server. Tries up to 3 ports if the default is in use. */
    start() {
      const MAX_RETRIES = 3;
      let attempt = 0;
      const tryListen = (tryPort) => new Promise((resolve, reject) => {
        server = createServer(handleRequest);
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE' && attempt < MAX_RETRIES) {
            attempt++;
            const nextPort = tryPort + 1;
            process.stderr.write(`${LOG_PREFIX} Port ${tryPort} in use, trying ${nextPort}\n`);
            server.close();
            tryListen(nextPort).then(resolve, reject);
          } else {
            reject(err);
          }
        });
        server.listen(tryPort, '127.0.0.1', () => {
          const actualPort = server.address().port;
          // Prevent slow-loris: timeout idle connections after 30s, requests after 10s
          server.timeout = 30000;
          server.requestTimeout = 10000;
          // WebSocket server for real-time annotation sync
          wsServer = createWebSocketServer(server, { onActivity });
          process.stderr.write(`${LOG_PREFIX} HTTP receiver listening on 127.0.0.1:${actualPort}\n`);
          resolve(actualPort);
        });
      });
      return tryListen(port);
    },

    /** Stop the HTTP server. */
    stop() {
      return new Promise((resolve) => {
        if (wsServer) wsServer.close();
        if (!server) return resolve();
        server.close(resolve);
      });
    },

    /** Get the WebSocket server for broadcasting. */
    getWsServer() { return wsServer; },
  };
}
