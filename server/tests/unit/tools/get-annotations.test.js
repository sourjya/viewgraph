/**
 * get_annotations - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-annotations.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('get_annotations via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns annotations from review capture', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotations', arguments: { filename: 'annotated-capture.json' } });
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations).toHaveLength(2);
    expect(annotations[0].comment).toContain('pagination');
    expect(annotations[1].comment).toContain('side panel');
  });

  it('returns empty array for non-review capture', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotations', arguments: { filename: 'valid-capture.json' } });
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations).toEqual([]);
  });

  it('returns annotations with ancestor labels from review capture', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotations', arguments: { filename: 'review-capture.json' } });
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations).toHaveLength(3);
    expect(annotations[0].ancestor).toBe('div.card.p-4');
    expect(annotations[1].ancestor).toBe('div.card.text-white');
  });

  it('includes resolved status in annotations', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotations', arguments: { filename: 'review-capture.json' } });
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations[2].resolved).toBe(true);
    expect(annotations[0].resolved).toBe(false);
  });

  it('returns empty array for subtree capture', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotations', arguments: { filename: 'subtree-capture.json' } });
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations).toEqual([]);
  });
});
