/**
 * Tests for storage-based sync in sidebar/sync.js
 *
 * Verifies that the sidebar reads resolved annotations and pending
 * requests from chrome.storage.local instead of polling the server.
 *
 * Phase 3 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 14
 * @see extension/lib/sidebar/sync.js - implementation under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockChrome } from '../../mocks/chrome.js';

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

let storageData = {};
let storageListeners = [];

beforeEach(() => {
  vi.resetModules();
  storageData = {};
  storageListeners = [];
  mockChrome({
    storage: {
      local: {
        get: vi.fn((key) => {
          if (typeof key === 'string') {
            return Promise.resolve(storageData[key] !== undefined ? { [key]: storageData[key] } : {});
          }
          return Promise.resolve({});
        }),
        set: vi.fn((obj) => { Object.assign(storageData, obj); return Promise.resolve(); }),
      },
      onChanged: {
        addListener: vi.fn((fn) => { storageListeners.push(fn); }),
        removeListener: vi.fn((fn) => { storageListeners = storageListeners.filter((l) => l !== fn); }),
      },
    },
  });
  // Mock location for URL-keyed storage
  Object.defineProperty(globalThis, 'location', {
    value: { href: 'http://localhost:3000/app' }, writable: true, configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Simulate a chrome.storage.onChanged event. */
function fireStorageChange(changes) {
  for (const fn of storageListeners) fn(changes, 'local');
}

// ──────────────────────────────────────────────
// syncFromStorage
// ──────────────────────────────────────────────

describe('syncFromStorage', () => {
  it('(+) reads resolved annotations from storage on init', async () => {
    storageData['vg-resolved-http://localhost:3000/app'] = [
      { uuid: 'a1', resolution: { action: 'fixed', by: 'kiro' } },
    ];
    const { syncFromStorage } = await import('#lib/sidebar/sync.js');
    const onChanged = vi.fn();
    await syncFromStorage(onChanged);
    // Should have called onChanged with the resolved data
    expect(onChanged).toHaveBeenCalled();
  });

  it('(+) onChanged listener fires on real-time storage updates', async () => {
    const { syncFromStorage } = await import('#lib/sidebar/sync.js');
    const onChanged = vi.fn();
    await syncFromStorage(onChanged);
    // Simulate WS event arriving via storage
    fireStorageChange({
      'vg-ws-events': {
        newValue: [{ type: 'annotation:resolved', uuid: 'b2', resolution: { action: 'fixed' } }],
      },
    });
    // The onChanged callback should fire for annotation events
    expect(onChanged).toHaveBeenCalled();
  });

  it('(+) reads pending requests from storage on init', async () => {
    storageData['vg-pending-requests'] = [
      { id: 'req-1', url: 'http://localhost:3000', purpose: 'capture' },
    ];
    const { syncFromStorage } = await import('#lib/sidebar/sync.js');
    const onChanged = vi.fn();
    const onRequests = vi.fn();
    await syncFromStorage(onChanged, onRequests);
    expect(onRequests).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'req-1' }),
    ]);
  });

  it('(-) handles missing storage keys gracefully', async () => {
    const { syncFromStorage } = await import('#lib/sidebar/sync.js');
    const onChanged = vi.fn();
    const onRequests = vi.fn();
    await syncFromStorage(onChanged, onRequests);
    // Should not throw, callbacks called with empty data
    expect(onRequests).toHaveBeenCalledWith([]);
  });
});

// ──────────────────────────────────────────────
// stopSync
// ──────────────────────────────────────────────

describe('stopSync', () => {
  it('(+) removes storage listener', async () => {
    const { syncFromStorage, stopSync } = await import('#lib/sidebar/sync.js');
    await syncFromStorage(vi.fn());
    stopSync();
    expect(globalThis.chrome.storage.onChanged.removeListener).toHaveBeenCalled();
  });
});
