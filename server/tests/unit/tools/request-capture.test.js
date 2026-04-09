/**
 * request_capture - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient } from './helpers.js';
import { createRequestQueue } from '#src/request-queue.js';
import { register } from '#src/tools/request-capture.js';

describe('request_capture via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('creates a request and returns requestId + status', async () => {
    const queue = createRequestQueue();
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'request_capture', arguments: { url: 'http://localhost:5173' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.requestId).toBeDefined();
    expect(data.status).toBe('pending');
  });

  it('returns error when queue is full', async () => {
    const queue = createRequestQueue({ maxSize: 1 });
    queue.create('http://localhost:3000');
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'request_capture', arguments: { url: 'http://localhost:5173' } });
    expect(result.isError).toBe(true);
  });

  it('includes guidance in the request', async () => {
    const queue = createRequestQueue();
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'request_capture', arguments: {
      url: 'http://localhost:5173', guidance: 'Verify fix: reload and check the header font size',
    } });
    const data = JSON.parse(result.content[0].text);
    expect(data.requestId).toBeDefined();
    // Verify guidance is stored in the queue
    const pending = queue.getPending();
    expect(pending[0].guidance).toBe('Verify fix: reload and check the header font size');
  });

  it('guidance is optional', async () => {
    const queue = createRequestQueue();
    const { client, cleanup: c } = await createTestClient((s) => register(s, queue));
    cleanup = c;
    const result = await client.callTool({ name: 'request_capture', arguments: { url: 'http://localhost:5173' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.requestId).toBeDefined();
    const pending = queue.getPending();
    expect(pending[0].guidance).toBeUndefined();
  });
});
