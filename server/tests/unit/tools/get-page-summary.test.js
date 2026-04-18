/**
 * get_page_summary  -  MCP Tool Integration Tests
 *
 * Tests summary extraction from a valid capture and error handling for missing files.
 * Uses InMemoryTransport with real fixture files on disk.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-page-summary.js';

describe('get_page_summary via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns summary with url, title, viewport, element counts, clusters', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_page_summary', arguments: { filename: 'valid-capture.json' } });

    expect(result.isError).toBeFalsy();
    const summary = JSON.parse(result.content[0].text);
    expect(summary.url).toBe('http://localhost:8040/projects');
    expect(summary.title).toBe('Projects - AI Video Editor');
    expect(summary.viewport).toEqual({ width: 1696, height: 799 });
    expect(summary.elementCounts).toBeDefined();
    expect(summary.elementCounts.total).toBe(12);
    expect(summary.clusters).toBeDefined();
  });

  it('returns error for missing file', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_page_summary', arguments: { filename: 'nonexistent.json' } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('(-) returns error for path traversal', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;
    const result = await client.callTool({ name: 'get_page_summary', arguments: { filename: '../../../etc/passwd' } });
    expect(result.isError).toBe(true);
  });
});
