/**
 * Selector Builder - Unit Tests
 *
 * @see lib/selector.js
 */

import { describe, it, expect } from 'vitest';
import { ATTR, buildSelector } from '#lib/selector.js';

/** Create a minimal element mock. */
function el(tag, attrs = {}) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'id') e.id = v;
    else e.setAttribute(k, v);
  }
  return e;
}

describe('selector', () => {
  it('(+) ATTR constant is data-vg-annotate', () => {
    expect(ATTR).toBe('data-vg-annotate');
  });

  it('(+) prefers data-testid when present', () => {
    expect(buildSelector(el('button', { 'data-testid': 'submit-btn' }))).toBe('button[data-testid="submit-btn"]');
  });

  it('(+) falls back to id when no testid', () => {
    expect(buildSelector(el('div', { id: 'main' }))).toBe('div#main');
  });

  it('(+) falls back to tag.class when no testid or id', () => {
    const result = buildSelector(el('span', { className: 'badge primary' }));
    expect(result).toBe('span.badge.primary');
  });

  it('(+) limits to 2 classes', () => {
    const result = buildSelector(el('div', { className: 'a b c d e' }));
    expect(result).toBe('div.a.b');
  });

  it('(+) falls back to bare tag when no attributes', () => {
    expect(buildSelector(el('section'))).toBe('section');
  });

  it('(+) testid takes priority over id', () => {
    const result = buildSelector(el('input', { 'data-testid': 'email', id: 'email-field' }));
    expect(result).toBe('input[data-testid="email"]');
  });

  it('(-) handles element with empty className', () => {
    expect(buildSelector(el('div', { className: '' }))).toBe('div');
  });

  it('(-) filters out long class names (>25 chars)', () => {
    const result = buildSelector(el('div', { className: 'short abcdefghijklmnopqrstuvwxyz1234' }));
    expect(result).toBe('div.short');
  });

  it('(-) filters out underscore-prefixed classes', () => {
    const result = buildSelector(el('div', { className: '_internal visible' }));
    expect(result).toBe('div.visible');
  });
});
