/**
 * Archive Module - Unit Tests
 *
 * Tests eligibility checks, file movement, index.json updates,
 * and get_capture fallback to archive directory.
 *
 * @see server/src/archive.js
 * @see docs/ideas/rolling-archive.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { isEligible, archiveCapture, runArchive, readArchiveIndex } from '#src/archive.js';

/** Helper: create a capture JSON with annotations. */
function makeCapture(url, timestamp, annotations = []) {
  return JSON.stringify({
    metadata: { url, timestamp, viewport: { width: 1024, height: 768 }, stats: { totalNodes: 10 } },
    nodes: [{ id: 'n1', tag: 'div' }],
    annotations,
  });
}

describe('archive eligibility', () => {
  const now = new Date('2026-04-26T12:00:00Z');

  it('(+) capture with all annotations resolved and old enough is eligible', () => {
    const capture = {
      metadata: { url: 'http://localhost:3000', timestamp: '2026-04-25T00:00:00Z' },
      annotations: [{ uuid: 'a1', resolved: true }, { uuid: 'a2', resolved: true }],
    };
    expect(isEligible(capture, { now, ageThresholdHours: 24 })).toBe(true);
  });

  it('(-) capture with unresolved annotation is NOT eligible', () => {
    const capture = {
      metadata: { url: 'http://localhost:3000', timestamp: '2026-04-25T00:00:00Z' },
      annotations: [{ uuid: 'a1', resolved: true }, { uuid: 'a2', resolved: false }],
    };
    expect(isEligible(capture, { now, ageThresholdHours: 24 })).toBe(false);
  });

  it('(-) capture younger than age threshold is NOT eligible', () => {
    const capture = {
      metadata: { url: 'http://localhost:3000', timestamp: '2026-04-26T11:00:00Z' },
      annotations: [{ uuid: 'a1', resolved: true }],
    };
    expect(isEligible(capture, { now, ageThresholdHours: 24 })).toBe(false);
  });

  it('(+) capture with zero annotations and old enough is eligible', () => {
    const capture = {
      metadata: { url: 'http://localhost:3000', timestamp: '2026-04-24T00:00:00Z' },
      annotations: [],
    };
    expect(isEligible(capture, { now, ageThresholdHours: 24 })).toBe(true);
  });

  it('(+) capture with no annotations field and old enough is eligible', () => {
    const capture = {
      metadata: { url: 'http://localhost:3000', timestamp: '2026-04-24T00:00:00Z' },
    };
    expect(isEligible(capture, { now, ageThresholdHours: 24 })).toBe(true);
  });
});

describe('archiveCapture', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `vg-archive-${Date.now()}`);
    mkdirSync(path.join(tmpDir, 'captures'), { recursive: true });
  });

  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

  it('(+) moves file to archive/YYYY-MM/ subfolder', async () => {
    const capturesDir = path.join(tmpDir, 'captures');
    const filename = 'viewgraph-localhost-2026-04-08-1206.json';
    writeFileSync(path.join(capturesDir, filename), makeCapture('http://localhost:3000', '2026-04-08T12:06:00Z', [{ uuid: 'a1', resolved: true }]));

    await archiveCapture(capturesDir, filename);

    expect(existsSync(path.join(capturesDir, filename))).toBe(false);
    expect(existsSync(path.join(tmpDir, 'archive', '2026-04', filename))).toBe(true);
  });

  it('(+) updates index.json with capture metadata', async () => {
    const capturesDir = path.join(tmpDir, 'captures');
    const filename = 'viewgraph-localhost-2026-04-08-1206.json';
    writeFileSync(path.join(capturesDir, filename), makeCapture('http://localhost:3000', '2026-04-08T12:06:00Z', [
      { uuid: 'a1', resolved: true, comment: 'Fix heading', resolution: { action: 'fixed', by: 'kiro', summary: 'Done', at: '2026-04-08T12:30:00Z' } },
    ]));

    await archiveCapture(capturesDir, filename);

    const index = readArchiveIndex(path.join(tmpDir, 'archive'));
    expect(index.captures).toHaveLength(1);
    expect(index.captures[0].originalPath).toBe(filename);
    expect(index.captures[0].url).toBe('http://localhost:3000');
    expect(index.captures[0].annotations.total).toBe(1);
    expect(index.captures[0].annotations.resolved).toBe(1);
  });

  it('(+) appends to existing index.json', async () => {
    const capturesDir = path.join(tmpDir, 'captures');
    const archiveDir = path.join(tmpDir, 'archive');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(path.join(archiveDir, 'index.json'), JSON.stringify({
      version: 1, lastUpdated: '2026-04-07T00:00:00Z', captures: [{ originalPath: 'old.json', url: 'http://old' }],
    }));

    const filename = 'viewgraph-localhost-2026-04-08-1206.json';
    writeFileSync(path.join(capturesDir, filename), makeCapture('http://localhost:3000', '2026-04-08T12:06:00Z'));

    await archiveCapture(capturesDir, filename);

    const index = readArchiveIndex(archiveDir);
    expect(index.captures).toHaveLength(2);
  });
});

describe('runArchive', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `vg-archive-run-${Date.now()}`);
    mkdirSync(path.join(tmpDir, 'captures'), { recursive: true });
  });

  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

  it('(+) archives eligible captures and skips ineligible', async () => {
    const capturesDir = path.join(tmpDir, 'captures');
    const now = new Date('2026-04-26T12:00:00Z');

    // Eligible: all resolved, old
    writeFileSync(path.join(capturesDir, 'old-resolved.json'),
      makeCapture('http://localhost:3000', '2026-04-24T00:00:00Z', [{ uuid: 'a1', resolved: true }]));

    // Not eligible: has unresolved
    writeFileSync(path.join(capturesDir, 'has-open.json'),
      makeCapture('http://localhost:3000', '2026-04-24T00:00:00Z', [{ uuid: 'a2', resolved: false }]));

    // Not eligible: too recent
    writeFileSync(path.join(capturesDir, 'recent.json'),
      makeCapture('http://localhost:3000', '2026-04-26T11:00:00Z', [{ uuid: 'a3', resolved: true }]));

    const result = await runArchive(capturesDir, { now, ageThresholdHours: 24, keepLatestPerUrl: 0 });

    expect(result.archived).toBe(1);
    expect(result.skipped).toBe(2);
    expect(existsSync(path.join(capturesDir, 'old-resolved.json'))).toBe(false);
    expect(existsSync(path.join(capturesDir, 'has-open.json'))).toBe(true);
    expect(existsSync(path.join(capturesDir, 'recent.json'))).toBe(true);
  });

  it('(+) keeps latest N captures per URL even if eligible', async () => {
    const capturesDir = path.join(tmpDir, 'captures');
    const now = new Date('2026-04-26T12:00:00Z');

    writeFileSync(path.join(capturesDir, 'older.json'),
      makeCapture('http://localhost:3000', '2026-04-20T00:00:00Z', [{ uuid: 'a1', resolved: true }]));
    writeFileSync(path.join(capturesDir, 'newer.json'),
      makeCapture('http://localhost:3000', '2026-04-22T00:00:00Z', [{ uuid: 'a2', resolved: true }]));

    const result = await runArchive(capturesDir, { now, ageThresholdHours: 24, keepLatestPerUrl: 1 });

    // Should archive older but keep newer (it's the latest for this URL)
    expect(result.archived).toBe(1);
    expect(existsSync(path.join(capturesDir, 'older.json'))).toBe(false);
    expect(existsSync(path.join(capturesDir, 'newer.json'))).toBe(true);
  });
});
