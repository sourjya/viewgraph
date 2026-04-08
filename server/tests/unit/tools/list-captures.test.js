/**
 * list_captures  -  MCP Tool Integration Tests
 *
 * Tests the full MCP protocol path: client → transport → server → handler → response.
 * Uses InMemoryTransport with a pre-populated indexer.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient } from './helpers.js';
import { createIndexer } from '../../../src/indexer.js';
import { register } from '../../../src/tools/list-captures.js';

describe('list_captures via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  /** Seed an indexer with N captures for testing. */
  function seedIndexer(n = 3) {
    const indexer = createIndexer({ maxCaptures: 50 });
    for (let i = 0; i < n; i++) {
      indexer.add(`capture-${i}.json`, {
        url: i % 2 === 0 ? 'http://localhost:8040/projects' : 'http://example.com/page',
        title: `Page ${i}`,
        timestamp: new Date(2026, 3, 8, 6, i).toISOString(),
        nodeCount: 100 + i,
      });
    }
    return indexer;
  }

  it('returns captures sorted by timestamp descending', async () => {
    const indexer = seedIndexer(3);
    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'list_captures', arguments: {} });
    const captures = JSON.parse(result.content[0].text);

    expect(captures).toHaveLength(3);
    // Most recent first
    expect(captures[0].filename).toBe('capture-2.json');
    expect(captures[2].filename).toBe('capture-0.json');
  });

  it('respects limit parameter', async () => {
    const indexer = seedIndexer(5);
    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'list_captures', arguments: { limit: 2 } });
    const captures = JSON.parse(result.content[0].text);

    expect(captures).toHaveLength(2);
  });

  it('filters by URL substring', async () => {
    const indexer = seedIndexer(4);
    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'list_captures', arguments: { url_filter: 'localhost' } });
    const captures = JSON.parse(result.content[0].text);

    expect(captures.length).toBeGreaterThan(0);
    captures.forEach((cap) => expect(cap.url).toContain('localhost'));
  });

  it('returns message when no captures exist', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient((server) => register(server, indexer));
    cleanup = c;

    const result = await client.callTool({ name: 'list_captures', arguments: {} });

    expect(result.content[0].text).toContain('No captures found');
  });
});
