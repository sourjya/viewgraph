/**
 * Tests for extension transport abstraction.
 * Covers: native messaging detection, HTTP fallback, caching.
 *
 * @see extension/lib/transport.js
 * @see ADR-013 native messaging transport
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransport } from '#lib/transport.js';

beforeEach(() => {
  globalThis.chrome = {
    runtime: {
      sendNativeMessage: undefined,
      getManifest: () => ({ version: '0.3.6' }),
    },
  };
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
});

describe('createTransport', () => {
  it('(+) returns object with send, query, isNative methods', () => {
    const t = createTransport('http://127.0.0.1:9876');
    expect(typeof t.send).toBe('function');
    expect(typeof t.query).toBe('function');
    expect(typeof t.isNative).toBe('function');
  });

  it('(+) isNative returns false when sendNativeMessage not available', async () => {
    const t = createTransport('http://127.0.0.1:9876');
    expect(await t.isNative()).toBe(false);
  });

  it('(+) query falls back to HTTP when native not available', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    }));
    const t = createTransport('http://127.0.0.1:9876');
    const result = await t.query('health');
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(result.status).toBe('ok');
  });

  it('(+) send falls back to HTTP POST when native not available', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ filename: 'test.json' }),
    }));
    const t = createTransport('http://127.0.0.1:9876');
    const result = await t.send('captures', { metadata: {} });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/captures'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.filename).toBe('test.json');
  });

  it('(+) isNative returns true when sendNativeMessage succeeds', async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => {
      cb({ status: 'ok' });
    });
    const t = createTransport('http://127.0.0.1:9876');
    expect(await t.isNative()).toBe(true);
  });

  it('(+) query uses native messaging when available', async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => {
      if (msg.type === 'health') cb({ status: 'ok' });
      else cb({ status: 'ok' });
    });
    const t = createTransport('http://127.0.0.1:9876');
    const result = await t.query('health');
    expect(result.status).toBe('ok');
    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalled();
  });

  it('(+) caches native availability check', async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => { cb({ status: 'ok' }); });
    const t = createTransport('http://127.0.0.1:9876');
    await t.isNative();
    await t.isNative();
    // sendNativeMessage called only once for the health check
    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledTimes(1);
  });

  it('(-) falls back to HTTP if native messaging errors', async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn((host, msg, cb) => {
      chrome.runtime.lastError = { message: 'host not found' };
      cb(undefined);
      delete chrome.runtime.lastError;
    });
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    }));
    const t = createTransport('http://127.0.0.1:9876');
    const result = await t.query('health');
    expect(result.status).toBe('ok');
  });
});
