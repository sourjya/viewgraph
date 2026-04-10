/**
 * Baseline Storage Tests
 *
 * Tests for the baseline storage module that manages golden captures
 * in .viewgraph/baselines/ for structural regression detection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  normalizeUrlToKey,
  baselinesDir,
  setBaseline,
  getBaseline,
  listBaselines,
} from '#src/baselines.js';

let tmpDir;
let capturesDir;

/** Create a minimal capture file in the captures directory. */
async function writeCapture(filename, url, nodeCount = 5) {
  const capture = {
    METADATA: { url, timestamp: new Date().toISOString() },
    SUMMARY: { totalElements: nodeCount },
    NODES: Array.from({ length: nodeCount }, (_, i) => ({ id: `n${i}`, tag: 'div' })),
  };
  await fs.writeFile(path.join(capturesDir, filename), JSON.stringify(capture), 'utf-8');
  return capture;
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vg-baselines-'));
  capturesDir = path.join(tmpDir, 'captures');
  await fs.mkdir(capturesDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// normalizeUrlToKey
// ---------------------------------------------------------------------------

describe('normalizeUrlToKey', () => {
  it('(+) strips protocol and normalizes path', () => {
    expect(normalizeUrlToKey('http://localhost:3000/login')).toBe('localhost-3000--login');
  });

  it('(+) strips query params and hash', () => {
    expect(normalizeUrlToKey('http://localhost:3000/login?foo=1#bar')).toBe('localhost-3000--login');
  });

  it('(+) handles root path as index', () => {
    expect(normalizeUrlToKey('http://localhost:3000/')).toBe('localhost-3000--index');
  });

  it('(+) handles nested paths', () => {
    expect(normalizeUrlToKey('http://localhost:3000/app/settings/profile')).toBe('localhost-3000--app-settings-profile');
  });

  it('(-) handles malformed URL gracefully', () => {
    const key = normalizeUrlToKey('not-a-url');
    expect(key).toBeTruthy();
    expect(key.length).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// baselinesDir
// ---------------------------------------------------------------------------

describe('baselinesDir', () => {
  it('(+) resolves baselines sibling to captures', () => {
    expect(baselinesDir('/project/.viewgraph/captures')).toBe('/project/.viewgraph/baselines');
  });
});

// ---------------------------------------------------------------------------
// setBaseline + getBaseline
// ---------------------------------------------------------------------------

describe('setBaseline and getBaseline', () => {
  it('(+) saves and retrieves a baseline', async () => {
    await writeCapture('cap1.json', 'http://localhost:3000/login', 10);
    const result = await setBaseline(capturesDir, 'cap1.json');
    expect(result.ok).toBe(true);
    expect(result.url).toBe('http://localhost:3000/login');
    expect(result.baselineKey).toBe('localhost-3000--login');

    const baseline = await getBaseline(capturesDir, 'http://localhost:3000/login');
    expect(baseline).toBeTruthy();
    expect(baseline.SUMMARY.totalElements).toBe(10);
  });

  it('(+) overwrites existing baseline for same URL', async () => {
    await writeCapture('cap1.json', 'http://localhost:3000/login', 10);
    await writeCapture('cap2.json', 'http://localhost:3000/login', 15);
    await setBaseline(capturesDir, 'cap1.json');
    await setBaseline(capturesDir, 'cap2.json');

    const baseline = await getBaseline(capturesDir, 'http://localhost:3000/login');
    expect(baseline.SUMMARY.totalElements).toBe(15);
  });

  it('(-) returns null for URL with no baseline', async () => {
    const baseline = await getBaseline(capturesDir, 'http://localhost:3000/unknown');
    expect(baseline).toBeNull();
  });

  it('(-) throws for capture without URL', async () => {
    const noUrl = { METADATA: {}, NODES: [] };
    await fs.writeFile(path.join(capturesDir, 'bad.json'), JSON.stringify(noUrl));
    await expect(setBaseline(capturesDir, 'bad.json')).rejects.toThrow('no URL');
  });
});

// ---------------------------------------------------------------------------
// listBaselines
// ---------------------------------------------------------------------------

describe('listBaselines', () => {
  it('(+) lists all baselines', async () => {
    await writeCapture('cap1.json', 'http://localhost:3000/login', 10);
    await writeCapture('cap2.json', 'http://localhost:3000/dashboard', 20);
    await setBaseline(capturesDir, 'cap1.json');
    await setBaseline(capturesDir, 'cap2.json');

    const list = await listBaselines(capturesDir);
    expect(list.length).toBe(2);
    expect(list.map((b) => b.url).sort()).toEqual([
      'http://localhost:3000/dashboard',
      'http://localhost:3000/login',
    ]);
  });

  it('(+) filters by URL substring', async () => {
    await writeCapture('cap1.json', 'http://localhost:3000/login', 10);
    await writeCapture('cap2.json', 'http://localhost:3000/dashboard', 20);
    await setBaseline(capturesDir, 'cap1.json');
    await setBaseline(capturesDir, 'cap2.json');

    const list = await listBaselines(capturesDir, 'login');
    expect(list.length).toBe(1);
    expect(list[0].url).toBe('http://localhost:3000/login');
  });

  it('(+) returns empty array when no baselines dir', async () => {
    const list = await listBaselines(capturesDir);
    expect(list).toEqual([]);
  });
});
