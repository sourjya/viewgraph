/**
 * Tests for transport-client.js - Content Script Transport Proxy
 *
 * Verifies that transport-client mirrors the transport.js API but routes
 * all calls through chrome.runtime.sendMessage to the service worker
 * instead of making direct HTTP/WS/native messaging calls.
 *
 * Phase 0 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 1
 * @see extension/lib/transport-client.js - implementation under test
 * @see extension/lib/transport.js - the real transport (runs in SW)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockChrome } from '../mocks/chrome.js';

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

/** @type {import('vitest').Mock} */
let sendMessageMock;

beforeEach(() => {
  sendMessageMock = vi.fn((msg, cb) => {
    if (cb) cb({ ok: true, result: {} });
  });
  mockChrome({
    runtime: { sendMessage: sendMessageMock },
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({})),
        set: vi.fn(() => Promise.resolve()),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

/** Configure sendMessage to return a result for a given op. */
function mockResponse(op, result) {
  sendMessageMock.mockImplementation((msg, cb) => {
    if (msg?.op === op) cb({ ok: true, result });
    else cb({ ok: true, result: {} });
  });
}

/** Configure sendMessage to return an error for a given op. */
function mockError(op, error) {
  sendMessageMock.mockImplementation((msg, cb) => {
    if (msg?.op === op) cb({ ok: false, error });
    else cb({ ok: true, result: {} });
  });
}

// ──────────────────────────────────────────────
// Message Protocol
// ──────────────────────────────────────────────

describe('message protocol', () => {
  it('(+) sends vg-transport type with op and args', async () => {
    const { getInfo } = await import('#lib/transport-client.js');
    await getInfo();
    expect(sendMessageMock).toHaveBeenCalledWith(
      { type: 'vg-transport', op: 'getInfo', args: {} },
      expect.any(Function),
    );
  });

  it('(+) returns result from { ok: true, result } response', async () => {
    mockResponse('getInfo', { projectRoot: '/test' });
    const { getInfo } = await import('#lib/transport-client.js');
    const res = await getInfo();
    expect(res).toEqual({ projectRoot: '/test' });
  });

  it('(-) throws on { ok: false, error } response', async () => {
    mockError('getInfo', 'Server offline');
    const { getInfo } = await import('#lib/transport-client.js');
    await expect(getInfo()).rejects.toThrow('Server offline');
  });

  it('(-) handles chrome.runtime.lastError gracefully', async () => {
    sendMessageMock.mockImplementation((msg, cb) => {
      globalThis.chrome.runtime.lastError = { message: 'SW not ready' };
      cb(undefined);
      globalThis.chrome.runtime.lastError = undefined;
    });
    const { getInfo } = await import('#lib/transport-client.js');
    await expect(getInfo()).rejects.toThrow('SW not ready');
  });
});

// ──────────────────────────────────────────────
// Query Operations (GET-like)
// ──────────────────────────────────────────────

describe('query operations', () => {
  it('(+) getInfo sends op=getInfo', async () => {
    const { getInfo } = await import('#lib/transport-client.js');
    await getInfo();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getInfo' }), expect.any(Function),
    );
  });

  it('(+) getHealth sends op=getHealth', async () => {
    const { getHealth } = await import('#lib/transport-client.js');
    await getHealth();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getHealth' }), expect.any(Function),
    );
  });

  it('(+) getCaptures passes url in args', async () => {
    const { getCaptures } = await import('#lib/transport-client.js');
    await getCaptures('http://localhost:3000');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getCaptures', args: { url: 'http://localhost:3000' } }),
      expect.any(Function),
    );
  });

  it('(+) getResolved passes pageUrl in args', async () => {
    const { getResolved } = await import('#lib/transport-client.js');
    await getResolved('http://localhost:3000/app');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getResolved', args: { pageUrl: 'http://localhost:3000/app' } }),
      expect.any(Function),
    );
  });

  it('(+) getPendingRequests sends empty args', async () => {
    const { getPendingRequests } = await import('#lib/transport-client.js');
    await getPendingRequests();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getPendingRequests', args: {} }),
      expect.any(Function),
    );
  });

  it('(+) getConfig sends op=getConfig', async () => {
    const { getConfig } = await import('#lib/transport-client.js');
    await getConfig();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getConfig' }), expect.any(Function),
    );
  });

  it('(+) getBaselines passes url in args', async () => {
    const { getBaselines } = await import('#lib/transport-client.js');
    await getBaselines('http://localhost:3000');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'getBaselines', args: { url: 'http://localhost:3000' } }),
      expect.any(Function),
    );
  });

  it('(+) compareBaseline passes url in args', async () => {
    const { compareBaseline } = await import('#lib/transport-client.js');
    await compareBaseline('http://localhost:3000');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'compareBaseline', args: { url: 'http://localhost:3000' } }),
      expect.any(Function),
    );
  });
});

// ──────────────────────────────────────────────
// Send Operations (POST/PUT-like)
// ──────────────────────────────────────────────

describe('send operations', () => {
  it('(+) sendCapture passes data and headers', async () => {
    const { sendCapture } = await import('#lib/transport-client.js');
    await sendCapture({ metadata: {} }, { 'x-test': '1' });
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'sendCapture', args: { data: { metadata: {} }, headers: { 'x-test': '1' } },
      }),
      expect.any(Function),
    );
  });

  it('(+) sendScreenshot passes data', async () => {
    const { sendScreenshot } = await import('#lib/transport-client.js');
    await sendScreenshot({ png: 'base64' });
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'sendScreenshot', args: { data: { png: 'base64' } } }),
      expect.any(Function),
    );
  });

  it('(+) updateConfig passes data', async () => {
    const { updateConfig } = await import('#lib/transport-client.js');
    await updateConfig({ autoAudit: true });
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'updateConfig', args: { data: { autoAudit: true } } }),
      expect.any(Function),
    );
  });

  it('(+) setBaseline passes filename', async () => {
    const { setBaseline } = await import('#lib/transport-client.js');
    await setBaseline('cap.json');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'setBaseline', args: { filename: 'cap.json' } }),
      expect.any(Function),
    );
  });

  it('(+) ackRequest passes id', async () => {
    const { ackRequest } = await import('#lib/transport-client.js');
    await ackRequest('req-42');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'ackRequest', args: { id: 'req-42' } }),
      expect.any(Function),
    );
  });

  it('(+) declineRequest passes id and reason', async () => {
    const { declineRequest } = await import('#lib/transport-client.js');
    await declineRequest('req-42', 'Not now');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'declineRequest', args: { id: 'req-42', reason: 'Not now' } }),
      expect.any(Function),
    );
  });
});

// ──────────────────────────────────────────────
// Event Subscription (via chrome.storage.onChanged)
// ──────────────────────────────────────────────

describe('event subscription', () => {
  let storageListener;

  beforeEach(() => {
    globalThis.chrome.storage.onChanged = {
      addListener: vi.fn((fn) => { storageListener = fn; }),
      removeListener: vi.fn(),
    };
  });

  it('(+) onEvent fires callback for matching event type', async () => {
    const { onEvent } = await import('#lib/transport-client.js');
    const cb = vi.fn();
    onEvent('annotation:resolved', cb);
    storageListener({
      'vg-ws-events': { newValue: [{ type: 'annotation:resolved', data: { uuid: 'abc' } }] },
    }, 'local');
    expect(cb).toHaveBeenCalledWith({ type: 'annotation:resolved', data: { uuid: 'abc' } });
  });

  it('(+) offEvent removes callback', async () => {
    const { onEvent, offEvent } = await import('#lib/transport-client.js');
    const cb = vi.fn();
    onEvent('annotation:resolved', cb);
    offEvent('annotation:resolved', cb);
    storageListener({
      'vg-ws-events': { newValue: [{ type: 'annotation:resolved', data: {} }] },
    }, 'local');
    expect(cb).not.toHaveBeenCalled();
  });

  it('(-) ignores unrelated storage keys', async () => {
    const { onEvent } = await import('#lib/transport-client.js');
    const cb = vi.fn();
    onEvent('annotation:resolved', cb);
    storageListener({ 'other-key': { newValue: 'x' } }, 'local');
    expect(cb).not.toHaveBeenCalled();
  });

  it('(-) ignores events with non-matching type', async () => {
    const { onEvent } = await import('#lib/transport-client.js');
    const cb = vi.fn();
    onEvent('annotation:resolved', cb);
    storageListener({
      'vg-ws-events': { newValue: [{ type: 'audit:results', data: {} }] },
    }, 'local');
    expect(cb).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// Server URL
// ──────────────────────────────────────────────

describe('getServerUrl', () => {
  it('(+) reads from chrome.storage.local', async () => {
    globalThis.chrome.storage.local.get = vi.fn(() =>
      Promise.resolve({ 'vg-server-url': 'http://127.0.0.1:9876' }),
    );
    const { getServerUrl } = await import('#lib/transport-client.js');
    expect(await getServerUrl()).toBe('http://127.0.0.1:9876');
  });

  it('(-) returns null when no URL stored', async () => {
    globalThis.chrome.storage.local.get = vi.fn(() => Promise.resolve({}));
    const { getServerUrl } = await import('#lib/transport-client.js');
    expect(await getServerUrl()).toBeNull();
  });
});

// ──────────────────────────────────────────────
// API Surface Completeness
// ──────────────────────────────────────────────

describe('API surface matches transport.js', () => {
  it('(+) exports all methods content scripts consume', async () => {
    const client = await import('#lib/transport-client.js');
    for (const m of [
      'getInfo', 'getHealth', 'getCaptures', 'getResolved',
      'getPendingRequests', 'getConfig', 'getBaselines', 'compareBaseline',
      'sendCapture', 'sendScreenshot', 'updateConfig', 'setBaseline',
      'ackRequest', 'declineRequest', 'onEvent', 'offEvent', 'getServerUrl',
    ]) {
      expect(typeof client[m]).toBe('function');
    }
  });
});
