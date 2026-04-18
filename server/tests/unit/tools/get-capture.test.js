/**
 * get_capture  -  MCP Tool Integration Tests
 *
 * Tests full JSON retrieval, path traversal rejection, and missing file handling.
 * Uses InMemoryTransport with real fixture files on disk.
 */

import { describe, it, expect, afterEach } from 'vitest';
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
});
