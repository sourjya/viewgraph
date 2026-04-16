/**
 * Subtree Capture - Unit Tests
 *
 * @see lib/subtree-capture.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { captureSubtree } from '#lib/capture/subtree-capture.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('captureSubtree', () => {
  it('(+) captures element and children', () => {
    document.body.innerHTML = '<div id="root"><button>Click</button><p>Text</p></div>';
    const root = document.getElementById('root');
    const result = captureSubtree(root);
    expect(result.elementCount).toBe(3); // div + button + p
    expect(result.rootSelector).toBe('div#root');
  });

  it('(+) includes computed styles', () => {
    document.body.innerHTML = '<div id="root"><span>Hello</span></div>';
    const root = document.getElementById('root');
    const result = captureSubtree(root);
    expect(result.elements[0].styles).toHaveProperty('display');
    expect(result.elements[0].styles).toHaveProperty('color');
  });

  it('(+) marks interactive elements', () => {
    document.body.innerHTML = '<div><button data-testid="btn">Go</button></div>';
    const root = document.querySelector('div');
    const result = captureSubtree(root);
    const btn = result.elements.find((e) => e.tag === 'button');
    expect(btn.interactive).toBe(true);
    expect(btn.testid).toBe('btn');
  });

  it('(+) respects maxDepth', () => {
    document.body.innerHTML = '<div><div><div><div><span>Deep</span></div></div></div></div>';
    const root = document.querySelector('div');
    const result = captureSubtree(root, { maxDepth: 2 });
    expect(result.elementCount).toBeLessThan(5);
  });

  it('(+) includes attributes', () => {
    document.body.innerHTML = '<div><a href="/page" role="link">Link</a></div>';
    const root = document.querySelector('div');
    const result = captureSubtree(root);
    const link = result.elements.find((e) => e.tag === 'a');
    expect(link.attributes.href).toBe('/page');
    expect(link.attributes.role).toBe('link');
  });

  it('(-) handles empty element', () => {
    document.body.innerHTML = '<div id="empty"></div>';
    const root = document.getElementById('empty');
    const result = captureSubtree(root);
    expect(result.elementCount).toBe(1);
  });
});
