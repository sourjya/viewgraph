/**
 * Inspector - Unit Tests
 *
 * Tests the pure logic functions: breadcrumb builder, metadata line,
 * and best selector picker. DOM interaction (overlay, freeze, action
 * bar) requires a real browser and is covered by E2E tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildBreadcrumb, buildMetaLine, bestSelector } from '../../lib/inspector.js';

let restore;

beforeEach(() => {
  document.body.innerHTML = '';
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 20, width: 200, height: 50, right: 210, bottom: 70 };
  };
  restore = () => { Element.prototype.getBoundingClientRect = original; };
});

afterEach(() => restore());

// ---------------------------------------------------------------------------
// buildBreadcrumb
// ---------------------------------------------------------------------------

describe('buildBreadcrumb', () => {
  it('shows tag for a direct child of body', () => {
    document.body.innerHTML = '<div>Hello</div>';
    expect(buildBreadcrumb(document.querySelector('div'))).toBe('div');
  });

  it('shows nested path with > separator', () => {
    document.body.innerHTML = '<nav><ul><li>Item</li></ul></nav>';
    const li = document.querySelector('li');
    expect(buildBreadcrumb(li)).toBe('nav > ul > li');
  });

  it('includes classes in segments', () => {
    document.body.innerHTML = '<div class="card-group"><div class="card p-4">X</div></div>';
    const card = document.querySelector('.card');
    expect(buildBreadcrumb(card)).toBe('div.card-group > div.card.p-4');
  });

  it('includes id in segments', () => {
    document.body.innerHTML = '<div id="main"><span>X</span></div>';
    const span = document.querySelector('span');
    expect(buildBreadcrumb(span)).toBe('div#main > span');
  });

  it('truncates long paths from the left', () => {
    document.body.innerHTML = '<div class="very-long-class-name"><div class="another-long-class"><div class="deep-nested"><span>X</span></div></div></div>';
    const span = document.querySelector('span');
    const result = buildBreadcrumb(span, 40);
    expect(result).toContain('... >');
    expect(result).toContain('span');
  });
});

// ---------------------------------------------------------------------------
// buildMetaLine
// ---------------------------------------------------------------------------

describe('buildMetaLine', () => {
  it('includes testid when present', () => {
    document.body.innerHTML = '<button data-testid="submit">Go</button>';
    expect(buildMetaLine(document.querySelector('button'))).toContain('testid: submit');
  });

  it('includes role when present', () => {
    document.body.innerHTML = '<div role="navigation">Nav</div>';
    expect(buildMetaLine(document.querySelector('div'))).toContain('role: navigation');
  });

  it('includes aria-label when present', () => {
    document.body.innerHTML = '<button aria-label="Close">X</button>';
    expect(buildMetaLine(document.querySelector('button'))).toContain('aria: Close');
  });

  it('always includes dimensions', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(buildMetaLine(document.querySelector('div'))).toContain('200x50');
  });

  it('separates multiple attributes with pipe', () => {
    document.body.innerHTML = '<button data-testid="btn" role="button">X</button>';
    const meta = buildMetaLine(document.querySelector('button'));
    expect(meta).toContain('|');
  });
});

// ---------------------------------------------------------------------------
// bestSelector
// ---------------------------------------------------------------------------

describe('bestSelector', () => {
  it('prefers data-testid', () => {
    document.body.innerHTML = '<button id="btn" data-testid="submit">Go</button>';
    expect(bestSelector(document.querySelector('button'))).toBe('[data-testid="submit"]');
  });

  it('falls back to id', () => {
    document.body.innerHTML = '<div id="main">X</div>';
    expect(bestSelector(document.querySelector('div'))).toBe('#main');
  });

  it('builds structural CSS selector as last resort', () => {
    document.body.innerHTML = '<div><span>A</span><span>B</span></div>';
    const second = document.querySelectorAll('span')[1];
    const sel = bestSelector(second);
    expect(sel).toContain('span');
  });
});
