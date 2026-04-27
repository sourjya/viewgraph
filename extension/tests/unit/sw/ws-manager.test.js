/**
 * Tests for sw/ws-manager.js - Service Worker WebSocket Manager
 *
 * Verifies reference-counted connect/disconnect, event storage,
 * keepalive pings, and auto-reconnect with exponential backoff.
 *
 * Phase 3 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 11
 * @see extension/lib/sw/ws-manager.js - implementation under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────
// WebSocket mock
// ──────────────────────────────────────────────

let wsInstances = [];

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.send = vi.fn();
    this.close = vi.fn(() => { this.readyState = 3; if (this.onclose) this.onclose({ code: 1000 }); });
    wsInstances.push(this);
    // Auto-open after microtask
    Promise.resolve().then(() => { this.readyState = 1; if (this.onopen) this.onopen(); });
  }
}

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

let storageData = {};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  wsInstances = [];
  storageData = {};
  globalThis.WebSocket = MockWebSocket;
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve(storageData[key] !== undefined ? { [key]: storageData[key] } : {})),
        set: vi.fn((obj) => { Object.assign(storageData, obj); return Promise.resolve(); }),
      },
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete globalThis.WebSocket;
});

// ──────────────────────────────────────────────
// Connection Lifecycle
// ──────────────────────────────────────────────

describe('connection lifecycle', () => {
  it('(+) sidebarOpened connects WebSocket', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    expect(wsInstances).toHaveLength(1);
    expect(wsInstances[0].url).toBe('ws://127.0.0.1:9876');
  });

  it('(+) sidebarClosed with count=0 disconnects', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    mgr.sidebarClosed();
    expect(wsInstances[0].close).toHaveBeenCalled();
  });

  it('(+) multiple sidebarOpened calls maintain single connection', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    mgr.sidebarOpened();
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    expect(wsInstances).toHaveLength(1);
  });

  it('(+) only disconnects when all sidebars close', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    mgr.sidebarClosed(); // count = 1, still open
    expect(wsInstances[0].close).not.toHaveBeenCalled();
    mgr.sidebarClosed(); // count = 0, close
    expect(wsInstances[0].close).toHaveBeenCalled();
  });

  it('(-) connect failure does not crash', async () => {
    globalThis.WebSocket = class { constructor() { throw new Error('WS unavailable'); } };
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    expect(() => mgr.sidebarOpened()).not.toThrow();
  });
});

// ──────────────────────────────────────────────
// Event Storage
// ──────────────────────────────────────────────

describe('event storage', () => {
  it('(+) incoming events written to chrome.storage.local', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    // Simulate incoming WS message
    const ws = wsInstances[0];
    ws.onmessage({ data: JSON.stringify({ type: 'annotation:resolved', uuid: 'abc' }) });
    await vi.advanceTimersByTimeAsync(0);
    expect(globalThis.chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'vg-ws-events': expect.any(Array) }),
    );
  });
});

// ──────────────────────────────────────────────
// Keepalive
// ──────────────────────────────────────────────

describe('keepalive', () => {
  it('(+) sends ping every 20s while connected', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0); // open
    const ws = wsInstances[0];
    await vi.advanceTimersByTimeAsync(20000);
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('ping'));
    await vi.advanceTimersByTimeAsync(20000);
    expect(ws.send.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ──────────────────────────────────────────────
// Auto-Reconnect
// ──────────────────────────────────────────────

describe('auto-reconnect', () => {
  it('(+) reconnects on unexpected close with backoff', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    // Simulate unexpected close (not user-initiated)
    const ws = wsInstances[0];
    ws.readyState = 3;
    ws.onclose({ code: 1006 }); // abnormal close
    // First reconnect after 1s
    await vi.advanceTimersByTimeAsync(1000);
    expect(wsInstances).toHaveLength(2);
  });

  it('(+) does not reconnect on clean close (user-initiated)', async () => {
    const { createWsManager } = await import('#lib/sw/ws-manager.js');
    const mgr = createWsManager('ws://127.0.0.1:9876');
    mgr.sidebarOpened();
    await vi.advanceTimersByTimeAsync(0);
    mgr.sidebarClosed(); // clean close
    await vi.advanceTimersByTimeAsync(5000);
    expect(wsInstances).toHaveLength(1); // no reconnect
  });
});
