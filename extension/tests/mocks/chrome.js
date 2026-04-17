/**
 * Shared Chrome Mock
 *
 * Reusable mock for globalThis.chrome used across extension tests.
 * Covers runtime, storage.local, storage.sync, and tabs APIs.
 *
 * Usage:
 *   import { mockChrome } from '../../mocks/chrome.js';
 *   beforeEach(() => { mockChrome(); });
 *
 * @see extension/tests/setup.js - global test setup
 */

import { vi } from 'vitest';

/**
 * Install a standard chrome mock on globalThis.
 * Returns the mock object for direct assertions.
 *
 * @param {Object} [overrides] - Partial overrides merged into the mock
 * @returns {Object} The installed chrome mock
 */
export function mockChrome(overrides = {}) {
  const mock = {
    runtime: {
      getURL: (path) => path,
      getManifest: () => ({ version: '0.3.7' }),
      sendMessage: vi.fn((msg, cb) => { if (cb) cb(); }),
      sendNativeMessage: undefined,
      ...overrides.runtime,
    },
    storage: {
      local: {
        get: vi.fn((key, cb) => { if (cb) cb({}); return Promise.resolve({}); }),
        set: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
        ...overrides.storage?.local,
      },
      sync: {
        get: vi.fn((key, cb) => { if (cb) cb({}); }),
        set: vi.fn(),
        ...overrides.storage?.sync,
      },
      ...overrides.storage,
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([])),
      sendMessage: vi.fn(),
      ...overrides.tabs,
    },
    ...overrides,
  };
  // Preserve nested merges
  if (overrides.runtime) mock.runtime = { ...mock.runtime, ...overrides.runtime };
  if (overrides.storage?.local) mock.storage.local = { ...mock.storage.local, ...overrides.storage.local };

  globalThis.chrome = mock;
  return mock;
}
