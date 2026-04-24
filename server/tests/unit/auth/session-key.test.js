/**
 * Session Key Tests
 * @see server/src/auth/session-key.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateSessionKey, readSessionKey } from '#src/auth/session-key.js';
import { mkdtempSync, rmSync, existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let testDir;

beforeEach(() => { testDir = mkdtempSync(join(tmpdir(), 'vg-key-')); });
afterEach(() => { rmSync(testDir, { recursive: true, force: true }); });

describe('generateSessionKey', () => {
  it('(+) creates a 64-char hex file', () => {
    const key = generateSessionKey(testDir);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    const file = join(testDir, '.session-key');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf-8')).toBe(key);
  });

  it('(+) sets file permissions to 0o600', () => {
    generateSessionKey(testDir);
    const file = join(testDir, '.session-key');
    const mode = statSync(file).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('(+) generates different key each time', () => {
    const key1 = generateSessionKey(testDir);
    const key2 = generateSessionKey(testDir);
    expect(key1).not.toBe(key2);
  });
});

describe('readSessionKey', () => {
  it('(+) reads the generated key', () => {
    const written = generateSessionKey(testDir);
    const read = readSessionKey(testDir);
    expect(read).toBe(written);
  });

  it('(-) returns null if file missing', () => {
    expect(readSessionKey(testDir)).toBeNull();
  });
});
