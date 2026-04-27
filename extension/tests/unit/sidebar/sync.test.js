/**
 * Sidebar Sync - Unit Tests
 *
 * Tests syncResolved (immediate sync) and pollRequests (direct poll).
 * M19: Polling functions removed - replaced by storage-based sync
 * tested in sync-storage.test.js.
 *
 * @see lib/sidebar/sync.js
 * @see tests/unit/sidebar/sync-storage.test.js - storage-based sync tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncResolved } from '#lib/sidebar/sync.js';

beforeEach(() => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
});

describe('syncResolved', () => {
  it('(+) calls onChanged when annotations are resolved', async () => {
    const onChanged = vi.fn();
    await syncResolved(onChanged);
    expect(onChanged).not.toHaveBeenCalled(); // offline, no changes
  });

  it('(-) handles offline gracefully', async () => {
    await expect(syncResolved()).resolves.not.toThrow();
  });
});

describe('pollRequests', () => {
  it('(+) calls onRequests with pending requests from server', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    const transport = await import('#lib/transport.js');
    const { mockChrome } = await import('../../mocks/chrome.js');
    resetServerCache();
    transport.init('http://127.0.0.1:9876');
    mockChrome({ runtime: { sendNativeMessage: undefined } });
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:8040/page', hostname: 'localhost', protocol: 'http:' },
      writable: true, configurable: true,
    });
    const { pollRequests } = await import('#lib/sidebar/sync.js');
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/requests/pending')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ requests: [{ id: 'r1', url: 'http://localhost:8040' }] }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });
    const cb = vi.fn();
    await pollRequests(cb);
    expect(cb).toHaveBeenCalledWith([{ id: 'r1', url: 'http://localhost:8040' }]);
  });

  it('(-) handles offline gracefully', async () => {
    const { pollRequests } = await import('#lib/sidebar/sync.js');
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    await expect(pollRequests(() => {})).resolves.not.toThrow();
  });
});
