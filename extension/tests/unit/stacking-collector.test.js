/**
 * Stacking Context Collector - Unit Tests
 *
 * Tests stacking context detection across all CSS trigger types
 * and overlap conflict detection between sibling contexts.
 *
 * @see lib/stacking-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectStackingContexts } from '#lib/stacking-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

/** Create an element with given styles and append to parent. */
function el(tag, styles = {}, parent = document.body) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  // jsdom getBoundingClientRect returns zeros - mock it
  e.getBoundingClientRect = () => ({
    left: styles._x || 0, top: styles._y || 0,
    width: styles._w || 100, height: styles._h || 50,
    right: (styles._x || 0) + (styles._w || 100),
    bottom: (styles._y || 0) + (styles._h || 50),
  });
  parent.appendChild(e);
  return e;
}

// ---------------------------------------------------------------------------
// Stacking context detection
// ---------------------------------------------------------------------------

describe('stacking context detection', () => {
  it('(+) detects position:relative + z-index', () => {
    el('div', { position: 'relative', zIndex: '10' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(1);
    expect(contexts[0].trigger).toContain('position:relative');
    expect(contexts[0].zIndex).toBe(10);
  });

  it('(+) detects position:absolute + z-index', () => {
    el('div', { position: 'absolute', zIndex: '5' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(1);
    expect(contexts[0].trigger).toContain('position:absolute');
  });

  it('(+) detects position:fixed', () => {
    el('div', { position: 'fixed' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(1);
    expect(contexts[0].trigger).toBe('position:fixed');
  });

  it('(+) detects position:sticky', () => {
    el('div', { position: 'sticky' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(1);
    expect(contexts[0].trigger).toBe('position:sticky');
  });

  it('(+) detects opacity < 1', () => {
    el('div', { opacity: '0.9' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(1);
    expect(contexts[0].trigger).toContain('opacity');
  });

  it('(-) does not detect opacity = 1', () => {
    el('div', { opacity: '1' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(0);
  });

  it('(-) does not detect position:static (no stacking context)', () => {
    el('div', { position: 'static', zIndex: '10' });
    const { contexts } = collectStackingContexts();
    // position:static with z-index does NOT create stacking context
    expect(contexts.length).toBe(0);
  });

  it('(-) does not detect position:relative without z-index', () => {
    el('div', { position: 'relative' });
    const { contexts } = collectStackingContexts();
    // position:relative with z-index:auto does NOT create stacking context
    // (but fixed/sticky always do)
    expect(contexts.length).toBe(0);
  });

  it('(+) detects multiple contexts', () => {
    el('div', { position: 'relative', zIndex: '1' });
    el('div', { position: 'relative', zIndex: '2' });
    el('div', { opacity: '0.5' });
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(3);
  });

  it('(-) skips invisible elements (zero size)', () => {
    const e = document.createElement('div');
    e.style.position = 'relative';
    e.style.zIndex = '10';
    e.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 });
    document.body.appendChild(e);
    const { contexts } = collectStackingContexts();
    expect(contexts.length).toBe(0);
  });

  it('(+) returns selector with tag and class', () => {
    const e = el('div', { position: 'fixed' });
    e.className = 'modal overlay';
    const { contexts } = collectStackingContexts();
    expect(contexts[0].selector).toBe('div.modal.overlay');
  });

  it('(+) returns selector with tag and id', () => {
    const e = el('div', { position: 'fixed' });
    e.id = 'header';
    const { contexts } = collectStackingContexts();
    expect(contexts[0].selector).toBe('div#header');
  });
});

// ---------------------------------------------------------------------------
// Overlap conflict detection
// ---------------------------------------------------------------------------

describe('stacking conflict detection', () => {
  it('(+) detects z-index conflict between overlapping siblings', () => {
    // Two siblings with different z-index that overlap
    el('div', { position: 'relative', zIndex: '10', _x: 0, _y: 0, _w: 100, _h: 100 });
    el('div', { position: 'relative', zIndex: '1', _x: 50, _y: 0, _w: 100, _h: 100 });
    const { issues } = collectStackingContexts();
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('z-index-conflict');
    expect(issues[0].higher.zIndex).toBe(10);
    expect(issues[0].lower.zIndex).toBe(1);
  });

  it('(-) no conflict when siblings do not overlap', () => {
    el('div', { position: 'relative', zIndex: '10', _x: 0, _y: 0, _w: 50, _h: 50 });
    el('div', { position: 'relative', zIndex: '1', _x: 200, _y: 200, _w: 50, _h: 50 });
    const { issues } = collectStackingContexts();
    expect(issues.length).toBe(0);
  });

  it('(-) no conflict when z-indices are equal', () => {
    el('div', { position: 'relative', zIndex: '5', _x: 0, _y: 0, _w: 100, _h: 100 });
    el('div', { position: 'relative', zIndex: '5', _x: 50, _y: 0, _w: 100, _h: 100 });
    const { issues } = collectStackingContexts();
    expect(issues.length).toBe(0);
  });

  it('(-) no conflict between non-siblings', () => {
    const parent1 = el('div', {});
    const parent2 = el('div', {});
    el('div', { position: 'relative', zIndex: '10', _x: 0, _y: 0, _w: 100, _h: 100 }, parent1);
    el('div', { position: 'relative', zIndex: '1', _x: 0, _y: 0, _w: 100, _h: 100 }, parent2);
    const { issues } = collectStackingContexts();
    expect(issues.length).toBe(0);
  });

  it('(-) no conflict when z-index is auto', () => {
    el('div', { position: 'fixed', _x: 0, _y: 0, _w: 100, _h: 100 });
    el('div', { position: 'fixed', _x: 0, _y: 0, _w: 100, _h: 100 });
    const { issues } = collectStackingContexts();
    // fixed creates stacking context but z-index is auto - no numeric comparison
    expect(issues.length).toBe(0);
  });
});
