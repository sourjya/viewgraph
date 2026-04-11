/**
 * find_source - MCP Tool Integration Tests
 *
 * Tests the find_source tool via MCP protocol. Uses a temporary project
 * directory with mock source files to verify search behavior.
 *
 * @see src/tools/find-source.js
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/find-source.js';

let projectRoot;
let capturesDir;

beforeAll(async () => {
  projectRoot = await mkdtemp(path.join(os.tmpdir(), 'vg-find-source-'));
  capturesDir = path.join(projectRoot, '.viewgraph', 'captures');
  await mkdir(capturesDir, { recursive: true });
  await mkdir(path.join(projectRoot, 'src'), { recursive: true });

  await writeFile(path.join(projectRoot, 'src', 'Button.tsx'), [
    'export function Button() {',
    '  return <button data-testid="submit-btn" aria-label="Submit form">Submit</button>;',
    '}',
  ].join('\n'));
});

afterAll(async () => {
  await rm(projectRoot, { recursive: true, force: true });
});

describe('find_source via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) finds source by testid', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer(), capturesDir));
    cleanup = c;
    const result = await client.callTool({ name: 'find_source', arguments: { testid: 'submit-btn' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].file).toContain('Button.tsx');
    expect(data.results[0].confidence).toBe('high');
  });

  it('(+) finds source by aria_label', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer(), capturesDir));
    cleanup = c;
    const result = await client.callTool({ name: 'find_source', arguments: { aria_label: 'Submit form' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].confidence).toBe('high');
  });

  it('(-) returns suggestion when no match found', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer(), capturesDir));
    cleanup = c;
    const result = await client.callTool({ name: 'find_source', arguments: { testid: 'nonexistent' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.suggestion).toBeTruthy();
  });

  it('(-) returns error when no query provided', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer(), capturesDir));
    cleanup = c;
    const result = await client.callTool({ name: 'find_source', arguments: {} });
    expect(result.isError).toBe(true);
  });
});
