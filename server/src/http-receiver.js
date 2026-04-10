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
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { LOG_PREFIX } from './constants.js';
import { validateCapturePath } from './utils/validate-path.js';

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
  const ts = (metadata.timestamp || new Date().toISOString())
    .replace(/[:.]/g, '').replace('T', '-').slice(0, 17);
  return `viewgraph-${hostname}-${ts}.json`;
}

/** Read the full request body with size limit. */
function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { req.destroy(); reject(new Error('Payload too large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

/** Send a JSON response. */
function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(data));
}

/**
 * Create an HTTP receiver.
 * @param {{ queue: object, capturesDir: string, port?: number, secret?: string }} options
 * @param {string} [options.secret] - Shared secret token. When set, all POST
 *   requests must include an `Authorization: Bearer <secret>` header. GET
 *   endpoints (/health, /requests/pending) remain open so monitoring works.
 */
export function createHttpReceiver({ queue, capturesDir, allowedDirs = [], port = 9876, secret = null, indexer = null }) {
  let server;

  /**
   * Verify the shared secret on mutating requests. Returns true if
   * authorized, false (and sends 401) if not.
   */
  function checkAuth(req, res) {
    if (!secret) return true;
    const header = req.headers.authorization || '';
    if (header === `Bearer ${secret}`) return true;
    json(res, 401, { error: 'Unauthorized - invalid or missing Bearer token' });
    return false;
  }

  async function handleRequest(req, res) {
    const { method, url } = req;

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization, x-capture-filename, x-captures-dir',
      });
      return res.end();
    }

    // GET /health - server status, captures dir, and writability check
    if (method === 'GET' && url === '/health') {
      const { existsSync, accessSync, constants: fsConstants } = await import('fs');
      const dirExists = existsSync(capturesDir);
      let writable = false;
      if (dirExists) {
        try { accessSync(capturesDir, fsConstants.W_OK); writable = true; } catch { /* not writable */ }
      }
      return json(res, 200, { status: 'ok', capturesDir, dirExists, writable, pending: queue.getPending().length });
    }

    // GET /info - project info for auto-detection by the extension
    if (method === 'GET' && url === '/info') {
      const { resolve, dirname } = await import('path');
      const absCaptures = resolve(capturesDir);
      // Derive project root: walk up from capturesDir past .viewgraph/captures
      const projectRoot = absCaptures.endsWith('.viewgraph/captures')
        ? dirname(dirname(absCaptures))
        : dirname(absCaptures);
      // Read agent name written by viewgraph-init
      let agent;
      try { const { readFileSync } = await import('fs'); agent = readFileSync(resolve(projectRoot, '.viewgraph', '.agent'), 'utf-8').trim(); } catch { /* not set */ }
      return json(res, 200, { capturesDir: absCaptures, projectRoot, token: secret || undefined, agent });
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
      if (!checkAuth(req, res)) return;
      const body = JSON.parse(await readBody(req));
      const created = queue.create(body.url, { guidance: body.guidance, purpose: body.purpose });
      return json(res, 201, { requestId: created.id, status: created.status });
    }

    // POST /requests/:id/ack
    const ackMatch = method === 'POST' && url.match(/^\/requests\/([^/]+)\/ack$/);
    if (ackMatch) {
      if (!checkAuth(req, res)) return;
      const acked = queue.acknowledge(ackMatch[1]);
      if (!acked) return json(res, 404, { error: 'Request not found' });
      return json(res, 200, { id: acked.id, status: acked.status });
    }

    // POST /requests/:id/decline - user declines a capture request
    const declineMatch = method === 'POST' && url.match(/^\/requests\/([^/]+)\/decline$/);
    if (declineMatch) {
      if (!checkAuth(req, res)) return;
      const body = await readBody(req);
      const reason = body ? JSON.parse(body).reason : undefined;
      const declined = queue.decline(declineMatch[1], reason);
      if (!declined) return json(res, 404, { error: 'Request not found' });
      return json(res, 200, { id: declined.id, status: 'declined', reason: declined.declineReason });
    }

    // POST /captures
    if (method === 'POST' && url === '/captures') {
      if (!checkAuth(req, res)) return;
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
        const { existsSync, mkdirSync } = await import('fs');
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

      return json(res, 201, { filename, requestId: match?.id ?? null });
    }

    // POST /snapshots - receive HTML snapshot from extension
    if (method === 'POST' && url === '/snapshots') {
      if (!checkAuth(req, res)) return;
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
          const { readFile } = await import('fs/promises');
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

    // GET /captures?url=... - list captures, optionally filtered by URL
    if (method === 'GET' && url.startsWith('/captures') && !url.startsWith('/captures/')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const urlFilter = params.get('url') || undefined;
      const list = indexer.list(urlFilter).slice(0, 20).map((e) => ({
        filename: e.filename, url: e.url, timestamp: e.timestamp, nodeCount: e.nodeCount,
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
      const { readFile } = await import('fs/promises');
      const capPath = validateCapturePath(latest.filename, capturesDir);
      const capContent = await readFile(capPath, 'utf-8');
      const { parseCapture } = await import('#src/parsers/viewgraph-v2.js');
      const capResult = parseCapture(capContent);
      if (!capResult.ok) return json(res, 500, { error: 'Failed to parse capture' });
      const { diffCaptures } = await import('#src/analysis/capture-diff.js');
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
      const { filename } = JSON.parse(body);
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
          process.stderr.write(`${LOG_PREFIX} HTTP receiver listening on 127.0.0.1:${actualPort}\n`);
          resolve(actualPort);
        });
      });
      return tryListen(port);
    },

    /** Stop the HTTP server. */
    stop() {
      return new Promise((resolve) => {
        if (!server) return resolve();
        server.close(resolve);
      });
    },
  };
}
