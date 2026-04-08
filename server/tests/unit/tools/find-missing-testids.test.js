/**
 * find_missing_testids - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/find-missing-testids.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('find_missing_testids via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('identifies interactive elements without data-testid', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'find_missing_testids', arguments: { filename: 'valid-capture.json' } });
    const missing = JSON.parse(result.content[0].text);
    // nav001 (a tag with click action) has no details/testid
    expect(missing.length).toBeGreaterThan(0);
    missing.forEach((m) => expect(m.suggestedTestId).toBeDefined());
  });

  it('suggests testid based on tag + text', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'find_missing_testids', arguments: { filename: 'valid-capture.json' } });
    const missing = JSON.parse(result.content[0].text);
    const nav = missing.find((m) => m.id === 'nav001');
    expect(nav).toBeDefined();
    expect(nav.suggestedTestId).toBe('a-dashboard');
  });
});
