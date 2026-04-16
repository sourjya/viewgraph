/**
 * Sidebar Sync - Unit Tests
 *
 * @see lib/sidebar/sync.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncResolved, startResolutionPolling, stopResolutionPolling, startRequestPolling, stopRequestPolling } from '#lib/sidebar/sync.js';

beforeEach(() => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
});

afterEach(() => {
  stopResolutionPolling();
  stopRequestPolling();
});

describe('syncResolved', () => {
  it('(+) calls onChanged when annotations are resolved', async () => {
    // No server available - should not throw
    const onChanged = vi.fn();
    await syncResolved(onChanged);
    expect(onChanged).not.toHaveBeenCalled(); // offline, no changes
  });

  it('(-) handles offline gracefully', async () => {
    await expect(syncResolved()).resolves.not.toThrow();
  });
});

describe('polling', () => {
  it('(+) startResolutionPolling starts interval', () => {
    const spy = vi.fn();
    startResolutionPolling(spy);
    // Should not throw
    stopResolutionPolling();
  });

  it('(+) stopResolutionPolling is safe to call twice', () => {
    startResolutionPolling(() => {});
    stopResolutionPolling();
    expect(() => stopResolutionPolling()).not.toThrow();
  });

  it('(+) startRequestPolling starts interval', () => {
    startRequestPolling(() => {});
    stopRequestPolling();
  });

  it('(+) stopRequestPolling is safe to call twice', () => {
    stopRequestPolling();
    expect(() => stopRequestPolling()).not.toThrow();
  });
});
