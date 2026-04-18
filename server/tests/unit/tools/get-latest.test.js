/**
 * get_latest_capture  -  MCP Tool Integration Tests
 *
 * Tests most-recent retrieval, URL filtering, and empty-index handling.
 * Uses InMemoryTransport with a pre-populated indexer and real fixture files.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-latest.js';

describe('get_latest_capture via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns the most recent capture', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('old.json', { url: 'http://localhost/old', title: 'Old', timestamp: '2026-04-07T00:00:00Z', nodeCount: 5 });
    // Point "latest" at a real fixture file so readFile succeeds
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', title: 'Latest', timestamp: '2026-04-08T06:08:15Z', nodeCount: 12 });

    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_latest_capture', arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('valid-capture.json');
    expect(result.content[0].text).toContain('localhost:8040');
  });

  it('filters by URL', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', title: 'Local', timestamp: '2026-04-08T06:08:15Z', nodeCount: 12 });
    indexer.add('other.json', { url: 'http://example.com/page', title: 'Other', timestamp: '2026-04-08T07:00:00Z', nodeCount: 5 });

    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_latest_capture', arguments: { url_filter: 'localhost' } });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('valid-capture.json');
  });

  it('returns error when no captures match', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_latest_capture', arguments: {} });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No captures found');
  });
});
