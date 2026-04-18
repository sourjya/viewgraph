/**
 * check_consistency + check_annotation_status - MCP Tool Tests
 *
 * @see src/tools/check-consistency.js
 * @see src/tools/check-annotation-status.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient, FIXTURES_DIR } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register as registerConsistency } from '#src/tools/check-consistency.js';
import { register as registerAnnotationStatus } from '#src/tools/check-annotation-status.js';

describe('check_consistency via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) compares two captures', async () => {
    const indexer = createIndexer();
    indexer.add('annotated-status-test.json', { url: 'http://localhost:3000/dashboard', timestamp: '2026-04-11T12:00:00.000Z' });
    indexer.add('latest-capture.json', { url: 'http://localhost:3000/dashboard', timestamp: '2026-04-11T13:00:00.000Z' });
    const { client, cleanup: c } = await createTestClient((s) => registerConsistency(s, indexer, FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'check_consistency', arguments: { filenames: ['annotated-status-test.json', 'latest-capture.json'] } });
    const data = JSON.parse(result.content[0].text);
    expect(data.summary).toBeTruthy();
    expect(data.matchedElements).toBeGreaterThanOrEqual(0);
  });

  it('(-) errors with fewer than 2 captures', async () => {
    const { client, cleanup: c } = await createTestClient((s) => registerConsistency(s, createIndexer(), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'check_consistency', arguments: { filenames: ['valid-capture.json'] } });
    expect(result.isError).toBe(true);
  });
});

describe('check_annotation_status via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('(+) detects still-present and missing elements', async () => {
    const indexer = createIndexer();
    indexer.add('annotated-status-test.json', { url: 'http://localhost:3000/dashboard', timestamp: '2026-04-11T12:00:00.000Z' });
    indexer.add('latest-capture.json', { url: 'http://localhost:3000/dashboard', timestamp: '2026-04-11T13:00:00.000Z' });
    const { client, cleanup: c } = await createTestClient((s) => registerAnnotationStatus(s, indexer, FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'check_annotation_status', arguments: {
      annotated_capture: 'annotated-status-test.json',
      latest_capture: 'latest-capture.json',
    } });
    const data = JSON.parse(result.content[0].text);
    // ann-001 (button.submit-btn) should be missing (button removed)
    // ann-002 (input#email) should be still-present
    // ann-003 should be already-resolved
    expect(data.counts.elementMissing).toBe(1);
    expect(data.counts.stillPresent).toBe(1);
    expect(data.counts.alreadyResolved).toBe(1);
  });

  it('(-) handles capture with no annotations', async () => {
    const indexer = createIndexer();
    indexer.add('valid-capture.json', { url: 'http://localhost:8040/projects', timestamp: '2026-04-08T06:08:15.214Z' });
    indexer.add('latest-capture.json', { url: 'http://localhost:3000/dashboard', timestamp: '2026-04-11T13:00:00.000Z' });
    const { client, cleanup: c } = await createTestClient((s) => registerAnnotationStatus(s, indexer, FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'check_annotation_status', arguments: {
      annotated_capture: 'valid-capture.json',
      latest_capture: 'latest-capture.json',
    } });
    expect(result.content[0].text).toContain('No annotations');
  });
});
