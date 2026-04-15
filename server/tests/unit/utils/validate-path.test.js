/**
 * Tests for validate-path.js
 *
 * Security-critical module that prevents path traversal in MCP tool inputs.
 * Every capture filename from user input passes through this function.
 *
 * @see server/src/utils/validate-path.js
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { validateCapturePath } from '#src/utils/validate-path.js';

const CAPTURES_DIR = '/home/user/project/.viewgraph/captures';

describe('validate-path', () => {
  // ── Positive cases ──────────────────────────────────────────────

  it('(+) resolves a simple filename', () => {
    const result = validateCapturePath('viewgraph-localhost-2026-04-08.json', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'viewgraph-localhost-2026-04-08.json'));
  });

  it('(+) resolves filename with hyphens and dots', () => {
    const result = validateCapturePath('viewgraph-my-app.example.com-2026-04-08T120612.json', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'viewgraph-my-app.example.com-2026-04-08T120612.json'));
  });

  it('(+) strips directory prefix and uses basename only', () => {
    const result = validateCapturePath('subdir/capture.json', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'capture.json'));
  });

  // ── Path traversal attacks ──────────────────────────────────────

  it('(-) blocks ../ traversal', () => {
    const result = validateCapturePath('../../../etc/passwd', CAPTURES_DIR);
    // basename strips to 'passwd', which resolves inside captures dir
    expect(result).toBe(path.join(CAPTURES_DIR, 'passwd'));
    expect(result.startsWith(path.resolve(CAPTURES_DIR))).toBe(true);
  });

  it('(-) blocks ../../ with filename', () => {
    const result = validateCapturePath('../../secret.json', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'secret.json'));
  });

  it('(-) blocks absolute path on Linux', () => {
    const result = validateCapturePath('/etc/passwd', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'passwd'));
  });

  it('(-) blocks deeply nested traversal', () => {
    const result = validateCapturePath('a/b/c/d/../../../../etc/shadow', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'shadow'));
  });

  // ── Edge cases ──────────────────────────────────────────────────

  it('(edge) handles empty string', () => {
    // path.basename('') returns '', path.resolve(dir, '') returns dir
    const result = validateCapturePath('', CAPTURES_DIR);
    expect(result.startsWith(path.resolve(CAPTURES_DIR))).toBe(true);
  });

  it('(edge) handles filename with spaces', () => {
    const result = validateCapturePath('my capture file.json', CAPTURES_DIR);
    expect(result).toBe(path.join(CAPTURES_DIR, 'my capture file.json'));
  });

  it('(edge) handles dot-only filename', () => {
    const result = validateCapturePath('.', CAPTURES_DIR);
    expect(result.startsWith(path.resolve(CAPTURES_DIR))).toBe(true);
  });

  it('(edge) handles double-dot filename', () => {
    // basename('..') is '..' which resolves outside captures dir - should throw
    expect(() => validateCapturePath('..', CAPTURES_DIR)).toThrow('Path traversal');
  });

  it('(edge) handles null bytes in filename', () => {
    // Null bytes could trick path resolution in some systems
    const result = validateCapturePath('capture\x00.json', CAPTURES_DIR);
    expect(result.startsWith(path.resolve(CAPTURES_DIR))).toBe(true);
  });

  it('(edge) handles URL-encoded traversal', () => {
    const result = validateCapturePath('..%2F..%2Fetc%2Fpasswd', CAPTURES_DIR);
    expect(result.startsWith(path.resolve(CAPTURES_DIR))).toBe(true);
  });

  it('(edge) handles backslash traversal (Windows-style)', () => {
    const result = validateCapturePath('..\\..\\secret.json', CAPTURES_DIR);
    expect(result.startsWith(path.resolve(CAPTURES_DIR))).toBe(true);
  });
});
