/**
 * HTTP Receiver Security Tests
 *
 * Tests shared secret authentication on POST endpoints and
 * write-path validation preventing directory traversal.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHttpReceiver } from '#src/http-receiver.js';
import { createRequestQueue } from '#src/request-queue.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

const SECRET = 'test-secret-token';

/** Helper: HTTP request with optional auth. */
async function req(port, method, urlPath, { body, secret, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };
  if (body) {
    opts.headers['content-type'] = 'application/json';
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  if (secret) opts.headers.authorization = `Bearer ${secret}`;
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, opts);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('HTTP receiver auth', () => {
  let queue, receiver, port, capturesDir;

  beforeEach(async () => {
    capturesDir = path.join(os.tmpdir(), `vg-sec-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    receiver = createHttpReceiver({ queue, capturesDir, port: 0, secret: SECRET });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  it('GET /health works without auth', async () => {
    const res = await req(port, 'GET', '/health');
    expect(res.status).toBe(200);
  });

  it('GET /requests/pending works without auth', async () => {
    const res = await req(port, 'GET', '/requests/pending');
    expect(res.status).toBe(200);
  });

  it('POST /captures rejects without auth', async () => {
    const capture = { metadata: { format: 'viewgraph-v2', url: 'http://localhost', timestamp: '2026-04-08T10:00:00Z' } };
    const res = await req(port, 'POST', '/captures', { body: capture });
    expect(res.status).toBe(401);
  });

  it('POST /captures rejects wrong token', async () => {
    const capture = { metadata: { format: 'viewgraph-v2', url: 'http://localhost', timestamp: '2026-04-08T10:00:00Z' } };
    const res = await req(port, 'POST', '/captures', { body: capture, secret: 'wrong-token' });
    expect(res.status).toBe(401);
  });

  it('POST /captures succeeds with correct token', async () => {
    const capture = {
      metadata: { format: 'viewgraph-v2', url: 'http://localhost', timestamp: '2026-04-08T10:00:00Z', title: 'T', viewport: { width: 800, height: 600 }, stats: { totalNodes: 1 } },
      nodes: {},
    };
    const res = await req(port, 'POST', '/captures', { body: capture, secret: SECRET });
    expect(res.status).toBe(201);
  });

  it('POST /requests/:id/ack rejects without auth', async () => {
    const r = queue.create('http://localhost');
    const res = await req(port, 'POST', `/requests/${r.id}/ack`);
    expect(res.status).toBe(401);
  });

  it('POST /requests/:id/ack succeeds with correct token', async () => {
    const r = queue.create('http://localhost');
    const res = await req(port, 'POST', `/requests/${r.id}/ack`, { secret: SECRET });
    expect(res.status).toBe(200);
  });

  it('POST /snapshots rejects without auth', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html', 'x-capture-filename': 'test' },
      body: '<html></html>',
    });
    expect(res.status).toBe(401);
  });
});

describe('HTTP receiver path validation', () => {
  let queue, receiver, port, capturesDir;

  beforeEach(async () => {
    capturesDir = path.join(os.tmpdir(), `vg-path-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    // No secret - focus on path validation
    receiver = createHttpReceiver({ queue, capturesDir, port: 0 });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  it('capture with normal URL writes to captures dir', async () => {
    const capture = {
      metadata: { format: 'viewgraph-v2', url: 'http://localhost:5173/jobs', timestamp: '2026-04-08T10:00:00Z', title: 'T', viewport: { width: 800, height: 600 }, stats: { totalNodes: 1 } },
      nodes: {},
    };
    const res = await req(port, 'POST', '/captures', { body: capture });
    expect(res.status).toBe(201);
    expect(existsSync(path.join(capturesDir, res.body.filename))).toBe(true);
  });

  it('snapshot with path traversal in filename is sanitized', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html', 'x-capture-filename': '../../../etc/evil' },
      body: '<html>evil</html>',
    });
    expect(res.status).toBe(201);
    // File should NOT be written outside snapshots dir
    expect(existsSync('/etc/evil.html')).toBe(false);
  });
});
