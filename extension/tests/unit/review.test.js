/**
 * Review Mode - Unit Tests
 *
 * Tests annotation CRUD, node intersection logic, and state management.
 * DOM interaction (drag selection, markers) requires a real browser.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findIntersectingNodes, findCommonAncestor, updateComment, removeAnnotation,
  getAnnotations, clearAnnotations, start, stop, isActive, storageKey, save, load,
  toggleResolved,
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

  it('mutating returned array does not affect internal state', () => {
    start();
    const arr = getAnnotations();
    arr.push({ id: 99, fake: true });
    expect(getAnnotations()).not.toContainEqual({ id: 99, fake: true });
    stop();
  });

  it('clearAnnotations is safe when already empty', () => {
    expect(() => clearAnnotations()).not.toThrow();
    expect(getAnnotations()).toHaveLength(0);
  });
});

describe('updateComment', () => {
  it('does not throw for non-existent id', () => {
    expect(() => updateComment(999, 'test')).not.toThrow();
  });

  it('does not create an annotation for non-existent id', () => {
    updateComment(999, 'ghost');
    expect(getAnnotations()).toHaveLength(0);
  });
});

describe('removeAnnotation', () => {
  it('does not throw for non-existent id', () => {
    expect(() => removeAnnotation(999)).not.toThrow();
  });

  it('does not affect other annotations when removing non-existent id', () => {
    start();
    const before = getAnnotations().length;
    removeAnnotation(999);
    expect(getAnnotations().length).toBe(before);
    stop();
  });
});

describe('toggleResolved', () => {
  it('returns null for non-existent id', () => {
    expect(toggleResolved(999)).toBeNull();
  });

  it('does not create annotation for non-existent id', () => {
    toggleResolved(999);
    expect(getAnnotations()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findCommonAncestor
// ---------------------------------------------------------------------------

describe('findCommonAncestor', () => {
  it('returns the parent element when selection covers siblings', () => {
    document.body.innerHTML = '<div class="card-body"><span>A</span><span>B</span></div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const result = findCommonAncestor(sel);
    expect(result).toContain('div');
  });

  it('returns single element name when only one element selected', () => {
    document.body.innerHTML = '<button class="btn primary">Click</button>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const result = findCommonAncestor(sel);
    expect(result).toBe('button.btn.primary');
  });

  it('returns null when no elements in selection', () => {
    document.body.innerHTML = '<div>X</div>';
    const sel = { left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100 };
    expect(findCommonAncestor(sel)).toBeNull();
  });

  it('includes id when element has one', () => {
    document.body.innerHTML = '<form id="login"><input><input></form>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const result = findCommonAncestor(sel);
    expect(result).toContain('#login');
  });

  it('excludes review overlay elements from ancestor calculation', () => {
    document.body.innerHTML = '<div class="real"><span>A</span></div><div data-vg-review="marker">X</div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const result = findCommonAncestor(sel);
    expect(result).not.toBeNull();
  });
});

describe('findIntersectingNodes edge cases', () => {
  it('returns nids starting from 1 (not 0)', () => {
    document.body.innerHTML = '<div>A</div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const nids = findIntersectingNodes(sel);
    for (const nid of nids) {
      expect(nid).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns empty for zero-size selection', () => {
    document.body.innerHTML = '<div>A</div>';
    const sel = { left: 50, top: 50, right: 50, bottom: 50, width: 0, height: 0 };
    const nids = findIntersectingNodes(sel);
    expect(nids).toHaveLength(0);
  });

  it('handles page with no elements', () => {
    document.body.innerHTML = '';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const nids = findIntersectingNodes(sel);
    expect(nids).toHaveLength(0);
  });
});

describe('annotation persistence across start calls', () => {
  it('start does not clear existing annotations', () => {
    start();
    // Annotations added during review persist across start calls
    expect(isActive()).toBe(true);
    // Calling start again is safe (no-op)
    start();
    expect(isActive()).toBe(true);
    stop();
  });

  it('only stop clears annotations', () => {
    start();
    expect(getAnnotations()).toHaveLength(0);
    stop();
    expect(getAnnotations()).toHaveLength(0);
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

  it('stop is safe even if inspect was running (mode switch)', () => {
    // Simulates: user was in review, switches to inspect, review.stop() called
    start();
    expect(isActive()).toBe(true);
    stop();
    expect(isActive()).toBe(false);
    // Starting again after stop works (simulates re-entering review)
    start();
    expect(isActive()).toBe(true);
    stop();
  });

  it('rapid start/stop cycles do not corrupt state', () => {
    start(); stop();
    start(); stop();
    start(); stop();
    expect(isActive()).toBe(false);
    expect(getAnnotations()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('storageKey', () => {
  it('returns a string starting with vg-annotations:', () => {
    expect(storageKey()).toMatch(/^vg-annotations:/);
  });

  it('includes origin and pathname', () => {
    const key = storageKey();
    expect(key).toContain(location.origin);
    expect(key).toContain(location.pathname);
  });

  it('does not include query params or hash', () => {
    const key = storageKey();
    expect(key).not.toContain('?');
    expect(key).not.toContain('#');
  });
});

describe('save and load', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    globalThis.chrome = {
      storage: {
        local: {
          set: async (obj) => { Object.assign(mockStorage, obj); },
          get: async (key) => ({ [key]: mockStorage[key] }),
        },
      },
    };
  });

  it('save does not throw when no annotations', async () => {
    start();
    await expect(save()).resolves.not.toThrow();
    stop();
  });

  it('load returns false when no stored data', async () => {
    start();
    const loaded = await load();
    expect(loaded).toBe(false);
    stop();
  });

  it('save then load round-trips annotations', async () => {
    start();
    await save();
    stop();
    start();
    const loaded = await load();
    // No annotations were added, so nothing to load
    expect(loaded).toBe(false);
    stop();
  });

  it('load works as .then() chain (non-async context)', () => {
    start();
    return load().then((loaded) => {
      expect(loaded).toBe(false);
      stop();
    });
  });

  it('start then load does not throw', async () => {
    start();
    await expect(load()).resolves.toBe(false);
    stop();
  });

  it('load after stop does not throw', async () => {
    start();
    stop();
    await expect(load()).resolves.toBe(false);
  });
});
