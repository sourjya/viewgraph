/**
 * HMAC Signing Tests
 * @see server/src/auth/hmac.js
 */

import { describe, it, expect } from 'vitest';
import { sign, verify, hashBody } from '#src/auth/hmac.js';

const SECRET = 'a'.repeat(64);

describe('sign', () => {
  it('(+) produces consistent output for same inputs', () => {
    const sig1 = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    const sig2 = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    expect(sig1).toBe(sig2);
  });

  it('(+) produces different output for different inputs', () => {
    const sig1 = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    const sig2 = sign(SECRET, 'POST', '/captures', '1713700000001', 'abc');
    expect(sig1).not.toBe(sig2);
  });

  it('(+) returns hex string', () => {
    const sig = sign(SECRET, 'GET', '/info', '1713700000000', '');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('verify', () => {
  it('(+) returns true for valid signature', () => {
    const sig = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    expect(verify(SECRET, 'POST', '/captures', '1713700000000', 'abc', sig)).toBe(true);
  });

  it('(-) returns false for tampered signature', () => {
    const sig = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    expect(verify(SECRET, 'POST', '/captures', '1713700000000', 'abc', sig.replace('a', 'b'))).toBe(false);
  });

  it('(-) returns false for wrong timestamp', () => {
    const sig = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    expect(verify(SECRET, 'POST', '/captures', '9999999999999', 'abc', sig)).toBe(false);
  });

  it('(-) returns false for wrong method', () => {
    const sig = sign(SECRET, 'POST', '/captures', '1713700000000', 'abc');
    expect(verify(SECRET, 'GET', '/captures', '1713700000000', 'abc', sig)).toBe(false);
  });
});

describe('hashBody', () => {
  it('(+) produces SHA256 hex', () => {
    const hash = hashBody('{"test":true}');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('(+) empty body produces consistent hash', () => {
    expect(hashBody('')).toBe(hashBody(''));
  });

  it('(+) different bodies produce different hashes', () => {
    expect(hashBody('a')).not.toBe(hashBody('b'));
  });
});
