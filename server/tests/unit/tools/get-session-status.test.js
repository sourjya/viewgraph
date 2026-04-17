/**
 * Tests for get_session_status MCP tool.
 * Returns capture/annotation/baseline counts with actionable suggestions.
 *
 * @see server/src/tools/get-session-status.js
 * @see .kiro/specs/mcp-agent-guidance/design.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { register } from '#src/tools/get-session-status.js';
import { createIndexer } from '#src/indexer.js';

describe('get_session_status', () => {
  let server, client, indexer;

  beforeEach(async () => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    indexer = createIndexer({ maxCaptures: 50 });
    register(server, indexer);
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    client = new Client({ name: 'test-client', version: '0.0.1' });
    await client.connect(ct);
  });

  it('(+) returns status with zero captures', async () => {
    const res = await client.callTool({ name: 'get_session_status', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures.total).toBe(0);
    expect(data.annotations.total).toBe(0);
  });

  it('(+) returns captures count after indexing', async () => {
    indexer.add('test-capture.json', { url: 'http://localhost:3000', timestamp: new Date().toISOString(), nodeCount: 50, title: 'Test' });
    const res = await client.callTool({ name: 'get_session_status', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures.total).toBe(1);
    expect(data.captures.pages).toContain('localhost:3000');
  });

  it('(+) includes actionable suggestions', async () => {
    const res = await client.callTool({ name: 'get_session_status', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it('(+) suggests capturing when no captures exist', async () => {
    const res = await client.callTool({ name: 'get_session_status', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data.suggestions.some((s) => s.includes('No captures'))).toBe(true);
  });

  it('(+) response has expected shape', async () => {
    const res = await client.callTool({ name: 'get_session_status', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data).toHaveProperty('captures');
    expect(data).toHaveProperty('annotations');
    expect(data).toHaveProperty('baselines');
    expect(data).toHaveProperty('suggestions');
  });
});
