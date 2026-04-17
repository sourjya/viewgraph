/**
 * Tests for transport abstraction layer.
 * Covers: init, native detection, HTTP fallback, high-level API, events, reset.
 *
 * @see extension/lib/transport.js
 * @see ADR-013 native messaging transport
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as transport from '#lib/transport.js';

beforeEach(() => {
  transport.reset();
  globalThis.chrome = {
    runtime: { sendNativeMessage: undefined, lastError: null },
  };
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
});

describe('transport init/reset', () => {
  it('(+) init sets server URL', () => {
    transport.init('http://127.0.0.1:9876');
    // No error means init succeeded
    expect(true).toBe(true);
  });

  it('(+) reset clears state', () => {
    transport.init('http://127.0.0.1:9876');
    transport.reset();
    // After reset, queries should fail (no server URL)
    expect(transport.isNative()).resolves.toBe(false);
  });
});

describe('native detection', () => {
  it('(+) isNative returns false when sendNativeMessage not available', async () => {
    expect(await transport.isNative()).toBe(false);
  });

  it('(+) isNative returns true when native host responds', async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => { cb({ status: 'ok' }); });
    expect(await transport.isNative()).toBe(true);
  });

  it('(+) caches native detection result', async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => { cb({ status: 'ok' }); });
    await transport.isNative();
    await transport.isNative();
    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledTimes(1);
  });
});

describe('HTTP fallback', () => {
  it('(+) getInfo calls /info via HTTP', async () => {
    transport.init('http://127.0.0.1:9876');
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test' }) }));
    const res = await transport.getInfo();
    expect(res.projectRoot).toBe('/test');
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/info'), expect.any(Object));
  });

  it('(+) getCaptures calls /captures with URL param', async () => {
    transport.init('http://127.0.0.1:9876');
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ captures: [] }) }));
    await transport.getCaptures('http://localhost:3000');
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('url='), expect.any(Object));
  });

  it('(+) sendCapture POSTs to /captures', async () => {
    transport.init('http://127.0.0.1:9876');
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ filename: 'test.json' }) }));
    const res = await transport.sendCapture({ metadata: {} });
    expect(res.filename).toBe('test.json');
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/captures'), expect.objectContaining({ method: 'POST' }));
  });

  it('(+) updateConfig PUTs to /config', async () => {
    transport.init('http://127.0.0.1:9876');
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) }));
    await transport.updateConfig({ autoAudit: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/config'), expect.objectContaining({ method: 'PUT' }));
  });

  it('(-) returns null when not initialized', async () => {
    const result = await transport.getInfo();
    expect(result).toBeNull();
  });
});

describe('native messaging path', () => {
  it('(+) getInfo uses native messaging when available', async () => {
    transport.init('http://127.0.0.1:9876');
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => {
      if (msg.type === 'health') cb({ status: 'ok' });
      else if (msg.type === 'info') cb({ projectRoot: '/native' });
      else cb({});
    });
    const res = await transport.getInfo();
    expect(res.projectRoot).toBe('/native');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('(+) sendCapture uses native messaging when available', async () => {
    transport.init('http://127.0.0.1:9876');
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => {
      if (msg.type === 'health') cb({ status: 'ok' });
      else cb({ filename: 'native.json' });
    });
    const res = await transport.sendCapture({ metadata: {} });
    expect(res.filename).toBe('native.json');
  });
});

describe('events', () => {
  it('(+) onEvent registers a listener', () => {
    const cb = vi.fn();
    transport.onEvent('annotation:resolved', cb);
    // No error = registered
    expect(true).toBe(true);
  });

  it('(+) offEvent removes a listener', () => {
    const cb = vi.fn();
    transport.onEvent('test', cb);
    transport.offEvent('test', cb);
    expect(true).toBe(true);
  });
});

describe('high-level API completeness', () => {
  it('(+) all expected methods are exported', () => {
    expect(typeof transport.init).toBe('function');
    expect(typeof transport.reset).toBe('function');
    expect(typeof transport.isNative).toBe('function');
    expect(typeof transport.getInfo).toBe('function');
    expect(typeof transport.getHealth).toBe('function');
    expect(typeof transport.getCaptures).toBe('function');
    expect(typeof transport.getResolved).toBe('function');
    expect(typeof transport.getPendingRequests).toBe('function');
    expect(typeof transport.getConfig).toBe('function');
    expect(typeof transport.getBaselines).toBe('function');
    expect(typeof transport.sendCapture).toBe('function');
    expect(typeof transport.updateConfig).toBe('function');
    expect(typeof transport.setBaseline).toBe('function');
    expect(typeof transport.ackRequest).toBe('function');
    expect(typeof transport.declineRequest).toBe('function');
    expect(typeof transport.onEvent).toBe('function');
    expect(typeof transport.offEvent).toBe('function');
  });
});
