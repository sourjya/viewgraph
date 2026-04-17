/**
 * Tests for URL trust classification (F17).
 * @see extension/lib/constants.js - classifyTrust, isLocalUrl
 */

import { describe, it, expect } from 'vitest';
import { classifyTrust } from '#lib/constants.js';

describe('classifyTrust', () => {
  // ──────────────────────────────────────────────
  // Trusted: localhost and file URLs
  // ──────────────────────────────────────────────

  it('(+) localhost is trusted', () => {
    const r = classifyTrust('http://localhost:3000/page');
    expect(r.level).toBe('trusted');
  });

  it('(+) 127.0.0.1 is trusted', () => {
    const r = classifyTrust('http://127.0.0.1:8080/app');
    expect(r.level).toBe('trusted');
  });

  it('(+) 0.0.0.0 is trusted', () => {
    const r = classifyTrust('http://0.0.0.0:3000/');
    expect(r.level).toBe('trusted');
  });

  it('(+) [::1] IPv6 loopback is trusted', () => {
    const r = classifyTrust('http://[::1]:3000/');
    expect(r.level).toBe('trusted');
  });

  it('(+) file:// URL is trusted', () => {
    const r = classifyTrust('file:///home/user/project/index.html');
    expect(r.level).toBe('trusted');
  });

  it('(+) WSL file URL is trusted', () => {
    const r = classifyTrust('file://wsl.localhost/Ubuntu/home/user/index.html');
    expect(r.level).toBe('trusted');
  });

  // ──────────────────────────────────────────────
  // Configured: matches trustedPatterns
  // ──────────────────────────────────────────────

  it('(+) URL matching trustedPatterns is configured', () => {
    const r = classifyTrust('https://staging.myapp.com/login', ['staging.myapp.com']);
    expect(r.level).toBe('configured');
    expect(r.reason).toBe('staging.myapp.com');
  });

  it('(+) pattern match is substring-based', () => {
    const r = classifyTrust('https://preview.myapp.com:8080/page', ['myapp.com']);
    expect(r.level).toBe('configured');
  });

  // ──────────────────────────────────────────────
  // Untrusted: everything else
  // ──────────────────────────────────────────────

  it('(+) remote URL without pattern is untrusted', () => {
    const r = classifyTrust('https://evil.com/page');
    expect(r.level).toBe('untrusted');
  });

  it('(+) remote URL with non-matching pattern is untrusted', () => {
    const r = classifyTrust('https://evil.com/page', ['myapp.com']);
    expect(r.level).toBe('untrusted');
  });

  it('(-) empty trustedPatterns means remote is untrusted', () => {
    const r = classifyTrust('https://example.com', []);
    expect(r.level).toBe('untrusted');
  });

  // ──────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────

  it('(-) localhost always trusted even with trustedPatterns', () => {
    const r = classifyTrust('http://localhost:3000', ['other.com']);
    expect(r.level).toBe('trusted');
  });

  it('(-) invalid URL returns untrusted', () => {
    const r = classifyTrust('not-a-url');
    expect(r.level).toBe('untrusted');
  });

  it('(-) empty URL returns untrusted', () => {
    const r = classifyTrust('');
    expect(r.level).toBe('untrusted');
  });

  it('(+) result always has level and reason', () => {
    for (const url of ['http://localhost', 'https://evil.com', 'file:///test']) {
      const r = classifyTrust(url);
      expect(r).toHaveProperty('level');
      expect(r).toHaveProperty('reason');
    }
  });

  it('(-) port-only pattern does NOT confer trust', () => {
    // urlPatterns use port matching for routing, but trustedPatterns should not
    const r = classifyTrust('https://evil.com:3000', ['localhost:3000']);
    // 'localhost:3000' doesn't substring-match 'evil.com:3000'
    expect(r.level).toBe('untrusted');
  });
});
