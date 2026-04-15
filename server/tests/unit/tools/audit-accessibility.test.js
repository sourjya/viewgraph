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

  it('(+) returns issues grouped by severity', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: 'valid-capture.json' } });
    const audit = JSON.parse(result.content[0].text);
    expect(audit.errors).toBeDefined();
    expect(audit.warnings).toBeDefined();
    expect(typeof audit.total).toBe('number');
  });

  it('(+) detects missing form label on input without aria-label', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: 'valid-capture.json' } });
    const audit = JSON.parse(result.content[0].text);
    expect(audit.total).toBeGreaterThan(0);
  });

  it('(-) returns error for nonexistent file', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: 'does-not-exist.json' } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/not found|Error/i);
  });

  it('(-) returns error for path traversal attempt', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: '../../../etc/passwd' } });
    expect(result.isError).toBe(true);
  });

  it('(edge) handles capture with no interactive elements', async () => {
    const { client, cleanup: c } = await createTestClient((s) => register(s, createIndexer({ maxCaptures: 10 }), FIXTURES_DIR));
    cleanup = c;
    const result = await client.callTool({ name: 'audit_accessibility', arguments: { filename: 'subtree-capture.json' } });
    // Should return a valid audit even if no issues found
    expect(result.isError).toBeFalsy();
  });
});
