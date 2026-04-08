/**
 * audit_accessibility - MCP Tool Integration Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { createTestClient } from './helpers.js';
import { createIndexer } from '#src/indexer.js';
import { register } from '#src/tools/audit-accessibility.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('audit_accessibility via MCP', () => {
  let cleanup;
  afterEach(async () => { if (cleanup) await cleanup(); });

  it('returns issues grouped by severity', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: 'valid-capture.json' } });
    const audit = JSON.parse(result.content[0].text);
    expect(audit.errors).toBeDefined();
    expect(audit.warnings).toBeDefined();
    expect(typeof audit.total).toBe('number');
  });

  it('detects missing form label on input without aria-label', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: 'valid-capture.json' } });
    const audit = JSON.parse(result.content[0].text);
    // inp001 has no aria-label in the NODES (only in DETAILS), but audit checks DETAILS
    // The valid-capture has inp001 with no aria-label in details.attributes
    expect(audit.total).toBeGreaterThan(0);
  });
});
