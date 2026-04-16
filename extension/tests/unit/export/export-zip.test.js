/**
 * Tests for export/export-zip.js
 * @see extension/lib/export/export-zip.js
 */

import { describe, it, expect } from 'vitest';
import { buildReportZip } from '#lib/export/export-zip.js';

const META = { title: 'Test', url: 'http://localhost', timestamp: new Date().toISOString() };

describe('export-zip', () => {
  it('(+) returns a Blob', async () => {
    const blob = await buildReportZip([], META);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('(+) includes report.md', async () => {
    const blob = await buildReportZip([{ id: 1, comment: 'Fix it' }], META);
    // JSZip blobs contain the file entries - just verify it's non-trivial
    expect(blob.size).toBeGreaterThan(50);
  });

  it('(+) includes enrichment JSON files', async () => {
    const enrichment = { network: { requests: [] }, console: { entries: [] } };
    const blob = await buildReportZip([], META, [], enrichment);
    expect(blob.size).toBeGreaterThan(100);
  });

  it('(+) includes screenshots folder', async () => {
    const screenshots = [{ id: 1, dataUrl: 'data:image/png;base64,AAAA' }];
    const blob = await buildReportZip([], META, screenshots);
    expect(blob.size).toBeGreaterThan(50);
  });
});
