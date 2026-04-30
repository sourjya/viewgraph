/**
 * compare_screenshots - Security Tests
 *
 * Tests filePath output traversal prevention (S3-8).
 * Ensures diff images can only be written within the captures directory.
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/compare-screenshots.js';

describe('compare_screenshots security', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  // S3-8: filePath must be restricted to captures directory
  it('(-) rejects filePath that escapes captures directory', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({
      name: 'compare_screenshots',
      arguments: {
        file_a: 'a.png',
        file_b: 'b.png',
        filePath: path.resolve(FIXTURES_DIR, '..', 'session-key'),
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('captures directory');
  });

  it('(-) rejects filePath with ../ traversal to parent', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({
      name: 'compare_screenshots',
      arguments: {
        file_a: 'a.png',
        file_b: 'b.png',
        filePath: FIXTURES_DIR + '/../config.json',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('captures directory');
  });
});
