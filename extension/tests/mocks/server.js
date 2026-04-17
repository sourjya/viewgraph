/**
 * Shared Server Mock
 *
 * Reusable fetch mock for ViewGraph server endpoints.
 * Configurable responses for /info, /health, /config, /captures.
 *
 * Usage:
 *   import { mockServer } from '../../mocks/server.js';
 *   beforeEach(() => { mockServer(); });
 *   // or with overrides:
 *   mockServer({ info: { agent: 'Cursor', projectRoot: '/app' } });
 *
 * @see lib/discovery.js - discoverServer calls /info
 * @see lib/transport.js - all server communication
 */

import { vi } from 'vitest';

/** Default server info response. */
const DEFAULT_INFO = {
  serverVersion: '0.3.7',
  projectRoot: '/home/user/project',
  capturesDir: '/home/user/project/.viewgraph/captures',
  urlPatterns: ['localhost:3000'],
  agent: 'Kiro',
  trustedPatterns: [],
};

/** Default health response. */
const DEFAULT_HEALTH = { status: 'ok' };

/** Default config response. */
const DEFAULT_CONFIG = { autoAudit: false, smartSuggestions: true };

/**
 * Install a fetch mock that responds to ViewGraph server endpoints.
 *
 * @param {Object} [opts]
 * @param {Object} [opts.info] - Override /info response fields
 * @param {Object} [opts.health] - Override /health response fields
 * @param {Object} [opts.config] - Override /config response fields
 * @param {boolean} [opts.offline] - If true, all requests reject
 * @returns {Function} The installed vi.fn() fetch mock
 */
export function mockServer(opts = {}) {
  const info = { ...DEFAULT_INFO, ...opts.info };
  const health = { ...DEFAULT_HEALTH, ...opts.health };
  const config = { ...DEFAULT_CONFIG, ...opts.config };

  const mock = vi.fn((url) => {
    const u = typeof url === 'string' ? url : url.toString();

    if (opts.offline) return Promise.reject(new Error('offline'));

    if (u.includes('/info')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(info) });
    }
    if (u.includes('/health')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(health) });
    }
    if (u.includes('/config')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(config) });
    }
    if (u.includes('/captures')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }

    return Promise.reject(new Error(`unmocked URL: ${u}`));
  });

  globalThis.fetch = mock;
  return mock;
}
