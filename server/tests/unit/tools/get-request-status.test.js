/**
 * get_request_status - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient } from './helpers.js';
import { createRequestQueue } from '#src/request-queue.js';
import { register } from '#src/tools/get-request-status.js';

describe('get_request_status via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns status for valid request id', async () => {
    const queue = createRequestQueue();
    const req = queue.create('http://localhost:5173');
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'get_request_status', arguments: { request_id: req.id } });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('pending');
  });

  it('returns filename when completed', async () => {
    const queue = createRequestQueue();
    const req = queue.create('http://localhost:5173');
    queue.acknowledge(req.id);
    queue.complete(req.id, 'viewgraph-localhost-20260408.json');
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'get_request_status', arguments: { request_id: req.id } });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('completed');
    expect(data.filename).toBe('viewgraph-localhost-20260408.json');
  });

  it('returns error for unknown request id', async () => {
    const queue = createRequestQueue();
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'get_request_status', arguments: { request_id: 'nope' } });
    expect(result.isError).toBe(true);
  });
});
