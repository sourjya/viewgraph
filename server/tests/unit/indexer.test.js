/**
 * Tests for the in-memory capture indexer.
 * Covers add, remove, get, list (with limit/filter/sort), getLatest, and eviction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createIndexer } from '#src/indexer.js';

// Helper  -  build a metadata entry
function meta(filename, url, timestamp, nodeCount = 10) {
  return { filename, url, title: `Page: ${url}`, timestamp, viewport: { width: 1696, height: 799 }, nodeCount, captureMode: 'sifr-capture', hasAnnotations: false };
}

describe('indexer', () => {
  let indexer;

  beforeEach(() => {
    indexer = createIndexer({ maxCaptures: 5 });
  });

  it('adds and retrieves a capture', () => {
    indexer.add('a.json', meta('a.json', 'http://localhost/a', '2026-04-08T01:00:00Z'));
    expect(indexer.get('a.json')).toBeDefined();
    expect(indexer.get('a.json').url).toBe('http://localhost/a');
  });

  it('removes a capture', () => {
    indexer.add('a.json', meta('a.json', 'http://localhost/a', '2026-04-08T01:00:00Z'));
    indexer.remove('a.json');
    expect(indexer.get('a.json')).toBeUndefined();
  });

  it('returns undefined for unknown filename', () => {
    expect(indexer.get('nope.json')).toBeUndefined();
  });

  it('lists captures sorted by timestamp descending', () => {
    indexer.add('old.json', meta('old.json', 'http://localhost/old', '2026-04-01T00:00:00Z'));
    indexer.add('new.json', meta('new.json', 'http://localhost/new', '2026-04-08T00:00:00Z'));
    indexer.add('mid.json', meta('mid.json', 'http://localhost/mid', '2026-04-05T00:00:00Z'));

    const list = indexer.list({});
    expect(list[0].filename).toBe('new.json');
    expect(list[1].filename).toBe('mid.json');
    expect(list[2].filename).toBe('old.json');
  });

  it('respects limit parameter', () => {
    indexer.add('a.json', meta('a.json', 'http://a', '2026-04-01T00:00:00Z'));
    indexer.add('b.json', meta('b.json', 'http://b', '2026-04-02T00:00:00Z'));
    indexer.add('c.json', meta('c.json', 'http://c', '2026-04-03T00:00:00Z'));

    const list = indexer.list({ limit: 2 });
    expect(list).toHaveLength(2);
  });

  it('filters by URL substring', () => {
    indexer.add('a.json', meta('a.json', 'http://localhost:8040/projects', '2026-04-01T00:00:00Z'));
    indexer.add('b.json', meta('b.json', 'http://localhost:8040/jobs', '2026-04-02T00:00:00Z'));
    indexer.add('c.json', meta('c.json', 'http://example.com/page', '2026-04-03T00:00:00Z'));

    const list = indexer.list({ urlFilter: 'localhost:8040' });
    expect(list).toHaveLength(2);
  });

  it('returns empty array when no captures', () => {
    expect(indexer.list({})).toEqual([]);
  });

  it('getLatest returns most recent capture', () => {
    indexer.add('old.json', meta('old.json', 'http://a', '2026-04-01T00:00:00Z'));
    indexer.add('new.json', meta('new.json', 'http://b', '2026-04-08T00:00:00Z'));

    const latest = indexer.getLatest();
    expect(latest.filename).toBe('new.json');
  });

  it('getLatest filters by URL', () => {
    indexer.add('a.json', meta('a.json', 'http://localhost/projects', '2026-04-08T00:00:00Z'));
    indexer.add('b.json', meta('b.json', 'http://example.com', '2026-04-09T00:00:00Z'));

    const latest = indexer.getLatest('localhost');
    expect(latest.filename).toBe('a.json');
  });

  it('getLatest returns undefined when no match', () => {
    expect(indexer.getLatest('nope')).toBeUndefined();
  });

  it('evicts oldest when exceeding maxCaptures', () => {
    for (let i = 1; i <= 6; i++) {
      indexer.add(`${i}.json`, meta(`${i}.json`, `http://x/${i}`, `2026-04-0${i}T00:00:00Z`));
    }
    // maxCaptures is 5, so the oldest (1.json) should be evicted
    expect(indexer.get('1.json')).toBeUndefined();
    expect(indexer.get('6.json')).toBeDefined();
    expect(indexer.list({}).length).toBe(5);
  });
});
