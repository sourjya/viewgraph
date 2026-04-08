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
 * @param {{ queue: object, capturesDir: string, port?: number }} options
 */
export function createHttpReceiver({ queue, capturesDir, port = 9876 }) {
  let server;

  async function handleRequest(req, res) {
    const { method, url } = req;

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      return res.end();
    }

    // GET /health
    if (method === 'GET' && url === '/health') {
      return json(res, 200, { status: 'ok', pending: queue.getPending().length });
    }

    // GET /requests/pending
    if (method === 'GET' && url === '/requests/pending') {
      const pending = queue.getPending().map((r) => ({ id: r.id, url: r.url, createdAt: r.createdAt }));
      return json(res, 200, { requests: pending });
    }

    // POST /requests/:id/ack
    const ackMatch = method === 'POST' && url.match(/^\/requests\/([^/]+)\/ack$/);
    if (ackMatch) {
      const acked = queue.acknowledge(ackMatch[1]);
      if (!acked) return json(res, 404, { error: 'Request not found' });
      return json(res, 200, { id: acked.id, status: acked.status });
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

      const filename = generateFilename(capture.metadata);
      await writeFile(path.join(capturesDir, filename), JSON.stringify(capture, null, 2));

      // Check if this completes a pending request
      const match = queue.findByUrl(capture.metadata.url);
      if (match) queue.complete(match.id, filename);

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
      const filename = `${filenameStem}.html`;
      await writeFile(path.join(snapshotsDir, filename), body);

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
