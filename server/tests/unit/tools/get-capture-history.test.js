/**
 * get_capture_history - MCP Tool Integration Tests
 *
 * Tests URL grouping, timeline ordering, and empty index handling.
 * Uses InMemoryTransport with a pre-populated indexer.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-capture-history.js';

describe('get_capture_history via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) groups captures by URL', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('a1.json', { url: 'http://localhost/page-a', title: 'A1', timestamp: '2026-04-08T01:00:00Z', node_count: 10 });
    indexer.add('a2.json', { url: 'http://localhost/page-a', title: 'A2', timestamp: '2026-04-08T02:00:00Z', node_count: 15 });
    indexer.add('b1.json', { url: 'http://localhost/page-b', title: 'B1', timestamp: '2026-04-08T03:00:00Z', node_count: 20 });

    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_history', arguments: {} });
    const history = JSON.parse(result.content[0].text);

    expect(history).toHaveLength(2);
    const pageA = history.find((h) => h.url.includes('page-a'));
    expect(pageA.captureCount).toBe(2);
    expect(pageA.timeline).toHaveLength(2);
  });

  it('(+) computes nodeCountDelta between sequential captures', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('c1.json', { url: 'http://localhost/page', title: 'C1', timestamp: '2026-04-08T01:00:00Z', node_count: 10 });
    indexer.add('c2.json', { url: 'http://localhost/page', title: 'C2', timestamp: '2026-04-08T02:00:00Z', node_count: 18 });

    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_history', arguments: {} });
    const history = JSON.parse(result.content[0].text);
    const timeline = history[0].timeline;

    expect(timeline[0].nodeCountDelta).toBeUndefined(); // first entry has no delta
    expect(timeline[1].nodeCountDelta).toBe(8);
  });

  it('(-) returns message when no captures exist', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'get_capture_history', arguments: {} });
    expect(result.content[0].text).toContain('No captures found');
  });
});
