/**
 * HTTP Receiver - Unit Tests
 *
 * Tests the lightweight HTTP server that enables the browser extension
 * to poll for capture requests and submit completed captures.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHttpReceiver } from '#src/http-receiver.js';
import { createRequestQueue } from '#src/request-queue.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

/** Helper: make an HTTP request to the receiver. */
async function req(port, method, urlPath, body, headers, rawBody) {
  const opts = { method, headers: { ...headers } };
  if (body) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (rawBody) {
    opts.body = rawBody;
  }
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, opts);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('HTTP receiver', () => {
  let queue, receiver, port, capturesDir;

  beforeEach(async () => {
    const rootDir = path.join(os.tmpdir(), `vg-test-${Date.now()}`);
    capturesDir = path.join(rootDir, 'captures');
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

  it('GET /health returns capturesDir and writable status', async () => {
    const res = await req(port, 'GET', '/health');
    expect(res.body).toHaveProperty('capturesDir');
    expect(res.body).toHaveProperty('dirExists');
    expect(res.body).toHaveProperty('writable');
    expect(typeof res.body.dirExists).toBe('boolean');
    expect(typeof res.body.writable).toBe('boolean');
  });

  it('GET /info returns capturesDir and projectRoot', async () => {
    const res = await req(port, 'GET', '/info');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('capturesDir');
    expect(res.body).toHaveProperty('projectRoot');
    expect(typeof res.body.capturesDir).toBe('string');
    expect(typeof res.body.projectRoot).toBe('string');
  });

  it('GET /info derives projectRoot from capturesDir', async () => {
    const res = await req(port, 'GET', '/info');
    // capturesDir is an absolute path; projectRoot should be its ancestor
    expect(res.body.capturesDir).toContain(res.body.projectRoot);
  });

  it('GET /info returns absolute capturesDir path', async () => {
    const res = await req(port, 'GET', '/info');
    expect(path.isAbsolute(res.body.capturesDir)).toBe(true);
    expect(path.isAbsolute(res.body.projectRoot)).toBe(true);
  });

  it('(-) GET /info with .viewgraph/captures path derives correct projectRoot', async () => {
    // Create a receiver with a .viewgraph/captures path to test the walk-up logic
    const projectDir = path.join(os.tmpdir(), `vg-proj-${Date.now()}`);
    const vgCaptures = path.join(projectDir, '.viewgraph', 'captures');
    mkdirSync(vgCaptures, { recursive: true });
    const q2 = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    const r2 = createHttpReceiver({ queue: q2, capturesDir: vgCaptures, port: 0 });
    const p2 = await r2.start();
    try {
      const res = await req(p2, 'GET', '/info');
      expect(res.status).toBe(200);
      expect(res.body.capturesDir).toBe(vgCaptures);
      expect(res.body.projectRoot).toBe(projectDir);
    } finally {
      await r2.stop();
      rmSync(projectDir, { recursive: true, force: true });
    }
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

  // --- Snapshot endpoints ---

  it('POST /snapshots writes HTML file to snapshots/ dir', async () => {
    const html = '<!DOCTYPE html><html><body><p>Hello</p></body></html>';
    const res = await req(port, 'POST', '/snapshots', null, {
      'content-type': 'text/html',
      'x-capture-filename': 'viewgraph-localhost-2026-04-08-120612',
    }, html);
    expect(res.status).toBe(201);
    expect(res.body.filename).toBe('viewgraph-localhost-2026-04-08-120612.html');
    const filePath = path.join(capturesDir, '..', 'snapshots', res.body.filename);
    const written = readFileSync(filePath, 'utf-8');
    expect(written).toContain('<p>Hello</p>');
  });

  it('POST /snapshots rejects missing filename header', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html' },
      body: '<html></html>',
    });
    expect(res.status).toBe(400);
  });

  it('POST /snapshots rejects payload >10MB', async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/snapshots`, {
        method: 'POST',
        headers: { 'content-type': 'text/html', 'x-capture-filename': 'test' },
        body: 'x'.repeat(11 * 1024 * 1024),
      });
      expect(res.status).toBe(413);
    } catch (err) {
      expect(err.cause?.code).toBe('ECONNRESET');
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-project routing - x-captures-dir header + allowedDirs
// ---------------------------------------------------------------------------

describe('multi-project capture routing', () => {
  let queue, capturesDir, altDir, receiver, port;

  beforeEach(async () => {
    const rootDir = path.join(os.tmpdir(), `vg-route-${Date.now()}`);
    capturesDir = path.join(rootDir, 'default-captures');
    altDir = path.join(rootDir, 'project-b', '.viewgraph', 'captures');
    mkdirSync(capturesDir, { recursive: true });
    mkdirSync(altDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    receiver = createHttpReceiver({ queue, capturesDir, allowedDirs: [capturesDir, altDir], port: 0 });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(path.dirname(capturesDir), { recursive: true, force: true });
  });

  const capture = (url = 'http://localhost:5173/login') => ({
    metadata: { url, timestamp: new Date().toISOString(), viewport: { width: 1024, height: 768 } },
    nodes: [],
  });

  it('writes to default capturesDir when no header', async () => {
    const res = await req(port, 'POST', '/captures', capture());
    expect(res.status).toBe(201);
    expect(res.body.filename).toBeTruthy();
    // File should exist in default dir
    const filePath = path.join(capturesDir, res.body.filename);
    expect(() => readFileSync(filePath)).not.toThrow();
  });

  it('writes to override dir when x-captures-dir matches allowedDirs', async () => {
    const res = await req(port, 'POST', '/captures', capture(), { 'x-captures-dir': altDir });
    expect(res.status).toBe(201);
    const filePath = path.join(altDir, res.body.filename);
    expect(() => readFileSync(filePath)).not.toThrow();
  });

  it('rejects x-captures-dir not in allowedDirs', async () => {
    const badDir = path.join(os.tmpdir(), 'not-allowed');
    const res = await req(port, 'POST', '/captures', capture(), { 'x-captures-dir': badDir });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('allowedDirs');
  });

  it('rejects path traversal in x-captures-dir', async () => {
    const traversal = path.join(altDir, '..', '..', 'etc');
    const res = await req(port, 'POST', '/captures', capture(), { 'x-captures-dir': traversal });
    expect(res.status).toBe(403);
  });

  it('rejects relative path in x-captures-dir', async () => {
    const res = await req(port, 'POST', '/captures', capture(), { 'x-captures-dir': '.viewgraph/captures' });
    expect(res.status).toBe(403);
  });

  it('different URLs route to different dirs based on header', async () => {
    const res1 = await req(port, 'POST', '/captures', capture('http://localhost:3000'), {});
    const res2 = await req(port, 'POST', '/captures', capture('http://localhost:5173'), { 'x-captures-dir': altDir });
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    // res1 in default, res2 in altDir
    expect(() => readFileSync(path.join(capturesDir, res1.body.filename))).not.toThrow();
    expect(() => readFileSync(path.join(altDir, res2.body.filename))).not.toThrow();
  });

  it('auto-creates subdirectory within allowed parent', async () => {
    const subDir = path.join(altDir, 'sub');
    const res = await req(port, 'POST', '/captures', capture(), { 'x-captures-dir': subDir });
    expect(res.status).toBe(201);
    expect(() => readFileSync(path.join(subDir, res.body.filename))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Config - absolute vs relative capturesDir
// ---------------------------------------------------------------------------

import { resolveConfig } from '#src/config.js';

describe('config capturesDir resolution', () => {
  it('resolves relative path to absolute', () => {
    const config = resolveConfig('/home/user/project');
    expect(path.isAbsolute(config.capturesDir)).toBe(true);
  });

  it('default capturesDir is always in allowedDirs', () => {
    const config = resolveConfig('/home/user/project');
    expect(config.allowedDirs).toContain(config.capturesDir);
  });

  it('env var override produces absolute path', () => {
    const orig = process.env.VIEWGRAPH_CAPTURES_DIR;
    process.env.VIEWGRAPH_CAPTURES_DIR = '/tmp/test-captures';
    const config = resolveConfig('/home/user/project');
    expect(config.capturesDir).toBe('/tmp/test-captures');
    if (orig) { process.env.VIEWGRAPH_CAPTURES_DIR = orig; } else { delete process.env.VIEWGRAPH_CAPTURES_DIR; }
  });

  it('relative env var resolves against cwd', () => {
    const orig = process.env.VIEWGRAPH_CAPTURES_DIR;
    process.env.VIEWGRAPH_CAPTURES_DIR = '.viewgraph/captures';
    const config = resolveConfig('/home/user/project');
    expect(path.isAbsolute(config.capturesDir)).toBe(true);
    expect(config.capturesDir).toContain('.viewgraph/captures');
    if (orig) { process.env.VIEWGRAPH_CAPTURES_DIR = orig; } else { delete process.env.VIEWGRAPH_CAPTURES_DIR; }
  });
});

// ---------------------------------------------------------------------------
// Auth removed for beta (ADR-010) - verify no auth required
// ---------------------------------------------------------------------------

describe('HTTP no-auth (ADR-010)', () => {
  let queue, receiver, port, capturesDir;

  beforeEach(async () => {
    const rootDir = path.join(os.tmpdir(), `vg-noauth-${Date.now()}`);
    capturesDir = path.join(rootDir, 'captures');
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    receiver = createHttpReceiver({ queue, capturesDir, port: 0 });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(capturesDir, { recursive: true, force: true });
  });

  it('(+) POST /captures succeeds without any auth header', async () => {
    const capture = { metadata: { url: 'http://test', timestamp: new Date().toISOString(), viewport: { width: 1024, height: 768 } }, nodes: [] };
    const res = await req(port, 'POST', '/captures', capture);
    expect(res.status).toBe(201);
  });

  it('(+) GET /health succeeds without auth', async () => {
    const res = await req(port, 'GET', '/health');
    expect(res.status).toBe(200);
  });

  it('(+) POST /captures with random Authorization header still succeeds', async () => {
    const capture = { metadata: { url: 'http://test', timestamp: new Date().toISOString(), viewport: { width: 1024, height: 768 } }, nodes: [] };
    const res = await req(port, 'POST', '/captures', capture, { authorization: 'Bearer random-garbage' });
    expect(res.status).toBe(201);
  });
});

describe('config endpoints', () => {
  let queue, receiver, port, capturesDir, rootDir;

  beforeEach(async () => {
    rootDir = path.join(os.tmpdir(), `vg-cfg-${Date.now()}`);
    capturesDir = path.join(rootDir, 'captures');
    mkdirSync(capturesDir, { recursive: true });
    queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    receiver = createHttpReceiver({ queue, capturesDir, port: 0 });
    port = await receiver.start();
  });

  afterEach(async () => {
    await receiver.stop();
    rmSync(rootDir, { recursive: true, force: true });
  });

  it('(+) GET /config returns empty object when no config file', async () => {
    const res = await req(port, 'GET', '/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('(+) PUT /config creates config and returns merged result', async () => {
    const res = await req(port, 'PUT', '/config', { autoAudit: true });
    expect(res.status).toBe(200);
    expect(res.body.autoAudit).toBe(true);
  });

  it('(+) PUT /config merges with existing config', async () => {
    await req(port, 'PUT', '/config', { autoAudit: false, urlPatterns: ['localhost:3000'] });
    const res = await req(port, 'PUT', '/config', { smartSuggestions: true });
    expect(res.status).toBe(200);
    expect(res.body.autoAudit).toBe(false);
    expect(res.body.smartSuggestions).toBe(true);
    expect(res.body.urlPatterns).toEqual(['localhost:3000']);
  });

  it('(+) GET /config returns previously written config', async () => {
    await req(port, 'PUT', '/config', { autoAudit: true, baselineAutoCompare: false });
    const res = await req(port, 'GET', '/config');
    expect(res.status).toBe(200);
    expect(res.body.autoAudit).toBe(true);
    expect(res.body.baselineAutoCompare).toBe(false);
  });

  it('(-) PUT /config rejects invalid JSON', async () => {
    const opts = { method: 'PUT', headers: { 'content-type': 'application/json' }, body: 'not json{' };
    const res = await fetch(`http://localhost:${port}/config`, opts);
    expect(res.status).toBe(400);
  });

  it('(+) config persists to disk as JSON file', async () => {
    await req(port, 'PUT', '/config', { autoAudit: true });
    const configFile = path.join(rootDir, 'config.json');
    const raw = readFileSync(configFile, 'utf-8');
    const config = JSON.parse(raw);
    expect(config.autoAudit).toBe(true);
  });
});

// ──────────────────────────────────────────────
// F16: Zero-config install
// ──────────────────────────────────────────────

describe('zero-config defaults', () => {
  it('(+) GET /info returns empty urlPatterns when no config.json', async () => {
    const projectDir = path.join(os.tmpdir(), `vg-zc-${Date.now()}`);
    const vgCaptures = path.join(projectDir, '.viewgraph', 'captures');
    mkdirSync(vgCaptures, { recursive: true });
    const q = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    const r = createHttpReceiver({ queue: q, capturesDir: vgCaptures, port: 0 });
    const p = await r.start();
    try {
      const res = await req(p, 'GET', '/info');
      expect(res.status).toBe(200);
      expect(res.body.urlPatterns).toEqual([]);
    } finally {
      r.stop();
    }
  });

  it('(+) POST /captures auto-generates config.json on first capture', async () => {
    const projectDir = path.join(os.tmpdir(), `vg-al-${Date.now()}`);
    const vgCaptures = path.join(projectDir, '.viewgraph', 'captures');
    mkdirSync(vgCaptures, { recursive: true });
    const q = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    const r = createHttpReceiver({ queue: q, capturesDir: vgCaptures, port: 0 });
    const p = await r.start();
    try {
      const capture = { metadata: { url: 'http://localhost:3000/page', timestamp: new Date().toISOString() }, nodes: [] };
      const res = await req(p, 'POST', '/captures', capture);
      expect(res.status).toBe(201);
      const configPath = path.join(projectDir, '.viewgraph', 'config.json');
      expect(existsSync(configPath)).toBe(true);
      const cfg = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(cfg.urlPatterns).toContain('localhost:3000');
    } finally {
      r.stop();
    }
  });

  it('(-) POST /captures does not overwrite existing config.json', async () => {
    const projectDir = path.join(os.tmpdir(), `vg-no-${Date.now()}`);
    const vgCaptures = path.join(projectDir, '.viewgraph', 'captures');
    mkdirSync(vgCaptures, { recursive: true });
    const configPath = path.join(projectDir, '.viewgraph', 'config.json');
    writeFileSync(configPath, JSON.stringify({ urlPatterns: ['myapp.com'], custom: true }));
    const q = createRequestQueue({ maxSize: 10, ttlMs: 60000 });
    const r = createHttpReceiver({ queue: q, capturesDir: vgCaptures, port: 0 });
    const p = await r.start();
    try {
      const capture = { metadata: { url: 'http://localhost:5000/page', timestamp: new Date().toISOString() }, nodes: [] };
      await req(p, 'POST', '/captures', capture);
      const cfg = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(cfg.urlPatterns).toContain('myapp.com');
      expect(cfg.custom).toBe(true);
      expect(cfg.urlPatterns).not.toContain('localhost:5000');
    } finally {
      r.stop();
    }
  });
});
