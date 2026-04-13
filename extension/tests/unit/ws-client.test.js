/**
 * WebSocket Client - Unit Tests
 *
 * Tests the extension WebSocket client module: connect, send, disconnect.
 * Uses a mock WebSocket since jsdom doesn't have real WebSocket support.
 *
 * @see lib/ws-client.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connect, disconnect, isConnected, send, sendAnnotationCreate, sendAnnotationUpdate, sendAnnotationDelete } from '#lib/ws-client.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor() {
    this.readyState = MockWebSocket.CONNECTING;
    this.sent = [];
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = MockWebSocket.CLOSED; this.onclose?.(); }
}

vi.stubGlobal('WebSocket', MockWebSocket);

beforeEach(() => { disconnect(); });
afterEach(() => { disconnect(); });

describe('WebSocket client', () => {
  it('(+) connect establishes WebSocket (no auth - ADR-010)', async () => {
    let ws;
    const origWS = globalThis.WebSocket;
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(...args) { super(...args); ws = this; }
    };
    connect({ url: 'http://127.0.0.1:9876',  });
    await new Promise((r) => setTimeout(r, 20));
    // Auth removed (ADR-010) - no auth message sent
    globalThis.WebSocket = origWS;
  });

  it('(+) sendAnnotationCreate sends correct message', async () => {
    let ws;
    const origWS = globalThis.WebSocket;
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(...args) { super(...args); ws = this; }
    };
    connect({ url: 'http://127.0.0.1:9876',  });
    await new Promise((r) => setTimeout(r, 20));
    sendAnnotationCreate({ id: 'a1', comment: 'test' });
    expect(ws.sent[0]).toEqual({ type: 'annotation:create', annotation: { id: 'a1', comment: 'test' } });
    globalThis.WebSocket = origWS;
  });

  it('(+) sendAnnotationUpdate sends uuid and changes', async () => {
    let ws;
    const origWS = globalThis.WebSocket;
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(...args) { super(...args); ws = this; }
    };
    connect({ url: 'http://127.0.0.1:9876',  });
    await new Promise((r) => setTimeout(r, 20));
    sendAnnotationUpdate('u1', { comment: 'updated' });
    expect(ws.sent[0]).toEqual({ type: 'annotation:update', uuid: 'u1', changes: { comment: 'updated' } });
    globalThis.WebSocket = origWS;
  });

  it('(+) sendAnnotationDelete sends uuid', async () => {
    let ws;
    const origWS = globalThis.WebSocket;
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(...args) { super(...args); ws = this; }
    };
    connect({ url: 'http://127.0.0.1:9876',  });
    await new Promise((r) => setTimeout(r, 20));
    sendAnnotationDelete('u1');
    expect(ws.sent[0]).toEqual({ type: 'annotation:delete', uuid: 'u1' });
    globalThis.WebSocket = origWS;
  });

  it('(+) disconnect closes connection', () => {
    disconnect();
    expect(isConnected()).toBe(false);
  });

  it('(-) send when disconnected does not throw', () => {
    expect(() => send({ type: 'test' })).not.toThrow();
  });
});
