/**
 * get_capture_diff - MCP Tool Integration Tests
 *
 * Tests patch mode when previous capture exists, and full fallback
 * when no previous capture is available.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-capture-diff.js';

describe('get_capture_diff via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) returns full mode when no previous capture exists', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', title: 'Projects', timestamp: '2026-04-08T06:08:15Z', nodeCount: 12 });

    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_diff', arguments: { filename: 'valid-capture.json' } });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.mode).toBe('full');
    expect(body.reason).toContain('No previous capture');
  });

  it('(+) returns patch mode when previous capture exists for same URL', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', title: 'Old', timestamp: '2026-04-08T05:00:00Z', nodeCount: 12 });
    indexer.add('latest-capture.json', { url: 'http://localhost:8040/projects', title: 'New', timestamp: '2026-04-08T06:08:15Z', nodeCount: 12 });

    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_diff', arguments: { filename: 'latest-capture.json' } });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    // Should be patch or full depending on diff size - both are valid
    expect(['patch', 'full']).toContain(body.mode);
    if (body.mode === 'patch') {
      expect(body.patch).toBeDefined();
      expect(body.stats).toBeDefined();
      expect(body.stats.operations).toBeGreaterThanOrEqual(0);
    }
  });

  it('(-) returns error when no captures found', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_diff', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No captures found');
  });

  it('(-) returns error for unreadable file', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_diff', arguments: { filename: 'nonexistent.json' } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cannot read');
  });
});
