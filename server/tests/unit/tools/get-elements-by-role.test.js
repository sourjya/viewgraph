/**
 * get_elements_by_role - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createFixtureClient } from './helpers.js';
import { register } from '#src/tools/get-elements-by-role.js';

describe('get_elements_by_role via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns buttons from valid capture', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'valid-capture.json', role: 'button' } });
    const elements = JSON.parse(result.content[0].text);
    expect(elements.length).toBeGreaterThan(0);
    elements.forEach((e) => expect(e.tag).toBe('button'));
  });

  it('returns empty array for role with no matches', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'valid-capture.json', role: 'form' } });
    const elements = JSON.parse(result.content[0].text);
    expect(elements).toEqual([]);
  });

  it('returns error for missing file', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'nope.json', role: 'button' } });
    expect(result.isError).toBe(true);
  });

  it('includes inViewport flag on each element', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_elements_by_role', arguments: { filename: 'valid-capture.json', role: 'button' } });
    const elements = JSON.parse(result.content[0].text);
    elements.forEach((e) => expect(typeof e.inViewport).toBe('boolean'));
  });
});
