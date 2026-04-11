/**
 * Scroll Container Collector - Unit Tests
 *
 * Tests scroll container detection, nesting depth calculation,
 * and nested scroll issue detection.
 *
 * @see lib/scroll-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectScrollContainers } from '#lib/scroll-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

/** Create a scrollable element by mocking scroll dimensions. */
function scrollable(tag, opts = {}, parent = document.body) {
  const el = document.createElement(tag);
  el.style.overflow = opts.overflow || 'auto';
  el.style.overflowY = opts.overflow || 'auto';
  el.style.overflowX = opts.overflow || 'auto';
  if (opts.id) el.id = opts.id;
  if (opts.className) el.className = opts.className;
  // jsdom doesn't compute scroll dimensions - mock them
  Object.defineProperty(el, 'scrollHeight', { value: opts.scrollHeight || 500, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: opts.clientHeight || 200, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: opts.scrollWidth || 300, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: opts.clientWidth || 300, configurable: true });
  Object.defineProperty(el, 'scrollTop', { value: opts.scrollTop || 0, configurable: true });
  Object.defineProperty(el, 'scrollLeft', { value: opts.scrollLeft || 0, configurable: true });
  parent.appendChild(el);
  return el;
}

/** Create a non-scrollable element. */
function nonScrollable(tag, parent = document.body) {
  const el = document.createElement(tag);
  Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: 100, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
  parent.appendChild(el);
  return el;
}

describe('scroll container detection', () => {
  it('(+) detects overflow:auto with scrollable content', () => {
    scrollable('div', { id: 'list', overflow: 'auto' });
    const { containers } = collectScrollContainers();
    expect(containers.length).toBe(1);
    expect(containers[0].selector).toBe('div#list');
    expect(containers[0].scrollHeight).toBe(500);
    expect(containers[0].clientHeight).toBe(200);
  });

  it('(+) detects overflow:scroll', () => {
    scrollable('div', { overflow: 'scroll' });
    const { containers } = collectScrollContainers();
    expect(containers.length).toBe(1);
  });

  it('(-) ignores overflow:hidden', () => {
    scrollable('div', { overflow: 'hidden' });
    const { containers } = collectScrollContainers();
    expect(containers.length).toBe(0);
  });

  it('(-) ignores overflow:auto when content fits', () => {
    scrollable('div', { overflow: 'auto', scrollHeight: 100, clientHeight: 100 });
    const { containers } = collectScrollContainers();
    expect(containers.length).toBe(0);
  });

  it('(+) captures scroll position', () => {
    scrollable('div', { scrollTop: 150 });
    const { containers } = collectScrollContainers();
    expect(containers[0].scrollTop).toBe(150);
  });

  it('(+) multiple containers detected', () => {
    scrollable('div', { id: 'a' });
    scrollable('div', { id: 'b' });
    const { containers } = collectScrollContainers();
    expect(containers.length).toBe(2);
  });
});

describe('nesting depth', () => {
  it('(+) top-level container has depth 0', () => {
    scrollable('div');
    const { containers } = collectScrollContainers();
    expect(containers[0].depth).toBe(0);
  });

  it('(+) nested container has depth 1', () => {
    const outer = scrollable('div', { id: 'outer' });
    scrollable('div', { id: 'inner' }, outer);
    const { containers } = collectScrollContainers();
    const inner = containers.find((c) => c.selector === 'div#inner');
    expect(inner.depth).toBe(1);
  });

  it('(+) deeply nested container has correct depth', () => {
    const l1 = scrollable('div', { id: 'l1' });
    const l2 = scrollable('div', { id: 'l2' }, l1);
    scrollable('div', { id: 'l3' }, l2);
    const { containers } = collectScrollContainers();
    const l3 = containers.find((c) => c.selector === 'div#l3');
    expect(l3.depth).toBe(2);
  });

  it('(-) non-scrollable parent does not increase depth', () => {
    const wrapper = nonScrollable('div');
    scrollable('div', { id: 'child' }, wrapper);
    const { containers } = collectScrollContainers();
    expect(containers[0].depth).toBe(0);
  });
});

describe('nested scroll issues', () => {
  it('(+) nested scroll containers raise issue', () => {
    const outer = scrollable('div');
    scrollable('div', {}, outer);
    const { issues } = collectScrollContainers();
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('nested-scroll');
  });

  it('(-) no issue when all containers are top-level', () => {
    scrollable('div', { id: 'a' });
    scrollable('div', { id: 'b' });
    const { issues } = collectScrollContainers();
    expect(issues.length).toBe(0);
  });

  it('(-) no issue when no scroll containers exist', () => {
    document.body.innerHTML = '<div>plain</div>';
    const { containers, issues } = collectScrollContainers();
    expect(containers.length).toBe(0);
    expect(issues.length).toBe(0);
  });
});
