/**
 * HTTP Receiver - Resolved Annotations Endpoint Tests
 *
 * Tests the GET /annotations/resolved?url= endpoint used by the extension
 * to sync resolution state from the server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { createHttpReceiver } from '#src/http-receiver.js';
import { createRequestQueue } from '#src/request-queue.js';
import { createIndexer } from '#src/indexer.js';

describe('GET /annotations/resolved', () => {
  let capturesDir, receiver, port, indexer;

  beforeEach(async () => {
    capturesDir = path.join(os.tmpdir(), `vg-sync-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    indexer = createIndexer();
    const queue = createRequestQueue();
    port = 19800 + Math.floor(Math.random() * 100);
    receiver = createHttpReceiver({ queue, capturesDir, port, indexer });
    await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  /** Helper: create a capture file and register in indexer. */
  function addCapture(filename, url, annotations) {
    writeFileSync(path.join(capturesDir, filename), JSON.stringify({
      metadata: { url, timestamp: new Date().toISOString(), viewport: { width: 1024, height: 768 }, stats: { totalNodes: 1 } },
      nodes: [],
      annotations,
    }));
    indexer.add(filename, { url, timestamp: new Date().toISOString() });
  }

  it('returns resolved annotations for a matching URL', async () => {
    addCapture('test.json', 'http://localhost:5173/page', [
      { uuid: 'aaa', resolved: true, resolution: { by: 'kiro', action: 'fixed', summary: 'Done' } },
      { uuid: 'bbb', resolved: false },
    ]);
    const res = await fetch(`http://localhost:${port}/annotations/resolved?url=localhost:5173`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.resolved).toHaveLength(1);
    expect(data.resolved[0].uuid).toBe('aaa');
    expect(data.resolved[0].resolution.action).toBe('fixed');
  });

  it('returns empty when no resolved annotations', async () => {
    addCapture('test.json', 'http://localhost:5173', [
      { uuid: 'ccc', resolved: false },
    ]);
    const res = await fetch(`http://localhost:${port}/annotations/resolved?url=localhost:5173`);
    const data = await res.json();
    expect(data.resolved).toHaveLength(0);
  });

  it('returns 400 when url parameter is missing', async () => {
    const res = await fetch(`http://localhost:${port}/annotations/resolved`);
    expect(res.status).toBe(400);
  });

  it('returns empty when no captures match URL', async () => {
    addCapture('test.json', 'http://other-site.com', [
      { uuid: 'ddd', resolved: true, resolution: { by: 'kiro', action: 'fixed' } },
    ]);
    const res = await fetch(`http://localhost:${port}/annotations/resolved?url=localhost:5173`);
    const data = await res.json();
    expect(data.resolved).toHaveLength(0);
  });
});

describe('request_capture guidance in pending requests', () => {
  let receiver, port;

  beforeEach(async () => {
    const capturesDir = path.join(os.tmpdir(), `vg-req-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    const queue = createRequestQueue();
    queue.create('http://localhost:5173', { guidance: 'Check the header font' });
    port = 19900 + Math.floor(Math.random() * 100);
    receiver = createHttpReceiver({ queue, capturesDir, port });
    await receiver.start();
  });

  afterEach(async () => { await receiver.stop(); });

  it('includes guidance in pending requests', async () => {
    const res = await fetch(`http://localhost:${port}/requests/pending`);
    const data = await res.json();
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0].guidance).toBe('Check the header font');
  });
});
