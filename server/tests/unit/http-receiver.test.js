/**
 * HTTP Receiver - Unit Tests
 *
 * Tests the lightweight HTTP server that enables the browser extension
 * to poll for capture requests and submit completed captures.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHttpReceiver } from '#src/http-receiver.js';
import { createRequestQueue } from '#src/request-queue.js';
import { readFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

/** Helper: make an HTTP request to the receiver. */
async function req(port, method, urlPath, body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, opts);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('HTTP receiver', () => {
  let queue, receiver, port, capturesDir;

  beforeEach(async () => {
    capturesDir = path.join(os.tmpdir(), `vg-test-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    receiver = createHttpReceiver({ queue, capturesDir, port: 0 });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  it('GET /health returns ok', async () => {
    const res = await req(port, 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /requests/pending returns pending requests', async () => {
    queue.create('http://localhost:5173');
    queue.create('http://localhost:3000');
    const res = await req(port, 'GET', '/requests/pending');
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(2);
  });

  it('POST /requests/:id/ack acknowledges a request', async () => {
    const r = queue.create('http://localhost:5173');
    const res = await req(port, 'POST', `/requests/${r.id}/ack`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');
  });

  it('POST /captures writes file and returns filename', async () => {
    const capture = {
      metadata: {
        format: 'viewgraph-v2',
        url: 'http://localhost:5173/jobs',
        timestamp: '2026-04-08T10:00:00Z',
        title: 'Test',
        viewport: { width: 1696, height: 799 },
        stats: { totalNodes: 5 },
      },
      nodes: {},
    };
    const res = await req(port, 'POST', '/captures', capture);
    expect(res.status).toBe(201);
    expect(res.body.filename).toMatch(/\.json$/);
    // Verify file was written
    const filePath = path.join(capturesDir, res.body.filename);
    const written = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(written.metadata.url).toBe('http://localhost:5173/jobs');
  });

  it('POST /captures completes a matching request', async () => {
    const r = queue.create('http://localhost:5173/jobs');
    queue.acknowledge(r.id);
    const capture = {
      metadata: {
        format: 'viewgraph-v2',
        url: 'http://localhost:5173/jobs',
        timestamp: '2026-04-08T10:00:00Z',
        title: 'Test',
        viewport: { width: 1696, height: 799 },
        stats: { totalNodes: 5 },
      },
      nodes: {},
    };
    const res = await req(port, 'POST', '/captures', capture);
    expect(res.status).toBe(201);
    expect(res.body.requestId).toBe(r.id);
    // Verify request is completed
    const updated = queue.get(r.id);
    expect(updated.status).toBe('completed');
  });

  it('POST /captures rejects invalid JSON', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/captures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not valid json',
    });
    expect(res.status).toBe(400);
  });

  it('POST /captures rejects payload >5MB', async () => {
    const huge = { metadata: { format: 'viewgraph-v2' }, padding: 'x'.repeat(6 * 1024 * 1024) };
    try {
      const res = await fetch(`http://127.0.0.1:${port}/captures`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(huge),
      });
      // If we get a response, it should be 413
      expect(res.status).toBe(413);
    } catch (err) {
      // Connection reset is also valid - server killed the connection
      expect(err.cause?.code).toBe('ECONNRESET');
    }
  });
});
