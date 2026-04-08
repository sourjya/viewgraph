/**
 * get_elements_by_role - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-elements-by-role.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('get_elements_by_role via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns buttons from valid capture', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'valid-capture.json', role: 'button' } });
    const elements = JSON.parse(result.content[0].text);
    expect(elements.length).toBeGreaterThan(0);
    elements.forEach((e) => expect(e.tag).toBe('button'));
  });

  it('returns empty array for role with no matches', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'valid-capture.json', role: 'form' } });
    const elements = JSON.parse(result.content[0].text);
    expect(elements).toEqual([]);
  });

  it('returns error for missing file', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'nope.json', role: 'button' } });
    expect(result.isError).toBe(true);
  });
});
