/**
 * get_annotated_capture - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-annotated-capture.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('get_annotated_capture via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns filtered capture with annotation comments', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotated_capture', arguments: { filename: 'annotated-capture.json' } });
    const parsed = JSON.parse(result.content[0].text);
        const output = parsed.annotatedNodes || parsed;
    expect(output).toHaveLength(2);
    expect(output[0].annotation.comment).toContain('pagination');
    expect(output[0].nodes.length).toBeGreaterThan(0);
  });

  it('filters to single annotation by id', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotated_capture', arguments: { filename: 'annotated-capture.json', annotation_id: 'ann-2' } });
    const parsed = JSON.parse(result.content[0].text);
        const output = parsed.annotatedNodes || parsed;
    expect(output).toHaveLength(1);
    expect(output[0].annotation.comment).toContain('side panel');
  });

  it('returns message for non-annotated capture', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_annotated_capture', arguments: { filename: 'valid-capture.json' } });
    expect(result.content[0].text).toContain('No annotations');
  });
});
