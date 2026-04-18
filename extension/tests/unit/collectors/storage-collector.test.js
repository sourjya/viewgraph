/**
 * Storage Collector - Unit Tests
 *
 * @see extension/lib/collectors/storage-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectStorage } from '#lib/collectors/storage-collector.js';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('collectStorage', () => {
  it('(+) captures localStorage entries', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'en');
    const result = collectStorage();
    expect(result.localStorage).toHaveLength(2);
    expect(result.localStorage.find((e) => e.key === 'theme').value).toBe('dark');
    expect(result.summary.local).toBe(2);
  });

  it('(+) captures sessionStorage entries', () => {
    sessionStorage.setItem('tab', 'settings');
    const result = collectStorage();
    expect(result.sessionStorage).toHaveLength(1);
    expect(result.summary.session).toBe(1);
  });

  it('(+) redacts values with sensitive key names', () => {
    localStorage.setItem('auth_token', 'secret123');
    localStorage.setItem('api_key', 'abc');
    localStorage.setItem('session_id', 'xyz');
    const result = collectStorage();
    for (const entry of result.localStorage) {
      expect(entry.value).toBe('[REDACTED]');
    }
  });

  it('(+) truncates long values', () => {
    localStorage.setItem('data', 'x'.repeat(500));
    const result = collectStorage();
    expect(result.localStorage[0].value.length).toBeLessThan(210);
    expect(result.localStorage[0].value).toContain('...');
  });

  it('(-) returns empty arrays when storage is empty', () => {
    const result = collectStorage();
    expect(result.localStorage).toHaveLength(0);
    expect(result.sessionStorage).toHaveLength(0);
    expect(result.summary.local).toBe(0);
  });

  it('(+) does not redact normal keys', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('feature_flags', '{"beta":true}');
    const result = collectStorage();
    expect(result.localStorage.find((e) => e.key === 'theme').value).toBe('dark');
    expect(result.localStorage.find((e) => e.key === 'feature_flags').value).toContain('beta');
  });
});
