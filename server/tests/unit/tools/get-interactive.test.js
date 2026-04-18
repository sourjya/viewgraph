/**
 * get_interactive_elements - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createFixtureClient } from './helpers.js';
import { register } from '#src/tools/get-interactive.js';

describe('get_interactive_elements via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns interactive elements with actions', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_interactive_elements', arguments: { filename: 'valid-capture.json' } });
    const elements = JSON.parse(result.content[0].text);
    expect(elements.length).toBeGreaterThan(0);
    elements.forEach((e) => expect(e.actions.length).toBeGreaterThan(0));
  });

  it('includes testid and aria-label when present', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_interactive_elements', arguments: { filename: 'valid-capture.json' } });
    const elements = JSON.parse(result.content[0].text);
    const btn = elements.find((e) => e.id === 'btn001');
    expect(btn['data-testid']).toBe('create-project');
    expect(btn['aria-label']).toBe('Create new project');
  });

  it('(-) returns error for nonexistent file', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_interactive_elements', arguments: { filename: 'nope.json' } });
    expect(result.isError).toBe(true);
  });

  it('(-) returns error for path traversal', async () => {
    const { client, cleanup: c } = await createFixtureClient(register);
    cleanup = c;
    const result = await client.callTool({ name: 'get_interactive_elements', arguments: { filename: '../../package.json' } });
    expect(result.isError).toBe(true);
  });
});
