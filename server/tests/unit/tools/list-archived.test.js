/**
 * list_archived MCP Tool - Unit Tests
 *
 * @see server/src/tools/list-archived.js
 * @see server/src/archive.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { createTestClient } from './helpers.js';
import { register } from '#src/tools/list-archived.js';

describe('list_archived via MCP', () => {
  let tmpDir, cleanup;

  afterEach(async () => {
    if (cleanup) await cleanup();
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  async function setup(indexCaptures = []) {
    tmpDir = path.join(os.tmpdir(), `vg-list-archived-${Date.now()}`);
    const capturesDir = path.join(tmpDir, 'captures');
    const archiveDir = path.join(tmpDir, 'archive');
    mkdirSync(capturesDir, { recursive: true });
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(path.join(archiveDir, 'index.json'), JSON.stringify({
      version: 1, lastUpdated: '2026-04-26T00:00:00Z', captures: indexCaptures,
    }));
    const { client, cleanup: c } = await createTestClient((server) => register(server, capturesDir));
    cleanup = c;
    return { client };
  }

  it('(+) returns archived captures from index', async () => {
    const { client } = await setup([
      { originalPath: 'a.json', url: 'http://localhost:3000', timestamp: '2026-04-08T12:00:00Z', annotations: { total: 2, resolved: 2 }, archivedAt: '2026-04-09T00:00:00Z' },
      { originalPath: 'b.json', url: 'http://localhost:3000/dash', timestamp: '2026-04-10T12:00:00Z', annotations: { total: 1, resolved: 1 }, archivedAt: '2026-04-11T00:00:00Z' },
    ]);
    const res = await client.callTool({ name: 'list_archived', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures).toHaveLength(2);
    expect(data.summary).toContain('2 archived');
  });

  it('(+) filters by URL substring', async () => {
    const { client } = await setup([
      { originalPath: 'a.json', url: 'http://localhost:3000', timestamp: '2026-04-08T12:00:00Z' },
      { originalPath: 'b.json', url: 'http://localhost:4000', timestamp: '2026-04-10T12:00:00Z' },
    ]);
    const res = await client.callTool({ name: 'list_archived', arguments: { url_filter: ':3000' } });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures).toHaveLength(1);
    expect(data.captures[0].url).toContain(':3000');
  });

  it('(+) filters by date range', async () => {
    const { client } = await setup([
      { originalPath: 'old.json', url: 'http://test', timestamp: '2026-03-01T00:00:00Z' },
      { originalPath: 'mid.json', url: 'http://test', timestamp: '2026-04-10T00:00:00Z' },
      { originalPath: 'new.json', url: 'http://test', timestamp: '2026-04-20T00:00:00Z' },
    ]);
    const res = await client.callTool({ name: 'list_archived', arguments: { from: '2026-04-01', to: '2026-04-15' } });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures).toHaveLength(1);
    expect(data.captures[0].filename).toBe('mid.json');
  });

  it('(+) returns empty when no archive exists', async () => {
    tmpDir = path.join(os.tmpdir(), `vg-list-archived-empty-${Date.now()}`);
    const capturesDir = path.join(tmpDir, 'captures');
    mkdirSync(capturesDir, { recursive: true });
    // No archive dir at all
    const { client, cleanup: c } = await createTestClient((server) => register(server, capturesDir));
    cleanup = c;
    const res = await client.callTool({ name: 'list_archived', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures).toHaveLength(0);
  });

  it('(+) respects limit', async () => {
    const caps = Array.from({ length: 10 }, (_, i) => ({
      originalPath: `f${i}.json`, url: 'http://test', timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));
    const { client } = await setup(caps);
    const res = await client.callTool({ name: 'list_archived', arguments: { limit: 3 } });
    const data = JSON.parse(res.content[0].text);
    expect(data.captures).toHaveLength(3);
    expect(data.summary).toContain('10 total');
  });
});
