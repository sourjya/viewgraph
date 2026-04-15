/**
 * Storage Helpers - Unit Tests
 *
 * @see lib/storage.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KEYS, annotationKey, get, set, remove } from '#lib/storage.js';

beforeEach(() => {
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve({ [key]: undefined })),
        set: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
      },
    },
  };
});

describe('storage', () => {
  it('(+) KEYS has expected storage key names', () => {
    expect(KEYS.autoMapping).toBeDefined();
    expect(KEYS.settings).toBeDefined();
    expect(typeof KEYS.autoMapping).toBe('string');
  });

  it('(+) annotationKey generates URL-based key', () => {
    const key = annotationKey('http://localhost:3000/login');
    expect(key).toContain('localhost');
    expect(typeof key).toBe('string');
  });

  it('(+) get calls chrome.storage.local.get', async () => {
    chrome.storage.local.get.mockResolvedValue({ testKey: 'testValue' });
    const result = await get('testKey');
    expect(chrome.storage.local.get).toHaveBeenCalledWith('testKey');
    expect(result).toBe('testValue');
  });

  it('(+) set calls chrome.storage.local.set', async () => {
    await set('myKey', { data: 1 });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ myKey: { data: 1 } });
  });

  it('(+) remove calls chrome.storage.local.remove', async () => {
    await remove('myKey');
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('myKey');
  });

  it('(-) get returns null for missing key', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    const result = await get('missing');
    expect(result).toBeNull();
  });

  it('(+) annotationKey produces different keys for different URLs', () => {
    const a = annotationKey('http://localhost:3000/login');
    const b = annotationKey('http://localhost:3000/settings');
    expect(a).not.toBe(b);
  });
});
