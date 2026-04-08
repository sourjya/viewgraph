/**
 * Tests for ViewGraph v2 parser.
 * Covers parseMetadata, parseCapture, and parseSummary across valid,
 * annotated, and malformed fixtures.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { parseMetadata, parseCapture, parseSummary } from '#src/parsers/viewgraph-v2.js';
import { FORMAT_VERSION } from '#src/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, '..', 'fixtures');

async function loadFixture(name) {
  return readFile(path.join(fixtures, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// parseMetadata
// ---------------------------------------------------------------------------

describe('parseMetadata', () => {
  it('extracts metadata from a valid capture', async () => {
    const json = await loadFixture('valid-capture.json');
    const result = parseMetadata(json);
    expect(result.ok).toBe(true);
    expect(result.data.url).toBe('http://localhost:8040/projects');
    expect(result.data.title).toBe('Projects - AI Video Editor');
    expect(result.data.timestamp).toBe('2026-04-08T06:08:15.214Z');
    expect(result.data.nodeCount).toBe(12);
    expect(result.data.captureMode).toBe('sifr-capture');
    expect(result.data.hasAnnotations).toBe(false);
  });

  it('detects annotations in annotated capture', async () => {
    const json = await loadFixture('annotated-capture.json');
    const result = parseMetadata(json);
    expect(result.ok).toBe(true);
    expect(result.data.hasAnnotations).toBe(true);
    expect(result.data.captureMode).toBe('review');
  });

  it('returns error for malformed JSON', async () => {
    const json = await loadFixture('malformed-capture.json');
    const result = parseMetadata(json);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for JSON missing METADATA section', () => {
    const result = parseMetadata('{"foo": "bar"}');
    expect(result.ok).toBe(false);
  });

  it('validates format version', async () => {
    const json = await loadFixture('valid-capture.json');
    const result = parseMetadata(json);
    expect(result.data.format).toBe(FORMAT_VERSION);
  });
});

// ---------------------------------------------------------------------------
// parseCapture
// ---------------------------------------------------------------------------

describe('parseCapture', () => {
  it('parses all sections from a valid capture', async () => {
    const json = await loadFixture('valid-capture.json');
    const result = parseCapture(json);
    expect(result.ok).toBe(true);
    expect(result.data.metadata).toBeDefined();
    expect(result.data.nodes).toBeDefined();
    expect(result.data.summary).toBeDefined();
    expect(result.data.relations).toBeDefined();
    expect(result.data.details).toBeDefined();
  });

  it('includes annotations when present', async () => {
    const json = await loadFixture('annotated-capture.json');
    const result = parseCapture(json);
    expect(result.ok).toBe(true);
    expect(result.data.annotations).toHaveLength(2);
    expect(result.data.annotations[0].comment).toContain('pagination');
  });

  it('returns null annotations when not present', async () => {
    const json = await loadFixture('valid-capture.json');
    const result = parseCapture(json);
    expect(result.ok).toBe(true);
    expect(result.data.annotations).toBeNull();
  });

  it('returns error for malformed JSON', async () => {
    const json = await loadFixture('malformed-capture.json');
    const result = parseCapture(json);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseSummary
// ---------------------------------------------------------------------------

describe('parseSummary', () => {
  it('extracts summary data for get_page_summary', async () => {
    const json = await loadFixture('valid-capture.json');
    const result = parseSummary(json);
    expect(result.ok).toBe(true);
    expect(result.data.url).toBe('http://localhost:8040/projects');
    expect(result.data.title).toBe('Projects - AI Video Editor');
    expect(result.data.viewport).toEqual({ width: 1696, height: 799 });
    expect(result.data.layout).toBe('single-column with header nav and data table');
    expect(result.data.elementCounts).toEqual({ high: 2, med: 7, low: 3, total: 12 });
    expect(result.data.clusterCount).toBe(3);
    expect(result.data.clusters).toHaveLength(3);
  });

  it('returns error for malformed JSON', async () => {
    const json = await loadFixture('malformed-capture.json');
    const result = parseSummary(json);
    expect(result.ok).toBe(false);
  });
});
