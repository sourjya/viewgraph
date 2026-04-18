/**
 * Multi-Project Server Routing - Unit Tests
 *
 * Tests the server registry and URL-based routing in constants.js.
 * Mocks fetch() to simulate multiple ViewGraph servers on different ports,
 * each with different projectRoot and urlPatterns.
 *
 * Covers BUG-009: multi-project routing broken.
 *
 * @see lib/constants.js - discoverServer(), refreshRegistry()
 * @see docs/bugs/BUG-009-multi-project-routing.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { discoverServer, getAllServers, resetServerCache } from '#lib/constants.js';
import { mockChrome } from '../mocks/chrome.js';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

/** Simulated server responses keyed by port. */
let serversByPort = {};

beforeEach(() => {
  resetServerCache();
  serversByPort = {};

  // Mock chrome.storage for token fetch
  mockChrome();

  // Mock fetch to return server info based on port
  globalThis.fetch = vi.fn((url, _opts) => {
    const portMatch = url.match(/:(\d+)\//);
    if (!portMatch) return Promise.reject(new Error('bad url'));
    const port = portMatch[1];
    const server = serversByPort[port];
    if (!server) return Promise.reject(new Error('ECONNREFUSED'));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(server),
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register a fake server on a port. */
function addServer(port, projectRoot, urlPatterns = []) {
  serversByPort[String(port)] = {
    capturesDir: `${projectRoot}/.viewgraph/captures`,
    projectRoot,
    urlPatterns,
    agent: 'Kiro',
  };
}

// ---------------------------------------------------------------------------
// Single server (baseline)
// ---------------------------------------------------------------------------

describe('single server', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app-one');
  });

  it('(+) discovers the server for localhost URL', async () => {
    const url = await discoverServer('http://localhost:3000');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) returns server for any page URL when only one server', async () => {
    const url = await discoverServer('http://localhost:9999/anything');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) getAllServers returns one entry', async () => {
    const servers = await getAllServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].projectRoot).toBe('/home/user/app-one');
  });
});

// ---------------------------------------------------------------------------
// Two servers - file:// URL routing
// ---------------------------------------------------------------------------

describe('BUG-014: remote URLs must not route to local servers', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app-one');
  });

  it('(-) remote website returns null with single server', async () => {
    const url = await discoverServer('https://mybakestory.com/');
    expect(url).toBeNull();
  });

  it('(-) remote HTTPS returns null', async () => {
    const url = await discoverServer('https://example.com/page');
    expect(url).toBeNull();
  });

  it('(-) remote HTTP returns null', async () => {
    const url = await discoverServer('http://production.myapp.com/dashboard');
    expect(url).toBeNull();
  });

  it('(+) localhost still matches single server', async () => {
    const url = await discoverServer('http://localhost:3000/page');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) 127.0.0.1 still matches single server', async () => {
    const url = await discoverServer('http://127.0.0.1:8080/api');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) file:// still matches single server', async () => {
    const url = await discoverServer('file:///home/user/app-one/index.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) remote URL matches when configured as urlPattern', async () => {
    addServer(9877, '/home/user/staging', ['staging.myapp.com']);
    const url = await discoverServer('https://staging.myapp.com/login');
    expect(url).toBe('http://127.0.0.1:9877');
  });
});

describe('file:// URL routing with two servers', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app-one');
    addServer(9877, '/home/user/app-two');
  });

  it('(+) routes file URL to correct server by projectRoot', async () => {
    const url1 = await discoverServer('file:///home/user/app-one/index.html');
    expect(url1).toBe('http://127.0.0.1:9876');

    resetServerCache();
    const url2 = await discoverServer('file:///home/user/app-two/dashboard.html');
    expect(url2).toBe('http://127.0.0.1:9877');
  });

  it('(+) routes nested file paths correctly', async () => {
    const url = await discoverServer('file:///home/user/app-one/src/pages/login.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) longest prefix wins when paths overlap', async () => {
    resetServerCache();
    serversByPort = {};
    addServer(9876, '/home/user/projects');
    addServer(9877, '/home/user/projects/frontend');

    const url = await discoverServer('file:///home/user/projects/frontend/index.html');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(-) unmatched file path returns null with multiple servers', async () => {
    const url = await discoverServer('file:///home/user/other-project/index.html');
    expect(url).toBeNull();
  });

  it('(edge) URL-encoded file path still matches', async () => {
    const url = await discoverServer('file:///home/user/app-one/my%20page.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });
});

// ---------------------------------------------------------------------------
// Two servers - localhost URL routing via urlPatterns
// ---------------------------------------------------------------------------

describe('localhost URL routing with urlPatterns', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app-one', ['localhost:3000']);
    addServer(9877, '/home/user/app-two', ['localhost:3001']);
  });

  it('(+) routes localhost:3000 to app-one', async () => {
    const url = await discoverServer('http://localhost:3000/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) routes localhost:3001 to app-two', async () => {
    const url = await discoverServer('http://localhost:3001/dashboard');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(-) unmatched localhost port returns null with multiple servers', async () => {
    const url = await discoverServer('http://localhost:9999/unknown');
    expect(url).toBeNull();
  });

  it('(+) pattern matches anywhere in URL', async () => {
    const url = await discoverServer('http://localhost:3000/api/v1/users?page=2');
    expect(url).toBe('http://127.0.0.1:9876');
  });
});

// ---------------------------------------------------------------------------
// Two servers - remote URL routing via urlPatterns
// ---------------------------------------------------------------------------

describe('remote URL routing with urlPatterns', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/frontend', ['app.mysite.com']);
    addServer(9877, '/home/user/admin', ['admin.mysite.com']);
  });

  it('(+) routes remote URL to correct server', async () => {
    const url1 = await discoverServer('https://app.mysite.com/dashboard');
    expect(url1).toBe('http://127.0.0.1:9876');

    resetServerCache();
    const url2 = await discoverServer('https://admin.mysite.com/users');
    expect(url2).toBe('http://127.0.0.1:9877');
  });

  it('(edge) subdomain matches broader pattern when scanned first', async () => {
    resetServerCache();
    serversByPort = {};
    addServer(9876, '/home/user/frontend', ['mysite.com']);
    addServer(9877, '/home/user/staging', ['staging.mysite.com']);

    // "staging.mysite.com" contains "mysite.com" so port 9876 matches first.
    // Use more specific patterns to avoid ambiguity (e.g., "app.mysite.com"
    // instead of bare "mysite.com").
    const url = await discoverServer('https://staging.mysite.com/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(-) unmatched remote URL returns null', async () => {
    const url = await discoverServer('https://other-site.com/page');
    expect(url).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mixed modes
// ---------------------------------------------------------------------------

describe('mixed file + localhost + remote', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app-one', ['localhost:3000', 'staging.app.com']);
    addServer(9877, '/home/user/app-two', ['localhost:3001']);
  });

  it('(+) file URL uses projectRoot, ignores urlPatterns', async () => {
    const url = await discoverServer('file:///home/user/app-two/index.html');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(+) localhost uses urlPatterns, ignores projectRoot', async () => {
    const url = await discoverServer('http://localhost:3000/page');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) remote uses urlPatterns', async () => {
    const url = await discoverServer('https://staging.app.com/dashboard');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) multiple patterns on same server all work', async () => {
    const url1 = await discoverServer('http://localhost:3000/a');
    const url2 = await discoverServer('https://staging.app.com/b');
    expect(url1).toBe('http://127.0.0.1:9876');
    expect(url2).toBe('http://127.0.0.1:9876');
  });
});

// ---------------------------------------------------------------------------
// Explicit targetDir override
// ---------------------------------------------------------------------------

describe('targetDir override', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app-one');
    addServer(9877, '/home/user/app-two');
  });

  it('(+) targetDir matches capturesDir exactly', async () => {
    const url = await discoverServer(null, '/home/user/app-two/.viewgraph/captures');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(-) wrong targetDir returns null', async () => {
    const url = await discoverServer(null, '/nonexistent/.viewgraph/captures');
    expect(url).toBeNull();
  });
});

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fix 1: 127.0.0.1 / 0.0.0.0 / [::1] normalized to localhost
// ---------------------------------------------------------------------------

describe('localhost normalization', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app', ['localhost:3000']);
  });

  it('(+) 127.0.0.1:3000 matches localhost:3000 pattern', async () => {
    const url = await discoverServer('http://127.0.0.1:3000/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) 0.0.0.0:3000 matches localhost:3000 pattern', async () => {
    const url = await discoverServer('http://0.0.0.0:3000/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) [::1]:3000 (IPv6 loopback) matches localhost:3000 pattern', async () => {
    const url = await discoverServer('http://[::1]:3000/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) https://127.0.0.1:3000 also normalizes', async () => {
    const url = await discoverServer('https://127.0.0.1:3000/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });
});

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// WSL file:// URL handling
// ---------------------------------------------------------------------------

describe('WSL file URL routing', () => {
  beforeEach(() => {
    addServer(9876, '/home/sourjya/demos/app-one');
    addServer(9877, '/home/sourjya/demos/app-two');
  });

  it('(+) wsl.localhost URL routes to correct server', async () => {
    const url = await discoverServer('file://wsl.localhost/Ubuntu/home/sourjya/demos/app-one/index.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) wsl.localhost URL routes app-two correctly', async () => {
    const url = await discoverServer('file://wsl.localhost/Ubuntu/home/sourjya/demos/app-two/index.html');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(+) wsl$ URL format also works', async () => {
    const url = await discoverServer('file://wsl$/Ubuntu/home/sourjya/demos/app-one/index.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) different distro name still works', async () => {
    const url = await discoverServer('file://wsl.localhost/Debian/home/sourjya/demos/app-two/index.html');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(+) nested WSL path matches', async () => {
    const url = await discoverServer('file://wsl.localhost/Ubuntu/home/sourjya/demos/app-one/src/pages/login.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) Firefox WSL format with 5 slashes', async () => {
    const url = await discoverServer('file://///wsl.localhost/Ubuntu/home/sourjya/demos/app-one/dashboard.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) Firefox WSL routes app-two correctly', async () => {
    const url = await discoverServer('file://///wsl.localhost/Ubuntu/home/sourjya/demos/app-two/index.html');
    expect(url).toBe('http://127.0.0.1:9877');
  });
});

// Fix 2: Windows file paths (backslash normalization)
// ---------------------------------------------------------------------------

describe('Windows file path normalization', () => {
  beforeEach(() => {
    resetServerCache();
    serversByPort = {};
    // Simulate a Windows server with backslash projectRoot
    serversByPort['9876'] = {
      capturesDir: 'C:\\Users\\dev\\myapp\\.viewgraph\\captures',
      projectRoot: 'C:\\Users\\dev\\myapp',
      urlPatterns: [],
      agent: 'Kiro',
    };
  });

  it('(+) file:// URL with forward slashes matches backslash projectRoot', async () => {
    const url = await discoverServer('file:///C:/Users/dev/myapp/index.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) nested path matches', async () => {
    const url = await discoverServer('file:///C:/Users/dev/myapp/src/pages/login.html');
    expect(url).toBe('http://127.0.0.1:9876');
  });
});

// ---------------------------------------------------------------------------
// Fix 3: Port-only fallback matching
// ---------------------------------------------------------------------------

describe('port-only fallback matching', () => {
  beforeEach(() => {
    addServer(9876, '/home/user/app', ['localhost:3000']);
  });

  it('(+) custom hostname on same port matches via port fallback', async () => {
    const url = await discoverServer('http://myapp.local:3000/login');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) lvh.me on same port matches', async () => {
    const url = await discoverServer('http://app.lvh.me:3000/dashboard');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) Docker host.docker.internal on same port matches', async () => {
    const url = await discoverServer('http://host.docker.internal:3000/');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(-) different port does NOT match via port fallback', async () => {
    resetServerCache();
    serversByPort = {};
    addServer(9876, '/home/user/app-one', ['localhost:3000']);
    addServer(9877, '/home/user/app-two', ['localhost:3001']);

    const url = await discoverServer('http://myapp.local:3001/login');
    expect(url).toBe('http://127.0.0.1:9877');
  });

  it('(-) remote URL without port does not trigger port fallback', async () => {
    resetServerCache();
    serversByPort = {};
    addServer(9876, '/home/user/app', ['localhost:3000']);
    addServer(9877, '/home/user/other', ['staging.myapp.com']);

    // https://staging.myapp.com has no explicit port (443 implicit)
    // Should match by pattern, not port fallback
    const url = await discoverServer('https://staging.myapp.com/login');
    expect(url).toBe('http://127.0.0.1:9877');
  });
});

// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('(-) no servers running returns null', async () => {
    const url = await discoverServer('file:///home/user/app/index.html');
    expect(url).toBeNull();
  });

  it('(edge) null pageUrl with servers returns null', async () => {
    addServer(9876, '/home/user/app-one');
    const url = await discoverServer(null);
    expect(url).toBeNull();
  });

  it('(edge) empty string pageUrl returns null', async () => {
    addServer(9876, '/home/user/app-one');
    const url = await discoverServer('');
    expect(url).toBeNull();
  });

  it('(edge) server with no projectRoot still works', async () => {
    serversByPort['9876'] = { capturesDir: '/tmp/captures', projectRoot: null, urlPatterns: ['localhost:5000'], agent: null };
    const url = await discoverServer('http://localhost:5000/page');
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(edge) server with empty urlPatterns array', async () => {
    addServer(9876, '/home/user/app', []);
    const url = await discoverServer('http://localhost:3000/page');
    // Single server + localhost URL = auto-match
    expect(url).toBe('http://127.0.0.1:9876');
  });

  it('(+) registry caches and reuses', async () => {
    addServer(9876, '/home/user/app');
    await discoverServer('file:///home/user/app/index.html');
    const callCount = fetch.mock.calls.length;

    // Second call should use cache, not re-fetch
    await discoverServer('file:///home/user/app/other.html');
    expect(fetch.mock.calls.length).toBe(callCount);
  });

  it('(+) resetServerCache clears the cache', async () => {
    addServer(9876, '/home/user/app');
    await discoverServer();
    const callCount = fetch.mock.calls.length;

    resetServerCache();
    await discoverServer();
    expect(fetch.mock.calls.length).toBeGreaterThan(callCount);
  });
});
