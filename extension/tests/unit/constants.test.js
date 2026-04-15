/**
 * Constants - Config Helpers Unit Tests
 *
 * Tests fetchConfig and updateConfig from constants.js.
 * Server discovery is tested in server-routing.test.js.
 *
 * @see lib/constants.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchConfig, updateConfig } from '#lib/constants.js';

beforeEach(() => {
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({})),
        set: vi.fn(() => Promise.resolve()),
      },
    },
  };
  globalThis.AbortSignal = { timeout: () => undefined };
});

describe('fetchConfig', () => {
  it('(+) fetches config from server and caches locally', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ autoAudit: true, smartSuggestions: false }),
    }));
    const config = await fetchConfig('http://localhost:9876');
    expect(fetch).toHaveBeenCalledWith('http://localhost:9876/config', expect.any(Object));
    expect(config.autoAudit).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('(-) returns cached config when server is offline', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    chrome.storage.local.get.mockResolvedValue({ vg_project_config: { autoAudit: false } });
    const config = await fetchConfig('http://localhost:9876');
    expect(config.autoAudit).toBe(false);
  });

  it('(-) returns empty object when no cache and server offline', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    chrome.storage.local.get.mockResolvedValue({});
    const config = await fetchConfig('http://localhost:9876');
    expect(config).toEqual({});
  });
});

describe('updateConfig', () => {
  it('(+) sends PUT and caches result', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ autoAudit: true, smartSuggestions: true }),
    }));
    const config = await updateConfig('http://localhost:9876', { autoAudit: true });
    expect(fetch).toHaveBeenCalledWith('http://localhost:9876/config', expect.objectContaining({ method: 'PUT' }));
    expect(config.autoAudit).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('(-) throws on server error', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
    await expect(updateConfig('http://localhost:9876', {})).rejects.toThrow();
  });
});
