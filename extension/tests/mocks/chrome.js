import { vi } from 'vitest';
import * as _transport from '#lib/transport.js';

/**
 * Shared Chrome Mock
 *
 * Reusable mock for globalThis.chrome used across extension tests.
 * M19: sendMessage routes vg-transport messages through the real transport.js
 * so existing fetch mocks work transparently with transport-client.js.
 *
 * @see extension/tests/setup.js - global test setup
 */

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
      sendMessage: vi.fn(function mockSendMessage(msg, cb) {
        // M19: transport-client routes vg-transport through sendMessage.
        // Delegate to the real transport.js so fetch mocks work transparently.
        if (msg?.type === 'vg-transport') {
          const ops = {
            getInfo: () => _transport.getInfo(), getHealth: () => _transport.getHealth(),
            getCaptures: (a) => _transport.getCaptures(a?.url), getResolved: (a) => _transport.getResolved(a?.pageUrl),
            getPendingRequests: () => _transport.getPendingRequests(), getConfig: () => _transport.getConfig(),
            getBaselines: (a) => _transport.getBaselines(a?.url), compareBaseline: (a) => _transport.compareBaseline(a?.url),
            sendCapture: (a) => _transport.sendCapture(a?.data, a?.headers), sendScreenshot: (a) => _transport.sendScreenshot(a?.data),
            updateConfig: (a) => _transport.updateConfig(a?.data), setBaseline: (a) => _transport.setBaseline(a?.filename),
            ackRequest: (a) => _transport.ackRequest(a?.id), declineRequest: (a) => _transport.declineRequest(a?.id, a?.reason),
          };
          const fn = ops[msg.op];
          if (!fn) { if (cb) cb({ ok: false, error: `Unknown op: ${msg.op}` }); return true; }
          fn(msg.args || {})
            .then((result) => { if (cb) cb({ ok: true, result }); })
            .catch((err) => { if (cb) cb({ ok: false, error: err.message }); });
          return true; // async response
        }
        // M19: discovery.js delegates to SW via vg-get-server
        if (msg?.type === 'vg-get-server') {
          if (cb) cb({ url: 'http://127.0.0.1:9876', agentName: 'Kiro' });
          return false;
        }
        if (cb) cb();
        return false;
      }),
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
      onChanged: { addListener: vi.fn(), removeListener: vi.fn(), ...overrides.storage?.onChanged },
      session: {
        get: vi.fn((key) => Promise.resolve({})),
        set: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
        ...overrides.storage?.session,
      },
      ...overrides.storage,
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([])),
      sendMessage: vi.fn(),
      ...overrides.tabs,
    },
  };
  // Deep merge: overrides.runtime/storage/tabs merge INTO the defaults (not replace)
  if (overrides.runtime) mock.runtime = { ...mock.runtime, ...overrides.runtime };
  if (overrides.storage?.local) mock.storage.local = { ...mock.storage.local, ...overrides.storage.local };
  if (overrides.storage?.onChanged) mock.storage.onChanged = { ...mock.storage.onChanged, ...overrides.storage.onChanged };

  globalThis.chrome = mock;
  return mock;
}
