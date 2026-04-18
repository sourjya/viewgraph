/**
 * find_missing_testids - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createFixtureClient } from './helpers.js';
import { register } from '#src/tools/find-missing-testids.js';

describe('find_missing_testids via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) identifies interactive elements without data-testid', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'find_missing_testids', arguments: { filename: 'valid-capture.json' } });
    const missing = JSON.parse(result.content[0].text);
    expect(missing.length).toBeGreaterThan(0);
    missing.forEach((m) => expect(m.suggestedTestId).toBeDefined());
  });

  it('(+) suggests testid based on tag + text', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'find_missing_testids', arguments: { filename: 'valid-capture.json' } });
    const missing = JSON.parse(result.content[0].text);
    const nav = missing.find((m) => m.id === 'nav001');
    expect(nav).toBeDefined();
    expect(nav.suggestedTestId).toBe('a-dashboard');
  });

  it('(-) returns error for nonexistent file', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'find_missing_testids', arguments: { filename: 'ghost.json' } });
    expect(result.isError).toBe(true);
  });

  it('(-) returns error for path traversal', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'find_missing_testids', arguments: { filename: '../../package.json' } });
    expect(result.isError).toBe(true);
  });
});
