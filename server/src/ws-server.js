/**
 * WebSocket Server
 *
 * Handles WebSocket connections for real-time annotation collaboration.
 * Attaches to the existing HTTP server via the `upgrade` event. Clients
 * (browser extension) connect and exchange annotation events:
 *
 * Extension -> Server:
 *   - annotation:create  { annotation }
 *   - annotation:update  { uuid, changes }
 *   - annotation:delete  { uuid }
 *   - capture:complete   { filename }
 *
 * Server -> Extension:
 *   - annotation:resolved { uuid, resolution }
 *   - request:capture     { requestId, url, purpose, guidance }
 *   - ping                (keepalive)
 *
 * Auth: first message must be { type: "auth", token } matching the
 * server's auth token. Unauthenticated connections are closed.
 *
 * @see docs/roadmap/roadmap.md - M14.3
 */

import { WebSocketServer } from 'ws';
import { LOG_PREFIX } from './constants.js';

/** Keepalive interval - 30 seconds. */
const PING_INTERVAL_MS = 30000;

/**
 * Create a WebSocket handler that attaches to an HTTP server.
 * @param {import('http').Server} httpServer
 * @param {{ authToken?: string, onAnnotation?: function, onCapture?: function }} options
 * @returns {{ broadcast: function, getClientCount: function, close: function }}
 */
export function createWebSocketServer(httpServer, options = {}) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();
  let pingTimer = null;

  // Handle upgrade requests on the HTTP server
  httpServer.on('upgrade', (req, socket, head) => {
    // Only upgrade /ws path
    if (req.url !== '/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    let authenticated = !options.authToken; // No token = open access
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }

      // Auth check - first message must be auth
      if (!authenticated) {
        if (msg.type === 'auth' && msg.token === options.authToken) {
          authenticated = true;
          clients.add(ws);
          ws.send(JSON.stringify({ type: 'auth:ok' }));
          process.stderr.write(`${LOG_PREFIX} WebSocket client authenticated (${clients.size} total)\n`);
        } else {
          ws.send(JSON.stringify({ type: 'auth:fail' }));
          ws.close(4001, 'Unauthorized');
        }
        return;
      }

      // Route messages
      if (msg.type === 'annotation:create' || msg.type === 'annotation:update' || msg.type === 'annotation:delete') {
        if (options.onAnnotation) options.onAnnotation(msg);
        // Broadcast to other clients
        broadcastExcept(ws, msg);
      } else if (msg.type === 'capture:complete') {
        if (options.onCapture) options.onCapture(msg);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      process.stderr.write(`${LOG_PREFIX} WebSocket client disconnected (${clients.size} remaining)\n`);
    });

    ws.on('error', () => { clients.delete(ws); });
  });

  // Keepalive ping
  pingTimer = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) { ws.terminate(); clients.delete(ws); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, PING_INTERVAL_MS);

  /**
   * Broadcast a message to all authenticated clients except the sender.
   * @param {import('ws').WebSocket} sender
   * @param {object} msg
   */
  function broadcastExcept(sender, msg) {
    const payload = JSON.stringify(msg);
    for (const client of clients) {
      if (client !== sender && client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  /**
   * Broadcast a message to all authenticated clients.
   * @param {object} msg
   */
  function broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  }

  return {
    broadcast,
    getClientCount: () => clients.size,
    close() {
      clearInterval(pingTimer);
      for (const client of clients) client.terminate();
      clients.clear();
      wss.close();
    },
  };
}
