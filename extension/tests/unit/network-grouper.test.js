/**
 * Tests for network request grouping logic.
 * Groups raw network requests into categories for the Inspect tab.
 *
 * @see extension/lib/network-grouper.js
 */

import { describe, it, expect } from 'vitest';
import { groupRequests, smartPath } from '#lib/network-grouper.js';

describe('groupRequests', () => {
  it('(+) groups app sources under "App Sources"', () => {
    const reqs = [
      { method: 'GET', url: '/src/features/items/api.ts', transferSize: 300 },
      { method: 'GET', url: '/src/components/Header.tsx', transferSize: 200 },
    ];
    const groups = groupRequests(reqs);
    const app = groups.find((g) => g.name === 'App Sources');
    expect(app).toBeDefined();
    expect(app.requests).toHaveLength(2);
    expect(app.totalSize).toBe(500);
  });

  it('(+) groups node_modules under "Dependencies"', () => {
    const reqs = [
      { method: 'GET', url: '/node_modules/.vite/deps/chunk-JQUR.js', transferSize: 0 },
      { method: 'GET', url: '/node_modules/leaflet/dist/leaflet.css', transferSize: 3000 },
    ];
    const groups = groupRequests(reqs);
    const deps = groups.find((g) => g.name === 'Dependencies');
    expect(deps).toBeDefined();
    expect(deps.requests).toHaveLength(2);
  });

  it('(+) groups failed requests under "Failed" at top', () => {
    const reqs = [
      { method: 'GET', url: '/api/users', failed: true, transferSize: 0 },
      { method: 'GET', url: '/src/app.ts', transferSize: 100 },
    ];
    const groups = groupRequests(reqs);
    expect(groups[0].name).toBe('Failed');
    expect(groups[0].requests).toHaveLength(1);
  });

  it('(+) groups static assets under "Static"', () => {
    const reqs = [
      { method: 'GET', url: '/favicon.svg', transferSize: 300 },
      { method: 'GET', url: '/assets/logo.png', transferSize: 5000 },
    ];
    const groups = groupRequests(reqs);
    const stat = groups.find((g) => g.name === 'Static');
    expect(stat).toBeDefined();
    expect(stat.requests).toHaveLength(2);
  });

  it('(+) groups API calls under "API"', () => {
    const reqs = [
      { method: 'POST', url: '/api/login', transferSize: 100 },
      { method: 'GET', url: '/graphql', transferSize: 500 },
    ];
    const groups = groupRequests(reqs);
    const api = groups.find((g) => g.name === 'API');
    expect(api).toBeDefined();
    expect(api.requests).toHaveLength(2);
  });

  it('(+) puts unmatched requests in "Other"', () => {
    const reqs = [
      { method: 'GET', url: '/some/random/path.wasm', transferSize: 100 },
    ];
    const groups = groupRequests(reqs);
    const other = groups.find((g) => g.name === 'Other');
    expect(other).toBeDefined();
    expect(other.requests).toHaveLength(1);
  });

  it('(-) returns empty array for no requests', () => {
    expect(groupRequests([])).toEqual([]);
  });

  it('(-) omits empty groups', () => {
    const reqs = [{ method: 'GET', url: '/src/app.ts', transferSize: 100 }];
    const groups = groupRequests(reqs);
    const names = groups.map((g) => g.name);
    expect(names).not.toContain('Failed');
    expect(names).not.toContain('Dependencies');
  });

  it('(+) Failed group is always first when present', () => {
    const reqs = [
      { method: 'GET', url: '/src/app.ts', transferSize: 100 },
      { method: 'GET', url: '/api/data', failed: true, transferSize: 0 },
      { method: 'GET', url: '/node_modules/react/index.js', transferSize: 0 },
    ];
    const groups = groupRequests(reqs);
    expect(groups[0].name).toBe('Failed');
  });
});

describe('smartPath', () => {
  it('(+) extracts filename and parent from app source', () => {
    const result = smartPath('/src/features/finance/MoMComparisonCard.tsx');
    expect(result.filename).toBe('MoMComparisonCard.tsx');
    expect(result.parent).toBe('features/finance');
  });

  it('(+) extracts chunk name from vite deps', () => {
    const result = smartPath('/node_modules/.vite/deps/chunk-JQUR.js');
    expect(result.filename).toBe('chunk-JQUR.js');
    expect(result.parent).toBe('.vite/deps');
  });

  it('(+) handles root-level files', () => {
    const result = smartPath('/favicon.svg');
    expect(result.filename).toBe('favicon.svg');
    expect(result.parent).toBe('');
  });

  it('(+) handles full URLs by stripping origin', () => {
    const result = smartPath('http://localhost:5173/src/app.ts');
    expect(result.filename).toBe('app.ts');
    expect(result.parent).toBe('');
  });

  it('(+) strips query params from filename', () => {
    const result = smartPath('/node_modules/.vite/deps/leaflet.js?v=7abc');
    expect(result.filename).toBe('leaflet.js');
    expect(result.parent).toBe('.vite/deps');
  });

  it('(-) handles empty string', () => {
    const result = smartPath('');
    expect(result.filename).toBe('');
    expect(result.parent).toBe('');
  });
});
