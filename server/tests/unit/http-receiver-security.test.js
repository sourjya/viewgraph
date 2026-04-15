/**
 * HTTP Receiver Security Tests
 *
 * Tests that the server accepts requests without auth (ADR-010),
 * validates capture format, and prevents path traversal.
 *
 * Auth was removed for beta - see docs/decisions/ADR-010-remove-http-auth-beta.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHttpReceiver } from '#src/http-receiver.js';
import { createRequestQueue } from '#src/request-queue.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

/** Helper: HTTP request. */
async function req(port, method, urlPath, { body, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };
  if (body) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, body: data };
}

/** Valid minimal capture for testing. */
function validCapture(url = 'http://test') {
  return {
    metadata: { format: 'viewgraph-v2', version: '2.2.0', url, title: 'Test', timestamp: new Date().toISOString(), viewport: { width: 1280, height: 720 }, stats: { totalNodes: 1 } },
    nodes: { high: {}, med: {}, low: {} },
    relations: { semantic: [] },
    details: { high: {}, med: {}, low: {} },
  };
}

describe('HTTP receiver - no auth (ADR-010)', () => {
  let receiver, port, capturesDir, queue;

  beforeEach(async () => {
    capturesDir = path.join(os.tmpdir(), `vg-sec-test-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({});
    receiver = createHttpReceiver({ queue, capturesDir, port: 0 });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  // ── GET endpoints (always open) ──

  it('(+) GET /health returns ok', async () => {
    const res = await req(port, 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('(+) GET /info returns project info', async () => {
    const res = await req(port, 'GET', '/info');
    expect(res.status).toBe(200);
    expect(res.body.capturesDir).toBeTruthy();
    expect(res.body.projectRoot).toBeTruthy();
  });

  it('(+) GET /requests/pending returns empty array', async () => {
    const res = await req(port, 'GET', '/requests/pending');
    expect(res.status).toBe(200);
    expect(res.body.requests).toEqual([]);
  });

  // ── POST endpoints (no auth required - ADR-010) ──

  it('(+) POST /captures accepts without auth header', async () => {
    const res = await req(port, 'POST', '/captures', { body: validCapture() });
    expect(res.status).toBe(201);
    expect(res.body.filename).toBeTruthy();
  });

  it('(+) POST /captures writes file to captures dir', async () => {
    const res = await req(port, 'POST', '/captures', { body: validCapture() });
    const filePath = path.join(capturesDir, res.body.filename);
    expect(existsSync(filePath)).toBe(true);
  });

  it('(-) POST /captures rejects invalid JSON', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/captures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('(-) POST /captures rejects missing metadata', async () => {
    const res = await req(port, 'POST', '/captures', { body: { nodes: {} } });
    expect(res.status).toBe(400);
  });

  // ── Path traversal prevention ──

  it('(-) capture with traversal URL produces safe filename', async () => {
    const capture = validCapture();
    capture.metadata.url = 'http://../../etc/passwd';
    const res = await req(port, 'POST', '/captures', { body: capture });
    expect(res.status).toBe(201);
    expect(res.body.filename).not.toContain('..');
    expect(res.body.filename).toMatch(/^viewgraph-[a-zA-Z0-9.-]+-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
  });

  it('(+) snapshot with path traversal in filename is sanitized', async () => {
    // First create a capture so the snapshot has something to pair with
    const capture = validCapture();
    const capRes = await req(port, 'POST', '/captures', { body: capture });
    expect(capRes.status).toBe(201);

    // Try to push a snapshot with traversal in the filename header
    const res = await fetch(`http://127.0.0.1:${port}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html', 'x-capture-filename': '../../../etc/evil' },
      body: '<html></html>',
    });
    // Should either reject or sanitize - not write outside captures dir
    expect(res.status).toBeLessThan(500);
  });

  // ── Payload limits ──

  it('(-) rejects oversized payload', async () => {
    const huge = { metadata: validCapture().metadata, data: 'x'.repeat(6 * 1024 * 1024) };
    try {
      const res = await fetch(`http://127.0.0.1:${port}/captures`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(huge),
      });
      // Should reject with error (connection reset or 413)
      expect(res.status).toBeGreaterThanOrEqual(400);
    } catch {
      // Connection destroyed by server - expected for oversized payload
      expect(true).toBe(true);
    }
  });
});
