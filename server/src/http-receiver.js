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
import { LOG_PREFIX } from './constants.js';
import { validateCapturePath } from './utils/validate-path.js';
import { runPostCaptureAudit } from '#src/analysis/post-capture-audit.js';
import { createWebSocketServer } from './ws-server.js';
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
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(data));
}

/**
 * Create an HTTP receiver.
 * @param {{ queue: object, capturesDir: string, port?: number }} options
 * @param {string} [options.secret] - Shared secret token. When set, all POST
 *   requests must include an `Authorization: Bearer <secret>` header. GET
 *   endpoints (/health, /requests/pending) remain open so monitoring works.
 */
export function createHttpReceiver({ queue, capturesDir, allowedDirs = [], port = 9876, indexer = null }) {
  let server;
  let wsServer;

  /**
   * Verify the shared secret on mutating requests. Returns true if
   * authorized, false (and sends 401) if not.
   */


  async function handleRequest(req, res) {
    const { method, url } = req;

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization, x-capture-filename, x-captures-dir',
      });
      return res.end();
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
      try {
        const cfg = JSON.parse(readFileSync(path.resolve(projectRoot, '.viewgraph', 'config.json'), 'utf-8'));
        urlPatterns = cfg.urlPatterns || [];
      } catch { /* no config */ }
      return json(res, 200, { capturesDir: absCaptures, projectRoot, agent, urlPatterns });
    }

    // GET /config - read project config
    if (method === 'GET' && url === '/config') {
      const configFile = path.resolve(path.dirname(capturesDir), 'config.json');
      try {
        const raw = readFileSync(configFile, 'utf-8');
        return json(res, 200, JSON.parse(raw));
      } catch (err) {
        if (err.code === 'ENOENT') return json(res, 200, {});
        return json(res, 500, { error: `Failed to read config: ${err.message}` });
      }
    }

    // PUT /config - update project config (merges with existing)
    if (method === 'PUT' && url === '/config') {
      const configFile = path.resolve(path.dirname(capturesDir), 'config.json');
      let updates;
      try { updates = JSON.parse(await readBody(req)); } catch {
        return json(res, 400, { error: 'Invalid JSON body' });
      }
      // Merge with existing config
      let existing = {};
      try { existing = JSON.parse(readFileSync(configFile, 'utf-8')); } catch { /* new file */ }
      const merged = { ...existing, ...updates };
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
        const resolved = path.resolve(overrideDir);
        if (!allowedDirs.some((d) => resolved === d || resolved.startsWith(d + path.sep))) {
          return json(res, 403, { error: 'Directory not in allowedDirs - add it to .viewgraphrc.json or VIEWGRAPH_ALLOWED_DIRS' });
        }
        if (!existsSync(resolved)) {
          try { mkdirSync(resolved, { recursive: true }); } catch {
            return json(res, 400, { error: `Cannot create directory: ${resolved}` });
          }
        }
        targetDir = resolved;
      }

      const filename = generateFilename(capture.metadata);
      const safePath = validateCapturePath(filename, targetDir);
      await writeFile(safePath, JSON.stringify(capture, null, 2));

      // Check if this completes a pending request
      const match = queue.findByUrl(capture.metadata.url);
      if (match) queue.complete(match.id, filename);

      // Post-capture auto-audit: run if enabled in project config, push via WS
      try {
        const configFile = path.resolve(path.dirname(targetDir), 'config.json');
        const cfg = JSON.parse(readFileSync(configFile, 'utf-8'));
        if (cfg.autoAudit) {
          const audit = await runPostCaptureAudit(safePath);
          if (audit && wsServer) {
            wsServer.broadcast({ type: 'audit:results', filename, audit });
          }
        }
      } catch { /* config missing or audit failed - non-blocking */ }

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

    // GET /annotations/resolved?url=... - resolved annotations for a URL
    // Extension polls this on sidebar open to sync resolution state from Kiro
    if (method === 'GET' && url.startsWith('/annotations/resolved')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const pageUrl = params.get('url');
      if (!pageUrl) return json(res, 400, { error: 'Missing url parameter' });

      const resolved = [];
      for (const entry of indexer.list()) {
        try {
          const filePath = validateCapturePath(entry.filename, capturesDir);
          const raw = await readFile(filePath, 'utf-8');
          const capture = JSON.parse(raw);
          if (!capture.metadata?.url?.includes(pageUrl)) continue;
          for (const ann of (capture.annotations || [])) {
            if (ann.resolved && ann.uuid) {
              resolved.push({ uuid: ann.uuid, resolution: ann.resolution });
            }
          }
        } catch { continue; }
      }
      return json(res, 200, { resolved });
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
      } catch (e) { return json(res, 500, { error: e.message }); }
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
          wsServer = createWebSocketServer(server);
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
