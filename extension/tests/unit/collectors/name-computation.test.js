/**
 * Accessible Name Computation - Unit Tests
 *
 * Tests the heuristic W3C accname algorithm for buttons, inputs,
 * images, aria-label, and elements with no computable name.
 *
 * @see lib/collectors/name-computation.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeAccessibleName } from '#lib/collectors/name-computation.js';

// jsdom lacks CSS.escape - polyfill for label-for resolution
if (typeof CSS === 'undefined') globalThis.CSS = {};
if (!CSS.escape) CSS.escape = (v) => v;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('computeAccessibleName', () => {
  it('(+) returns text content for button', () => {
    document.body.innerHTML = '<button>Submit</button>';
    const btn = document.querySelector('button');
    const { name, source } = computeAccessibleName(btn);
    expect(name).toBe('Submit');
    expect(source).toBe('contents');
  });

  it('(+) returns label-for for input with associated label', () => {
    document.body.innerHTML = '<label for="email">Email address</label><input id="email" type="text">';
    const input = document.querySelector('input');
    const { name, source } = computeAccessibleName(input);
    expect(name).toBe('Email address');
    expect(source).toBe('label-for');
  });

  it('(+) returns alt text for img', () => {
    document.body.innerHTML = '<img alt="Company logo" src="logo.png">';
    const img = document.querySelector('img');
    const { name, source } = computeAccessibleName(img);
    expect(name).toBe('Company logo');
    expect(source).toBe('alt');
  });

  it('(+) returns aria-label when present', () => {
    document.body.innerHTML = '<div aria-label="Close dialog">X</div>';
    const el = document.querySelector('div');
    const { name, source } = computeAccessibleName(el);
    expect(name).toBe('Close dialog');
    expect(source).toBe('aria-label');
  });

  it('(-) returns empty name for element with no computable name', () => {
    document.body.innerHTML = '<div></div>';
    const el = document.querySelector('div');
    const { name, source } = computeAccessibleName(el);
    expect(name).toBe('');
    expect(source).toBe('none');
  });
});
