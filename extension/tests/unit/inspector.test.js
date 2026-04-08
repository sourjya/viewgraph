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

  it('shows full path for nav elements with multiple classes', () => {
    document.body.innerHTML = '<ul class="header-nav d-flex"><li class="nav-item"><button class="btn btn-success">Talk</button></li></ul>';
    const btn = document.querySelector('button');
    const result = buildBreadcrumb(btn);
    expect(result).toBe('ul.header-nav.d-flex > li.nav-item > button.btn.btn-success');
    expect(result).not.toContain('...');
  });

  it('never truncates with ellipsis', () => {
    document.body.innerHTML = '<div class="very-long-class-name"><div class="another-long-class"><div class="yet-another-long"><div class="deep-nested"><span>X</span></div></div></div></div>';
    const span = document.querySelector('span');
    const result = buildBreadcrumb(span);
    expect(result).not.toContain('...');
    expect(result).toContain('span');
    expect(result).toContain('div.very-long-class-name');
  });

  it('always ends with the target element (tail visible)', () => {
    document.body.innerHTML = '<div id="root"><div class="bg-light"><div class="container"><div class="row"><div class="col-md-6">X</div></div></div></div></div>';
    const target = document.querySelector('.col-md-6');
    const result = buildBreadcrumb(target);
    expect(result).toMatch(/div\.col-md-6$/);
  });

  it('does not include body or html in path', () => {
    document.body.innerHTML = '<div>X</div>';
    const result = buildBreadcrumb(document.querySelector('div'));
    expect(result).not.toContain('body');
    expect(result).not.toContain('html');
  });

  it('limits to 2 classes per segment', () => {
    document.body.innerHTML = '<div class="a b c d e">X</div>';
    const result = buildBreadcrumb(document.querySelector('div'));
    // Should have at most 2 classes (a.b), not all 5
    const dotCount = (result.match(/\./g) || []).length;
    expect(dotCount).toBeLessThanOrEqual(2);
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

  it('shows testid: none when missing', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(buildMetaLine(document.querySelector('div'))).toContain('testid: none');
  });

  it('shows role: none when missing', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(buildMetaLine(document.querySelector('div'))).toContain('role: none');
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

  it('does not return testid selector when testid is absent', () => {
    document.body.innerHTML = '<div id="main">X</div>';
    const sel = bestSelector(document.querySelector('div'));
    expect(sel).not.toContain('data-testid');
  });

  it('does not return id selector when id is absent', () => {
    document.body.innerHTML = '<div><span>X</span></div>';
    const sel = bestSelector(document.querySelector('span'));
    expect(sel).not.toContain('#');
  });

  it('structural selector distinguishes siblings of same tag', () => {
    document.body.innerHTML = '<ul><li>A</li><li>B</li><li>C</li></ul>';
    const second = document.querySelectorAll('li')[1];
    const sel = bestSelector(second);
    expect(sel).toContain('nth-child');
  });
});

describe('buildMetaLine formatting', () => {
  it('shows all attributes when present', () => {
    document.body.innerHTML = '<button data-testid="save" role="button" aria-label="Save changes">S</button>';
    const meta = buildMetaLine(document.querySelector('button'));
    expect(meta).toContain('testid: save');
    expect(meta).toContain('role: button');
    expect(meta).toContain('aria: Save changes');
    expect(meta).not.toContain('none');
  });

  it('shows none for all missing attributes', () => {
    document.body.innerHTML = '<div>X</div>';
    const meta = buildMetaLine(document.querySelector('div'));
    expect(meta).toContain('testid: none');
    expect(meta).toContain('role: none');
    expect(meta).not.toContain('aria:');
  });

  it('does not show aria: none when aria-label is absent', () => {
    document.body.innerHTML = '<div>X</div>';
    const meta = buildMetaLine(document.querySelector('div'));
    expect(meta).not.toContain('aria: none');
    expect(meta).not.toContain('aria:');
  });
});
