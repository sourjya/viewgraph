/**
 * DOM Traverser - Unit Tests
 *
 * Tests DOM tree walking, element extraction, and relation detection.
 * Uses jsdom environment (configured in vitest.config.js).
 *
 * Note: jsdom has limited CSS support - getBoundingClientRect returns
 * zeros, getComputedStyle returns defaults. Tests focus on structural
 * correctness rather than visual properties.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { traverseDOM } from '#lib/capture/traverser.js';

/**
 * jsdom returns zero-size bounding boxes, causing isVisible to skip
 * all elements. Stub getBoundingClientRect on all elements to return
 * a non-zero rect so the traverser processes them.
 */
function stubBoundingRects() {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 };
  };
  return () => { Element.prototype.getBoundingClientRect = original; };
}

describe('traverseDOM', () => {
  let restoreRects;

  beforeEach(() => {
    document.body.innerHTML = '';
    restoreRects = stubBoundingRects();
  });

  afterEach(() => {
    restoreRects();
  });

  it('returns elements and relations arrays', () => {
    document.body.innerHTML = '<div>Hello</div>';
    const result = traverseDOM();
    expect(result).toHaveProperty('elements');
    expect(result).toHaveProperty('relations');
    expect(Array.isArray(result.elements)).toBe(true);
  });

  it('assigns unique nid values', () => {
    document.body.innerHTML = '<div><span>A</span><span>B</span></div>';
    const { elements } = traverseDOM();
    const nids = elements.map((e) => e.nid);
    // All nids should be unique positive integers
    expect(new Set(nids).size).toBe(nids.length);
    nids.forEach((n) => expect(n).toBeGreaterThan(0));
  });

  it('extracts tag names', () => {
    document.body.innerHTML = '<nav><a href="#">Link</a></nav>';
    const { elements } = traverseDOM();
    const tags = elements.map((e) => e.tag);
    expect(tags).toContain('nav');
    expect(tags).toContain('a');
  });

  it('extracts data-testid', () => {
    document.body.innerHTML = '<button data-testid="submit-btn">Go</button>';
    const { elements } = traverseDOM();
    const btn = elements.find((e) => e.tag === 'button');
    expect(btn.testid).toBe('submit-btn');
  });

  it('extracts aria-label', () => {
    document.body.innerHTML = '<button aria-label="Close dialog">X</button>';
    const { elements } = traverseDOM();
    const btn = elements.find((e) => e.tag === 'button');
    expect(btn.ariaLabel).toBe('Close dialog');
  });

  it('extracts role attribute', () => {
    document.body.innerHTML = '<div role="navigation">Nav</div>';
    const { elements } = traverseDOM();
    const nav = elements.find((e) => e.role === 'navigation');
    expect(nav).toBeDefined();
  });

  it('marks interactive elements', () => {
    document.body.innerHTML = '<button>Click</button><div>Static</div>';
    const { elements } = traverseDOM();
    const btn = elements.find((e) => e.tag === 'button');
    const div = elements.find((e) => e.tag === 'div');
    expect(btn.isInteractive).toBe(true);
    expect(div.isInteractive).toBe(false);
  });

  it('marks semantic elements', () => {
    document.body.innerHTML = '<nav>Menu</nav><div>Content</div>';
    const { elements } = traverseDOM();
    const nav = elements.find((e) => e.tag === 'nav');
    const div = elements.find((e) => e.tag === 'div');
    expect(nav.isSemantic).toBe(true);
    expect(div.isSemantic).toBe(false);
  });

  it('builds parent-child nid references', () => {
    document.body.innerHTML = '<div id="parent"><span id="child">Text</span></div>';
    const { elements } = traverseDOM();
    const parent = elements.find((e) => e.htmlId === 'parent');
    const child = elements.find((e) => e.htmlId === 'child');
    expect(child.parentNid).toBe(parent.nid);
    expect(parent.childNids).toContain(child.nid);
  });

  it('generates alias from testid', () => {
    document.body.innerHTML = '<button data-testid="save-btn">Save</button>';
    const { elements } = traverseDOM();
    const btn = elements.find((e) => e.tag === 'button');
    expect(btn.alias).toBe('button:save-btn');
  });

  it('generates alias from id when no testid', () => {
    document.body.innerHTML = '<div id="main-content">Content</div>';
    const { elements } = traverseDOM();
    const div = elements.find((e) => e.htmlId === 'main-content');
    expect(div.alias).toBe('div:main-content');
  });

  it('builds selector preferring testid', () => {
    document.body.innerHTML = '<button data-testid="go" id="btn1">Go</button>';
    const { elements } = traverseDOM();
    const btn = elements.find((e) => e.tag === 'button');
    expect(btn.selector).toBe('[data-testid="go"]');
  });

  it('collects data- and aria- attributes', () => {
    document.body.innerHTML = '<div data-custom="val" aria-expanded="true">X</div>';
    const { elements } = traverseDOM();
    const div = elements.find((e) => e.tag === 'div');
    expect(div.attributes['data-custom']).toBe('val');
    expect(div.attributes['aria-expanded']).toBe('true');
  });

  it('extracts label-for relations', () => {
    document.body.innerHTML = '<label for="email">Email</label><input id="email" type="email">';
    const { elements, relations } = traverseDOM();
    const label = elements.find((e) => e.tag === 'label');
    const input = elements.find((e) => e.tag === 'input');
    const rel = relations.find((r) => r.type === 'labelFor');
    expect(rel).toBeDefined();
    expect(rel.source).toBe(label.nid);
    expect(rel.target).toBe(input.nid);
  });

  it('handles empty body gracefully', () => {
    document.body.innerHTML = '';
    const { elements } = traverseDOM();
    // With stubbed bounding rects, body itself is visible but has no children
    const nonBody = elements.filter((e) => e.tag !== 'body');
    expect(nonBody).toHaveLength(0);
  });
});
