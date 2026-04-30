/**
 * get_capture  -  MCP Tool Integration Tests
 *
 * Tests full JSON retrieval, path traversal rejection, and missing file handling.
 * Uses InMemoryTransport with real fixture files on disk.
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-capture.js';

describe('get_capture via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns full JSON for a valid filename', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture', arguments: { filename: 'valid-capture.json' } });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('"metadata"');
    expect(result.content[0].text).toContain('localhost:8040');
  });

  it('rejects path traversal attempts', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture', arguments: { filename: '../../../etc/passwd' } });

    // validate-path strips to basename "passwd", which won't exist
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('returns error for missing file', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture', arguments: { filename: 'nonexistent.json' } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('(+) falls back to archive/ when file not in captures/', async () => {
    // Create a temp captures dir with an archive containing the file
    const { mkdirSync, writeFileSync, rmSync } = await import('fs');
    const { join } = await import('path');
    const os = await import('os');
    const tmpDir = join(os.tmpdir(), `vg-get-capture-${Date.now()}`);
    const capturesDir = join(tmpDir, 'captures');
    const archiveDir = join(tmpDir, 'archive', '2026-04');
    mkdirSync(capturesDir, { recursive: true });
    mkdirSync(archiveDir, { recursive: true });

    // Put file in archive, not in captures
    const capture = JSON.stringify({ metadata: { url: 'http://test', timestamp: '2026-04-08T12:00:00Z', viewport: { width: 1024, height: 768 }, stats: { totalNodes: 1 } }, nodes: [] });
    writeFileSync(join(archiveDir, 'archived-file.json'), capture);
    writeFileSync(join(tmpDir, 'archive', 'index.json'), JSON.stringify({
      version: 1, lastUpdated: '2026-04-09T00:00:00Z',
      captures: [{ filename: '2026-04/archived-file.json', originalPath: 'archived-file.json', url: 'http://test' }],
    }));

    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, capturesDir),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture', arguments: { filename: 'archived-file.json' } });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('[archived]');
    expect(result.content[0].text).toContain('"metadata"');

    rmSync(tmpDir, { recursive: true, force: true });
  });

  // S3-8: filePath output must be restricted to captures directory
  it('(-) rejects filePath that escapes captures directory', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    // Attempt to write to .viewgraph/session-key (parent of captures/)
    const result = await client.callTool({
      name: 'get_capture',
      arguments: { filename: 'valid-capture.json', filePath: path.resolve(FIXTURES_DIR, '..', 'session-key') },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('captures directory');
  });

  it('(-) rejects filePath with ../ traversal', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({
      name: 'get_capture',
      arguments: { filename: 'valid-capture.json', filePath: FIXTURES_DIR + '/../config.json' },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('captures directory');
  });
});
