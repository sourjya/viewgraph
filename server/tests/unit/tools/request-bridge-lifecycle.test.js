/**
 * M3 Request Bridge - Full Lifecycle Integration Test
 *
 * Tests the complete flow: agent requests capture via MCP tool,
 * extension polls for pending requests via HTTP, acknowledges,
 * submits capture, and agent polls for completion.
 *
 * Exercises: request queue, HTTP receiver, request_capture tool,
 * get_request_status tool working together end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { createTestClient } from './helpers.js';
import { createRequestQueue } from '#src/request-queue.js';
import { createHttpReceiver } from '#src/http-receiver.js';
import { register as registerRequestCapture } from '#src/tools/request-capture.js';
import { register as registerGetRequestStatus } from '#src/tools/get-request-status.js';

/** Helper: HTTP request to the receiver. */
async function http(port, method, urlPath, body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, opts);
  return { status: res.status, body: await res.json() };
}

describe('M3 request bridge lifecycle', () => {
  let queue, receiver, port, capturesDir, client, cleanup;

  beforeEach(async () => {
    capturesDir = path.join(os.tmpdir(), `vg-lifecycle-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60_000 });
    receiver = createHttpReceiver({ queue, capturesDir, port: 0 });
    port = await receiver.start();

    const result = await createTestClient((server) => {
      registerRequestCapture(server, queue);
      registerGetRequestStatus(server, queue);
    });
    client = result.client;
    cleanup = result.cleanup;
  });

  afterEach(async () => {
    await receiver.stop();
    if (cleanup) await cleanup();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  it('full lifecycle: request -> poll -> ack -> submit -> completed', async () => {
    // 1. Agent requests a capture via MCP
    const reqResult = await client.callTool({
      name: 'request_capture',
      arguments: { url: 'http://localhost:5173/dashboard' },
    });
    const { requestId } = JSON.parse(reqResult.content[0].text);
    expect(requestId).toBeDefined();

    // 2. Agent checks status - should be pending
    const pendingResult = await client.callTool({
      name: 'get_request_status',
      arguments: { request_id: requestId },
    });
    expect(JSON.parse(pendingResult.content[0].text).status).toBe('pending');

    // 3. Extension polls for pending requests via HTTP
    const pendingHttp = await http(port, 'GET', '/requests/pending');
    expect(pendingHttp.body.requests).toHaveLength(1);
    expect(pendingHttp.body.requests[0].id).toBe(requestId);

    // 4. Extension acknowledges the request
    const ackHttp = await http(port, 'POST', `/requests/${requestId}/ack`);
    expect(ackHttp.body.status).toBe('acknowledged');

    // 5. Agent checks status - should be acknowledged
    const ackedResult = await client.callTool({
      name: 'get_request_status',
      arguments: { request_id: requestId },
    });
    expect(JSON.parse(ackedResult.content[0].text).status).toBe('acknowledged');

    // 6. Extension submits the capture via HTTP
    const capture = {
      metadata: {
        format: 'viewgraph-v2',
        url: 'http://localhost:5173/dashboard',
        timestamp: '2026-04-08T12:00:00Z',
        title: 'Dashboard',
        viewport: { width: 1696, height: 799 },
        stats: { totalNodes: 42 },
      },
      nodes: { high: [], med: [], low: [] },
    };
    const submitHttp = await http(port, 'POST', '/captures', capture);
    expect(submitHttp.status).toBe(201);
    expect(submitHttp.body.requestId).toBe(requestId);

    // 7. Agent checks status - should be completed with filename
    const doneResult = await client.callTool({
      name: 'get_request_status',
      arguments: { request_id: requestId },
    });
    const doneData = JSON.parse(doneResult.content[0].text);
    expect(doneData.status).toBe('completed');
    expect(doneData.filename).toMatch(/\.json$/);
  });
});
