/**
 * verify_fix - MCP Tool Integration Tests
 *
 * Tests pass/fail verdict based on capture content. Uses real fixture
 * files via InMemoryTransport.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/verify-fix.js';

describe('verify_fix via MCP', () => {
  let cleanup;

  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) returns structured verdict for valid capture', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', title: 'Projects', timestamp: '2026-04-08T06:08:15Z', nodeCount: 12 });

    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'verify_fix', arguments: { filename: 'valid-capture.json' } });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.verdict).toMatch(/^(PASS|FAIL)$/);
    expect(body.checks).toBeDefined();
    expect(body.checks.a11y).toHaveProperty('pass');
    expect(body.checks.layout).toHaveProperty('pass');
    expect(body.checks.console).toHaveProperty('pass');
    expect(body.checks.network).toHaveProperty('pass');
  });

  it('(+) uses latest capture when filename omitted', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', title: 'Projects', timestamp: '2026-04-08T06:08:15Z', nodeCount: 12 });

    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'verify_fix', arguments: {} });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.capture).toBe('valid-capture.json');
  });

  it('(-) returns error when no captures found', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'verify_fix', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No captures found');
  });

  it('(-) returns error for unreadable capture', async () => {
    const indexer = createIndexer({ maxCaptures: 50 });
    const { client, cleanup: c } = await createTestClient(
      (server) => register(server, indexer, FIXTURES_DIR),
    );
    cleanup = c;

    const result = await client.callTool({ name: 'verify_fix', arguments: { filename: 'nonexistent.json' } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cannot read');
  });
});
