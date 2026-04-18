/**
 * CSS Custom Properties Collector - Unit Tests
 *
 * @see extension/lib/collectors/css-custom-properties-collector.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { collectCSSCustomProperties } from '#lib/collectors/css-custom-properties-collector.js';

let styleEl;

beforeEach(() => {
  styleEl = document.createElement('style');
  document.head.appendChild(styleEl);
});

afterEach(() => {
  styleEl.remove();
});

describe('collectCSSCustomProperties', () => {
  it('(+) captures :root custom properties', () => {
    styleEl.textContent = ':root { --primary: #3b82f6; --bg: #1e1e2e; }';
    const result = collectCSSCustomProperties();
    expect(result.root.length).toBeGreaterThanOrEqual(2);
    expect(result.root.find((p) => p.name === '--primary')).toBeTruthy();
    expect(result.summary.rootCount).toBeGreaterThanOrEqual(2);
  });

  it('(+) captures scoped custom properties', () => {
    styleEl.textContent = '.card { --card-bg: #fff; --card-radius: 8px; }';
    const result = collectCSSCustomProperties();
    const cardScope = result.scopes.find((s) => s.selector === '.card');
    expect(cardScope).toBeTruthy();
    expect(cardScope.properties.find((p) => p.name === '--card-bg')).toBeTruthy();
  });

  it('(-) returns empty when no custom properties exist', () => {
    styleEl.textContent = 'body { color: red; }';
    const result = collectCSSCustomProperties();
    expect(result.root).toHaveLength(0);
    expect(result.summary.rootCount).toBe(0);
  });

  it('(+) summary includes scope count', () => {
    styleEl.textContent = ':root { --a: 1; } .btn { --b: 2; } .card { --c: 3; }';
    const result = collectCSSCustomProperties();
    expect(result.summary.scopeCount).toBeGreaterThanOrEqual(3);
    expect(result.summary.totalDeclarations).toBeGreaterThanOrEqual(3);
  });
});
