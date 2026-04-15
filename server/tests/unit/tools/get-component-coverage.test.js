/**
 * get_component_coverage - MCP Tool Integration Tests
 *
 * Tests testid coverage reporting per component.
 *
 * @see server/src/tools/get-component-coverage.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/get-component-coverage.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('get_component_coverage via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) returns coverage summary with overall stats', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: 'valid-capture.json' } });
    expect(result.isError).toBeFalsy();
    const summary = JSON.parse(result.content[0].text);
    expect(summary.totalInteractive).toBeGreaterThan(0);
    expect(typeof summary.overallCoverage).toBe('number');
    expect(summary.components).toBeDefined();
    expect(Array.isArray(summary.components)).toBe(true);
  });

  it('(+) identifies elements with testids as covered', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: 'valid-capture.json' } });
    const summary = JSON.parse(result.content[0].text);
    // btn001 has data-testid="create-project" in details
    expect(summary.totalWithTestid).toBeGreaterThan(0);
  });

  it('(+) identifies elements missing testids', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: 'valid-capture.json' } });
    const summary = JSON.parse(result.content[0].text);
    // nav001 (a tag) has no data-testid
    expect(summary.totalMissing).toBeGreaterThan(0);
  });

  it('(+) falls back to tag-based grouping when no framework detected', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: 'valid-capture.json' } });
    const summary = JSON.parse(result.content[0].text);
    expect(summary.framework).toBe('none detected');
    // Components should be grouped by tag name
    const tags = summary.components.map((c) => c.component);
    expect(tags.length).toBeGreaterThan(0);
  });

  it('(+) sorts components by coverage ascending (worst first)', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: 'valid-capture.json' } });
    const summary = JSON.parse(result.content[0].text);
    for (let i = 1; i < summary.components.length; i++) {
      expect(summary.components[i].coverage).toBeGreaterThanOrEqual(summary.components[i - 1].coverage);
    }
  });

  it('(-) returns error for nonexistent file', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: 'nope.json' } });
    expect(result.isError).toBe(true);
  });

  it('(-) returns error for path traversal', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'get_component_coverage', arguments: { filename: '../../package.json' } });
    expect(result.isError).toBe(true);
  });
});
