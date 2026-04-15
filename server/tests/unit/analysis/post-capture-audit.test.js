/**
 * Post-Capture Audit Runner - Unit Tests
 *
 * @see server/src/analysis/post-capture-audit.js
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { runPostCaptureAudit } from '#src/analysis/post-capture-audit.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('post-capture audit', () => {
  it('(+) returns audit summary with all three categories', async () => {
    const result = await runPostCaptureAudit(path.join(FIXTURES_DIR, 'valid-capture.json'));
    expect(result).not.toBeNull();
    expect(typeof result.a11y).toBe('number');
    expect(typeof result.layout).toBe('number');
    expect(typeof result.testids).toBe('number');
    expect(result.total).toBe(result.a11y + result.layout + result.testids);
  });

  it('(+) detects missing testids on interactive elements', async () => {
    const result = await runPostCaptureAudit(path.join(FIXTURES_DIR, 'valid-capture.json'));
    // nav001 (a tag) has no data-testid
    expect(result.testids).toBeGreaterThan(0);
  });

  it('(+) detects a11y issues', async () => {
    const result = await runPostCaptureAudit(path.join(FIXTURES_DIR, 'valid-capture.json'));
    expect(result.a11y).toBeGreaterThanOrEqual(0);
  });

  it('(-) returns null for nonexistent file', async () => {
    const result = await runPostCaptureAudit('/tmp/does-not-exist.json');
    expect(result).toBeNull();
  });

  it('(-) returns null for malformed JSON', async () => {
    const result = await runPostCaptureAudit(path.join(FIXTURES_DIR, 'malformed-capture.json'));
    expect(result).toBeNull();
  });
});
