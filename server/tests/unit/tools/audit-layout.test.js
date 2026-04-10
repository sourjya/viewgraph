/**
 * audit_layout - MCP Tool Integration Tests
 *
 * Tests the audit_layout tool via MCP InMemoryTransport.
 * Verifies layout issue detection and error handling.
 *
 * @see server/src/tools/audit-layout.js
 * @see .kiro/specs/audit-layout/requirements.md FR-4
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/audit-layout.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('audit_layout via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns structured result with overflows, overlaps, viewportOverflows, summary', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_layout', arguments: { filename: 'valid-capture.json' } });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty('overflows');
    expect(data).toHaveProperty('overlaps');
    expect(data).toHaveProperty('viewportOverflows');
    expect(data).toHaveProperty('summary');
    expect(Array.isArray(data.overflows)).toBe(true);
    expect(Array.isArray(data.overlaps)).toBe(true);
    expect(Array.isArray(data.viewportOverflows)).toBe(true);
  });

  it('summary counts match array lengths', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_layout', arguments: { filename: 'valid-capture.json' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.summary.overflows).toBe(data.overflows.length);
    expect(data.summary.overlaps).toBe(data.overlaps.length);
    expect(data.summary.viewportOverflows).toBe(data.viewportOverflows.length);
  });

  it('(-) returns error for missing file', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_layout', arguments: { filename: 'nonexistent.json' } });
    expect(result.isError).toBe(true);
  });

  it('(-) returns error for invalid filename', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_layout', arguments: { filename: '../../../etc/passwd' } });
    expect(result.isError).toBe(true);
  });
});
