/**
 * resolve_annotation + get_unresolved MCP tools - Unit Tests
 *
 * Tests resolution workflow: resolve by UUID, validation, backward compat,
 * cross-capture unresolved scan.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register as registerResolve } from '#src/tools/resolve-annotation.js';
import { register as registerUnresolved } from '#src/tools/get-unresolved.js';

/** Helper: create a capture JSON string with annotations. */
function makeCapture(annotations = []) {
  return JSON.stringify({
    metadata: { url: 'http://test', timestamp: '2026-04-09T00:00:00Z', viewport: { width: 1024, height: 768 }, stats: { totalNodes: 1 } },
    nodes: [],
    annotations,
  });
}

describe('resolve_annotation + get_unresolved', () => {
  let capturesDir, cleanup;

  afterEach(async () => {
    if (cleanup) await cleanup();
    if (capturesDir) rmSync(capturesDir, { recursive: true, force: true });
  });

  /** Create a test client with both tools registered. */
  async function setup() {
    capturesDir = path.join(os.tmpdir(), `vg-resolve-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    const indexer = createIndexer();
    const { client, cleanup: c } = await createTestClient((server) => {
      registerResolve(server, indexer, capturesDir);
      registerUnresolved(server, indexer, capturesDir);
    });
    cleanup = c;
    return { client, indexer };
  }

  // -- resolve_annotation --

  it('resolves an annotation by UUID', async () => {
    const { client } = await setup();
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    writeFileSync(path.join(capturesDir, 'test.json'), makeCapture([
      { id: 1, uuid, type: 'element', comment: 'fix this', resolved: false },
    ]));
    const res = await client.callTool({ name: 'resolve_annotation', arguments: {
      filename: 'test.json', annotation_uuid: uuid, action: 'fixed', summary: 'Done',
    } });
    const ann = JSON.parse(res.content[0].text);
    expect(ann.resolved).toBe(true);
    expect(ann.resolution.action).toBe('fixed');
    expect(ann.resolution.summary).toBe('Done');
    expect(ann.resolution.by).toBe('kiro');
    // Verify persisted to disk
    const onDisk = JSON.parse(readFileSync(path.join(capturesDir, 'test.json'), 'utf-8'));
    expect(onDisk.annotations[0].resolved).toBe(true);
  });

  it('returns error for non-existent UUID', async () => {
    const { client } = await setup();
    writeFileSync(path.join(capturesDir, 'test.json'), makeCapture([
      { id: 1, uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', resolved: false },
    ]));
    const res = await client.callTool({ name: 'resolve_annotation', arguments: {
      filename: 'test.json', annotation_uuid: '11111111-2222-3333-4444-555555555555',
      action: 'fixed', summary: 'Done',
    } });
    expect(res.content[0].text).toContain('not found');
    expect(res.isError).toBe(true);
  });

  it('returns error for non-existent file', async () => {
    const { client } = await setup();
    const res = await client.callTool({ name: 'resolve_annotation', arguments: {
      filename: 'nope.json', annotation_uuid: '11111111-2222-3333-4444-555555555555',
      action: 'fixed', summary: 'Done',
    } });
    expect(res.content[0].text).toContain('not found');
    expect(res.isError).toBe(true);
  });

  it('strips HTML from summary', async () => {
    const { client } = await setup();
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    writeFileSync(path.join(capturesDir, 'test.json'), makeCapture([
      { id: 1, uuid, resolved: false },
    ]));
    const res = await client.callTool({ name: 'resolve_annotation', arguments: {
      filename: 'test.json', annotation_uuid: uuid, action: 'fixed',
      summary: '<script>alert("xss")</script>Fixed the font',
    } });
    const ann = JSON.parse(res.content[0].text);
    expect(ann.resolution.summary).toBe('alert("xss")Fixed the font');
  });

  it('includes filesChanged in resolution', async () => {
    const { client } = await setup();
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    writeFileSync(path.join(capturesDir, 'test.json'), makeCapture([
      { id: 1, uuid, resolved: false },
    ]));
    const res = await client.callTool({ name: 'resolve_annotation', arguments: {
      filename: 'test.json', annotation_uuid: uuid, action: 'fixed',
      summary: 'Done', files_changed: ['src/app.css', 'src/index.html'],
    } });
    const ann = JSON.parse(res.content[0].text);
    expect(ann.resolution.filesChanged).toEqual(['src/app.css', 'src/index.html']);
  });

  // -- get_unresolved --

  it('returns unresolved from a single capture', async () => {
    const { client } = await setup();
    writeFileSync(path.join(capturesDir, 'cap1.json'), makeCapture([
      { id: 1, uuid: 'a1', comment: 'open', resolved: false },
      { id: 2, uuid: 'a2', comment: 'done', resolved: true },
      { id: 3, uuid: 'a3', comment: 'also open', resolved: false },
    ]));
    const res = await client.callTool({ name: 'get_unresolved', arguments: { filename: 'cap1.json' } });
    const data = JSON.parse(res.content[0].text);
    expect(data.annotations).toHaveLength(2);
    expect(data.annotations.every((a) => !a.resolved)).toBe(true);
  });

  it('scans all indexed captures when no filename', async () => {
    const { client, indexer } = await setup();
    writeFileSync(path.join(capturesDir, 'a.json'), makeCapture([
      { id: 1, uuid: 'x1', comment: 'open in a', resolved: false },
    ]));
    writeFileSync(path.join(capturesDir, 'b.json'), makeCapture([
      { id: 1, uuid: 'x2', comment: 'open in b', resolved: false },
      { id: 2, uuid: 'x3', comment: 'done in b', resolved: true },
    ]));
    indexer.add('a.json', { url: 'http://a', timestamp: '2026-04-09T00:00:00Z' });
    indexer.add('b.json', { url: 'http://b', timestamp: '2026-04-09T00:01:00Z' });
    const res = await client.callTool({ name: 'get_unresolved', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data.annotations).toHaveLength(2);
    expect(data.summary).toContain('2 unresolved');
  });

  it('returns empty when all resolved', async () => {
    const { client } = await setup();
    writeFileSync(path.join(capturesDir, 'done.json'), makeCapture([
      { id: 1, uuid: 'r1', resolved: true },
    ]));
    const res = await client.callTool({ name: 'get_unresolved', arguments: { filename: 'done.json' } });
    const data = JSON.parse(res.content[0].text);
    expect(data.annotations).toHaveLength(0);
  });

  it('respects limit parameter', async () => {
    const { client } = await setup();
    const anns = Array.from({ length: 10 }, (_, i) => ({ id: i, uuid: `u${i}`, resolved: false }));
    writeFileSync(path.join(capturesDir, 'many.json'), makeCapture(anns));
    const res = await client.callTool({ name: 'get_unresolved', arguments: { filename: 'many.json', limit: 3 } });
    const data = JSON.parse(res.content[0].text);
    expect(data.annotations).toHaveLength(3);
  });

  // -- backward compat --

  it('normalizes old annotations without uuid/resolved fields', async () => {
    const { client } = await setup();
    writeFileSync(path.join(capturesDir, 'old.json'), makeCapture([
      { id: 1, comment: 'old style', nodeIds: [5] },
    ]));
    const res = await client.callTool({ name: 'get_unresolved', arguments: { filename: 'old.json' } });
    const data = JSON.parse(res.content[0].text);
    expect(data.annotations).toHaveLength(1);
    expect(data.annotations[0].uuid).toContain('legacy');
    expect(data.annotations[0].resolved).toBe(false);
  });
});
