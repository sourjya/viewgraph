/**
 * Tests for sw/discovery-sw.js - Service Worker Server Discovery
 *
 * Verifies port scanning, URL matching, registry caching in
 * chrome.storage.local, and cold-start restoration.
 *
 * Phase 1 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 5
 * @see extension/lib/sw/discovery-sw.js - implementation under test
 * @see extension/lib/discovery.js - content script version being replaced
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockChrome } from '../../mocks/chrome.js';

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

/** Simulated /info responses keyed by port. */
const serverInfoByPort = {};

beforeEach(() => {
  vi.resetModules();
  Object.keys(serverInfoByPort).forEach((k) => delete serverInfoByPort[k]);

  // Mock chrome.storage.local for registry persistence
  const storage = {};
  mockChrome({
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve(storage[key] !== undefined ? { [key]: storage[key] } : {})),
        set: vi.fn((obj) => { Object.assign(storage, obj); return Promise.resolve(); }),
      },
    },
  });

  // Mock fetch for port scanning - responds based on serverInfoByPort
  globalThis.fetch = vi.fn((url) => {
    const match = url.match(/:(\d+)\/info/);
    if (match && serverInfoByPort[match[1]]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(serverInfoByPort[match[1]]),
      });
    }
    return Promise.reject(new Error('Connection refused'));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Register a fake server on a port. */
function addServer(port, info) {
  serverInfoByPort[port] = {
    capturesDir: `/project/.viewgraph/captures`,
    projectRoot: '/project',
    urlPatterns: [],
    agent: 'Kiro',
    ...info,
  };
}

// ──────────────────────────────────────────────
// Port Scanning
// ──────────────────────────────────────────────

describe('port scanning', () => {
  it('(+) discovers server on port 9876', async () => {
    addServer('9876', { urlPatterns: ['localhost:3000'] });
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('http://localhost:3000');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) discovers server on non-default port', async () => {
    addServer('9878', { urlPatterns: ['localhost:5173'] });
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('http://localhost:5173');
    expect(url).toBe('http://127.0.0.1:9878');
  });

  it('(+) returns all servers from getAllServers', async () => {
    addServer('9876', { projectRoot: '/a' });
    addServer('9877', { projectRoot: '/b' });
    const { getAllServers } = await import('#lib/sw/discovery-sw.js');
    const servers = await getAllServers();
    expect(servers).toHaveLength(2);
  });

  it('(-) returns null when no servers found', async () => {
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('http://localhost:3000');
    expect(url).toBeNull();
  });

  it('(-) handles fetch timeout gracefully', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('timeout')));
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('http://localhost:3000');
    expect(url).toBeNull();
  });
});

// ──────────────────────────────────────────────
// URL Matching
// ──────────────────────────────────────────────

describe('URL matching', () => {
  it('(+) matches page URL against urlPatterns', async () => {
    addServer('9876', { urlPatterns: ['localhost:5176'] });
    addServer('9877', { urlPatterns: ['localhost:3000'] });
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('http://localhost:3000/app');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(+) auto-matches single server for localhost URLs', async () => {
    addServer('9876', { urlPatterns: [] });
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('http://localhost:8080');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) matches file:// URLs against projectRoot', async () => {
    addServer('9876', { projectRoot: '/home/user/project' });
    const { discover } = await import('#lib/sw/discovery-sw.js');
    const url = await discover('file:///home/user/project/index.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });
});

// ──────────────────────────────────────────────
// Registry Persistence
// ──────────────────────────────────────────────

describe('registry persistence', () => {
  it('(+) caches registry in chrome.storage.local', async () => {
    addServer('9876', { urlPatterns: ['localhost:3000'] });
    const { discover } = await import('#lib/sw/discovery-sw.js');
    await discover('http://localhost:3000');
    expect(globalThis.chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'vg-server-registry': expect.any(Array) }),
    );
  });

  it('(+) restores registry from storage on cold start', async () => {
    // Pre-populate storage with a cached registry
    const cached = [{
      url: 'http://127.0.0.1:9876',
      projectRoot: '/project',
      urlPatterns: ['localhost:3000'],
      agent: 'Kiro',
      capturesDir: '/project/.viewgraph/captures',
      cachedAt: Date.now(),
    }];
    globalThis.chrome.storage.local.get = vi.fn((key) =>
      Promise.resolve(key === 'vg-server-registry' ? { 'vg-server-registry': cached } : {}),
    );
    // No servers responding (cold start, network not ready yet)
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));

    const { restoreRegistry, getAllServers } = await import('#lib/sw/discovery-sw.js');
    await restoreRegistry();
    const servers = await getAllServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].url).toBe('http://127.0.0.1:9876');
  });
});

// ──────────────────────────────────────────────
// Accessors
// ──────────────────────────────────────────────

describe('accessors', () => {
  it('(+) getServerUrl returns matched server URL', async () => {
    addServer('9876', { urlPatterns: ['localhost:3000'] });
    const { discover, getServerUrl } = await import('#lib/sw/discovery-sw.js');
    await discover('http://localhost:3000');
    expect(getServerUrl()).toBe('http://127.0.0.1:9876');
  });

  it('(+) getAgentName returns agent from server info', async () => {
    addServer('9876', { urlPatterns: ['localhost:3000'], agent: 'Claude' });
    const { discover, getAgentName } = await import('#lib/sw/discovery-sw.js');
    await discover('http://localhost:3000');
    expect(getAgentName()).toBe('Claude');
  });

  it('(+) getAgentName defaults to Agent', async () => {
    const { getAgentName } = await import('#lib/sw/discovery-sw.js');
    expect(getAgentName()).toBe('Agent');
  });
});
