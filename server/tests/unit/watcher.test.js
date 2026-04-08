/**
 * Watcher + Indexer Integration Test
 *
 * Verifies that the file watcher detects new capture files in a temp
 * directory and the indexer picks them up via the onAdd callback.
 * Uses real filesystem operations with a temp directory.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import { createWatcher } from '#src/watcher.js';
import { createIndexer } from '#src/indexer.js';
import { parseMetadata } from '#src/parsers/viewgraph-v2.js';
import { readFile } from 'fs/promises';

/** Minimal valid capture for watcher to index. */
const VALID_CAPTURE = JSON.stringify({
  '====METADATA====': {
    format: 'viewgraph-v2',
    version: '2.0.0',
    timestamp: '2026-04-08T06:08:15.214Z',
    url: 'http://localhost:8040/projects',
    title: 'Test Page',
    viewport: { width: 1696, height: 799 },
    stats: { totalNodes: 10 },
  },
  '====NODES====': {},
  '====SUMMARY====': {},
});

describe('watcher + indexer integration', () => {
  let tmpDir;
  let watcher;

  afterEach(async () => {
    if (watcher) await watcher.close();
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('indexes a capture file written to the watched directory', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'vg-watcher-'));
    const indexer = createIndexer({ maxCaptures: 10 });

    /** Promise that resolves when the watcher fires onAdd. */
    const fileIndexed = new Promise((resolve) => {
      watcher = createWatcher(tmpDir, {
        onAdd: async (filename, filePath) => {
          const content = await readFile(filePath, 'utf-8');
          const result = parseMetadata(content);
          if (result.ok) {
            indexer.add(filename, result.data);
            resolve(filename);
          }
        },
        onChange: () => {},
        onRemove: (filename) => indexer.remove(filename),
      });
    });

    // Write a capture file after a short delay to ensure watcher is ready
    await new Promise((r) => setTimeout(r, 200));
    const captureFile = 'viewgraph-test-20260408.json';
    await writeFile(path.join(tmpDir, captureFile), VALID_CAPTURE);

    // Wait for the watcher to pick it up (timeout after 5s)
    const indexed = await Promise.race([
      fileIndexed,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Watcher timeout')), 5000)),
    ]);

    expect(indexed).toBe(captureFile);
    expect(indexer.list()).toHaveLength(1);
    expect(indexer.list()[0].filename).toBe(captureFile);
    expect(indexer.list()[0].url).toBe('http://localhost:8040/projects');
  });

  it('ignores non-JSON files', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'vg-watcher-'));
    const added = [];

    watcher = createWatcher(tmpDir, {
      onAdd: (filename) => added.push(filename),
      onChange: () => {},
      onRemove: () => {},
    });

    await new Promise((r) => setTimeout(r, 200));
    await writeFile(path.join(tmpDir, 'screenshot.png'), 'fake png data');
    await writeFile(path.join(tmpDir, 'notes.txt'), 'some notes');
    await new Promise((r) => setTimeout(r, 500));

    expect(added).toHaveLength(0);
  });
});
