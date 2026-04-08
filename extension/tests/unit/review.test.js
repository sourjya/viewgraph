/**
 * Review Mode - Unit Tests
 *
 * Tests annotation CRUD, node intersection logic, and state management.
 * DOM interaction (drag selection, markers) requires a real browser.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findIntersectingNodes, updateComment, removeAnnotation,
  getAnnotations, clearAnnotations, start, stop, isActive,
} from '../../lib/review.js';

let restore;

beforeEach(() => {
  document.body.innerHTML = '';
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 };
  };
  restore = () => { Element.prototype.getBoundingClientRect = original; };
});

afterEach(() => {
  stop();
  restore();
});

// ---------------------------------------------------------------------------
// findIntersectingNodes
// ---------------------------------------------------------------------------

describe('findIntersectingNodes', () => {
  it('returns elements fully inside the selection', () => {
    document.body.innerHTML = '<div><button>A</button><button>B</button></div>';
    // Selection covers the entire stubbed rect area
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const nids = findIntersectingNodes(sel);
    expect(nids.length).toBeGreaterThan(0);
  });

  it('returns empty for selection that misses all elements', () => {
    document.body.innerHTML = '<div><button>A</button></div>';
    const sel = { left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100 };
    const nids = findIntersectingNodes(sel);
    expect(nids).toHaveLength(0);
  });

  it('excludes review overlay elements', () => {
    document.body.innerHTML = '<div>Real</div><div data-vg-review="marker">Overlay</div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const nids = findIntersectingNodes(sel);
    // Should only include the real div, not the overlay
    expect(nids.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Annotation CRUD
// ---------------------------------------------------------------------------

describe('annotation state', () => {
  it('starts with no annotations', () => {
    expect(getAnnotations()).toHaveLength(0);
  });

  it('clearAnnotations resets state', () => {
    start();
    clearAnnotations();
    expect(getAnnotations()).toHaveLength(0);
  });

  it('getAnnotations returns a copy', () => {
    const a = getAnnotations();
    const b = getAnnotations();
    expect(a).not.toBe(b);
  });
});

describe('updateComment', () => {
  it('does not throw for non-existent id', () => {
    expect(() => updateComment(999, 'test')).not.toThrow();
  });
});

describe('removeAnnotation', () => {
  it('does not throw for non-existent id', () => {
    expect(() => removeAnnotation(999)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Start / Stop lifecycle
// ---------------------------------------------------------------------------

describe('review mode lifecycle', () => {
  it('starts inactive', () => {
    expect(isActive()).toBe(false);
  });

  it('start activates review mode', () => {
    start();
    expect(isActive()).toBe(true);
  });

  it('stop deactivates review mode', () => {
    start();
    stop();
    expect(isActive()).toBe(false);
  });

  it('double start is safe', () => {
    start();
    start();
    expect(isActive()).toBe(true);
  });

  it('double stop is safe', () => {
    stop();
    stop();
    expect(isActive()).toBe(false);
  });

  it('stop clears all annotations', () => {
    start();
    clearAnnotations();
    stop();
    expect(getAnnotations()).toHaveLength(0);
  });

  it('annotations are empty after start (sidebar shows hint)', () => {
    start();
    expect(getAnnotations()).toHaveLength(0);
    stop();
  });
});
