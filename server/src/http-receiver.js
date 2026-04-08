/**
 * HTTP Receiver
 *
 * Lightweight HTTP server enabling the browser extension to poll for
 * capture requests and submit completed captures. Uses Node.js built-in
 * http module - no Express or other dependencies.
 *
 * Endpoints:
 * - GET  /health             -> { status: "ok", pending: N }
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
export function createHttpReceiver({ queue, capturesDir, port = 9876, secret = null }) {
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

    // GET /requests/pending
    if (method === 'GET' && url === '/requests/pending') {
      const pending = queue.getPending().map((r) => ({ id: r.id, url: r.url, createdAt: r.createdAt }));
      return json(res, 200, { requests: pending });
    }

    // POST /requests/:id/ack
    const ackMatch = method === 'POST' && url.match(/^\/requests\/([^/]+)\/ack$/);
    if (ackMatch) {
      if (!checkAuth(req, res)) return;
      const acked = queue.acknowledge(ackMatch[1]);
      if (!acked) return json(res, 404, { error: 'Request not found' });
      return json(res, 200, { id: acked.id, status: acked.status });
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

      // Resolve target directory: x-captures-dir header overrides default
      const overrideDir = req.headers['x-captures-dir'];
      let targetDir = capturesDir;
      if (overrideDir) {
        const resolved = path.resolve(overrideDir);
        // Must be an absolute path and must exist
        if (!path.isAbsolute(resolved)) return json(res, 400, { error: 'x-captures-dir must be absolute' });
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

    json(res, 404, { error: 'Not found' });
  }

  return {
    /** Start the HTTP server. Returns the actual port (useful when port=0). */
    start() {
      return new Promise((resolve, reject) => {
        server = createServer(handleRequest);
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            process.stderr.write(`${LOG_PREFIX} Port ${port} already in use. Run: ./scripts/server-stop.sh or kill $(lsof -ti:${port})\n`);
          }
          reject(err);
        });
        server.listen(port, '127.0.0.1', () => {
          const actualPort = server.address().port;
          process.stderr.write(`${LOG_PREFIX} HTTP receiver listening on 127.0.0.1:${actualPort}\n`);
          resolve(actualPort);
        });
      });
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
