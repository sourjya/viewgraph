/**
 * compare_styles - MCP Tool Integration Tests
 *
 * Tests CSS style diffing between two captures for a given element.
 *
 * @see server/src/tools/compare-styles.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/compare-styles.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('compare_styles via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) detects changed CSS properties', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: 'valid-capture.json', file_b: 'valid-capture-v2.json', element_id: 'btn001',
    } });
    const diff = JSON.parse(result.content[0].text);
    expect(diff.changed.length).toBeGreaterThan(0);
    const bgChange = diff.changed.find((c) => c.property === 'backgroundColor');
    expect(bgChange.before).toBe('#6366f1');
    expect(bgChange.after).toBe('#ef4444');
  });

  it('(+) detects added CSS properties', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: 'valid-capture.json', file_b: 'valid-capture-v2.json', element_id: 'btn001',
    } });
    const diff = JSON.parse(result.content[0].text);
    const added = diff.added.find((a) => a.property === 'borderRadius');
    expect(added).toBeDefined();
    expect(added.value).toBe('8px');
  });

  it('(+) detects removed CSS properties', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: 'valid-capture.json', file_b: 'valid-capture-v2.json', element_id: 'btn001',
    } });
    const diff = JSON.parse(result.content[0].text);
    const removed = diff.removed.find((r) => r.property === 'color');
    expect(removed).toBeDefined();
    expect(removed.value).toBe('#ffffff');
  });

  it('(+) reports no changes when comparing same file', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: 'valid-capture.json', file_b: 'valid-capture.json', element_id: 'btn001',
    } });
    const diff = JSON.parse(result.content[0].text);
    expect(diff.changed).toEqual([]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('(-) returns error for nonexistent element', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: 'valid-capture.json', file_b: 'valid-capture-v2.json', element_id: 'ghost999',
    } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('(-) returns error for nonexistent file', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: 'nope.json', file_b: 'valid-capture.json', element_id: 'btn001',
    } });
    expect(result.isError).toBe(true);
  });

  it('(-) returns error for path traversal', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'compare_styles', arguments: {
      file_a: '../../../etc/passwd', file_b: 'valid-capture.json', element_id: 'btn001',
    } });
    expect(result.isError).toBe(true);
  });
});
