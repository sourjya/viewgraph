/**
 * compare_captures - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createFixtureClient } from './helpers.js';
import { register } from '#src/tools/compare-captures.js';

describe('compare_captures via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('detects differences between two captures', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    // Compare valid-capture (12 nodes) with annotated-capture (5 nodes) - should show differences
    const result = await client.callTool({ name: 'compare_captures', arguments: { file_a: 'valid-capture.json', file_b: 'annotated-capture.json' } });
    const diff = JSON.parse(result.content[0].text);
    expect(diff.added).toBeDefined();
    expect(diff.removed).toBeDefined();
    expect(diff.moved).toBeDefined();
    expect(diff.removed.length).toBeGreaterThan(0);
  });

  it('returns empty diff for same file', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'compare_captures', arguments: { file_a: 'valid-capture.json', file_b: 'valid-capture.json' } });
    const diff = JSON.parse(result.content[0].text);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('returns error for missing file', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'compare_captures', arguments: { file_a: 'valid-capture.json', file_b: 'nope.json' } });
    expect(result.isError).toBe(true);
  });
});
