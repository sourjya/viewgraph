/**
 * WebSocket Server - Unit Tests
 *
 * Tests the WebSocket server module: connection, auth, broadcast, keepalive.
 * Uses a real HTTP server + ws client for integration-style tests.
 *
 * @see src/ws-server.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from 'http';
import WebSocket from 'ws';
import { createWebSocketServer } from '#src/ws-server.js';

let httpServer;
let wsServer;
let port;
const openClients = [];

async function setup(options = {}) {
  httpServer = createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  port = httpServer.address().port;
  wsServer = createWebSocketServer(httpServer, options);
}

function connectClient(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    openClients.push(ws);
    ws.on('open', () => {
      if (token !== undefined) {
        // Auth removed (ADR-010) - no auth message needed
      }
      resolve(ws);
    });
    ws.on('error', reject);
  });
}

function waitForMessage(ws) {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(JSON.parse(data)));
  });
}

afterEach(async () => {
  // Close all open clients first
  for (const c of openClients) {
    if (c.readyState === WebSocket.OPEN || c.readyState === WebSocket.CONNECTING) {
      c.terminate();
    }
  }
  openClients.length = 0;
  if (wsServer) { wsServer.close(); wsServer = null; }
  if (httpServer) { await new Promise((r) => httpServer.close(r)); httpServer = null; }
});

describe('WebSocket server', () => {
  it('(+) accepts connection without auth (ADR-010)', async () => {
    await setup({});
    const ws = await connectClient();
    expect(wsServer.getClientCount()).toBe(1);
    ws.close();
  });

  it('(+) accepts any connection without auth (ADR-010)', async () => {
    await setup({});
    const ws = await connectClient();
    expect(wsServer.getClientCount()).toBe(1);
    ws.close();
  });

  it('(+) allows open access when no token configured', async () => {
    await setup({});
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise((resolve) => ws.on('open', resolve));
    // No auth needed - send a message directly
    ws.send(JSON.stringify({ type: 'annotation:create', annotation: { id: 1 } }));
    // Should not crash
    ws.close();
  });

  it('(+) broadcasts to other clients', async () => {
    await setup({});
    const ws1 = await connectClient();
    const ws2 = await connectClient();

    const msgPromise = waitForMessage(ws2);
    ws1.send(JSON.stringify({ type: 'annotation:create', annotation: { id: 'a1' } }));
    const received = await msgPromise;
    expect(received.type).toBe('annotation:create');
    expect(received.annotation.id).toBe('a1');
    ws1.close();
    ws2.close();
  });

  it('(+) broadcast() sends to all clients', async () => {
    await setup({});
    const ws1 = await connectClient();
    const msgPromise = waitForMessage(ws1);
    wsServer.broadcast({ type: 'annotation:resolved', uuid: 'u1' });
    const received = await msgPromise;
    expect(received.type).toBe('annotation:resolved');
    expect(received.uuid).toBe('u1');
    ws1.close();
  });

  it('(+) getClientCount tracks connections', async () => {
    await setup({});
    expect(wsServer.getClientCount()).toBe(0);
    const ws1 = await connectClient();
    expect(wsServer.getClientCount()).toBe(1);
    // Close and wait for server to notice
    await new Promise((resolve) => {
      ws1.on('close', () => setTimeout(resolve, 20));
      ws1.close();
    });
    expect(wsServer.getClientCount()).toBe(0);
  });

  it('(-) rejects non-/ws upgrade paths', async () => {
    await setup({});
    const ws = new WebSocket(`ws://127.0.0.1:${port}/other`);
    await new Promise((resolve) => {
      ws.on('error', resolve);
      ws.on('close', resolve);
    });
    // Should have been destroyed
    expect(ws.readyState).not.toBe(WebSocket.OPEN);
  });
});
