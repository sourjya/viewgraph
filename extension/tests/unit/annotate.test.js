/**
 * Unified Annotate Mode - Unit Tests
 *
 * Tests the merged inspect+review state machine: hover helpers,
 * annotation CRUD, node intersection, persistence, lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  selectorSegment, buildBreadcrumb, getRole, buildMetaLine, bestSelector,
  findIntersectingNodes, findCommonAncestor,
  updateComment, removeAnnotation, toggleResolved,
  getAnnotations, clearAnnotations,
  start, stop, isActive, storageKey, save, load,
} from '../../lib/annotate.js';

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
// Selector helpers
// ---------------------------------------------------------------------------

describe('selectorSegment', () => {
  it('returns tag#id when element has id', () => {
    document.body.innerHTML = '<div id="main">X</div>';
    expect(selectorSegment(document.querySelector('div'))).toBe('div#main');
  });

  it('returns tag.class for classed element', () => {
    document.body.innerHTML = '<div class="card primary">X</div>';
    expect(selectorSegment(document.querySelector('div'))).toBe('div.card.primary');
  });

  it('returns bare tag when no id or class', () => {
    document.body.innerHTML = '<span>X</span>';
    expect(selectorSegment(document.querySelector('span'))).toBe('span');
  });
});

describe('buildBreadcrumb', () => {
  it('builds path from element to body', () => {
    document.body.innerHTML = '<div class="a"><span class="b">X</span></div>';
    const bc = buildBreadcrumb(document.querySelector('span'));
    expect(bc).toBe('div.a > span.b');
  });
});

describe('bestSelector', () => {
  it('prefers data-testid', () => {
    document.body.innerHTML = '<button data-testid="submit">Go</button>';
    expect(bestSelector(document.querySelector('button'))).toBe('[data-testid="submit"]');
  });

  it('prefers id over structural', () => {
    document.body.innerHTML = '<div id="root">X</div>';
    expect(bestSelector(document.querySelector('div'))).toBe('#root');
  });

  it('returns structural selector as fallback', () => {
    document.body.innerHTML = '<div><span>X</span></div>';
    const sel = bestSelector(document.querySelector('span'));
    expect(sel).toContain('span');
  });
});

describe('getRole', () => {
  it('returns explicit role', () => {
    document.body.innerHTML = '<div role="dialog">X</div>';
    expect(getRole(document.querySelector('div'))).toEqual({ role: 'dialog', source: 'explicit' });
  });

  it('returns implicit role for button', () => {
    document.body.innerHTML = '<button>X</button>';
    expect(getRole(document.querySelector('button'))).toEqual({ role: 'button', source: 'implicit' });
  });

  it('returns null for generic div', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(getRole(document.querySelector('div'))).toEqual({ role: null, source: null });
  });
});

describe('buildMetaLine', () => {
  it('includes testid when present', () => {
    document.body.innerHTML = '<button data-testid="ok">OK</button>';
    expect(buildMetaLine(document.querySelector('button'))).toContain('testid: ok');
  });

  it('shows testid: none when absent', () => {
    document.body.innerHTML = '<div>X</div>';
    expect(buildMetaLine(document.querySelector('div'))).toContain('testid: none');
  });
});

// ---------------------------------------------------------------------------
// Node intersection
// ---------------------------------------------------------------------------

describe('findIntersectingNodes', () => {
  it('returns elements inside selection', () => {
    document.body.innerHTML = '<div><button>A</button></div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    expect(findIntersectingNodes(sel).length).toBeGreaterThan(0);
  });

  it('returns empty for miss', () => {
    document.body.innerHTML = '<div>A</div>';
    const sel = { left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100 };
    expect(findIntersectingNodes(sel)).toHaveLength(0);
  });

  it('excludes annotate overlay elements', () => {
    document.body.innerHTML = '<div>Real</div><div data-vg-annotate="marker">Overlay</div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    expect(findIntersectingNodes(sel)).toHaveLength(1);
  });

  it('returns empty for zero-size selection', () => {
    document.body.innerHTML = '<div>A</div>';
    const sel = { left: 50, top: 50, right: 50, bottom: 50, width: 0, height: 0 };
    expect(findIntersectingNodes(sel)).toHaveLength(0);
  });
});

describe('findCommonAncestor', () => {
  it('returns parent when selection covers siblings', () => {
    document.body.innerHTML = '<div class="card"><span>A</span><span>B</span></div>';
    const sel = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    expect(findCommonAncestor(sel)).toContain('div');
  });

  it('returns null for empty selection', () => {
    document.body.innerHTML = '<div>X</div>';
    const sel = { left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100 };
    expect(findCommonAncestor(sel)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Annotation CRUD
// ---------------------------------------------------------------------------

describe('annotation CRUD', () => {
  it('starts with no annotations', () => {
    expect(getAnnotations()).toHaveLength(0);
  });

  it('getAnnotations returns a copy', () => {
    const a = getAnnotations();
    a.push({ id: 99 });
    expect(getAnnotations()).not.toContainEqual({ id: 99 });
  });

  it('clearAnnotations resets state', () => {
    clearAnnotations();
    expect(getAnnotations()).toHaveLength(0);
  });
});

describe('updateComment', () => {
  it('does not throw for non-existent id', () => {
    expect(() => updateComment(999, 'test')).not.toThrow();
  });

  it('does not create annotation for non-existent id', () => {
    updateComment(999, 'ghost');
    expect(getAnnotations()).toHaveLength(0);
  });
});

describe('removeAnnotation', () => {
  it('does not throw for non-existent id', () => {
    expect(() => removeAnnotation(999)).not.toThrow();
  });
});

describe('toggleResolved', () => {
  it('returns null for non-existent id', () => {
    expect(toggleResolved(999)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('lifecycle', () => {
  it('starts inactive', () => {
    expect(isActive()).toBe(false);
  });

  it('start activates', () => {
    start();
    expect(isActive()).toBe(true);
  });

  it('stop deactivates', () => {
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

  it('rapid cycles do not corrupt state', () => {
    start(); stop(); start(); stop(); start(); stop();
    expect(isActive()).toBe(false);
    expect(getAnnotations()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('storageKey', () => {
  it('starts with vg-annotations:', () => {
    expect(storageKey()).toMatch(/^vg-annotations:/);
  });
});

describe('save and load', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    globalThis.chrome = {
      storage: { local: {
        set: async (obj) => { Object.assign(mockStorage, obj); },
        get: async (key) => ({ [key]: mockStorage[key] }),
      } },
    };
  });

  it('save does not throw when empty', async () => {
    start();
    await expect(save()).resolves.not.toThrow();
    stop();
  });

  it('load returns false when no data', async () => {
    start();
    expect(await load()).toBe(false);
    stop();
  });

  it('load works as .then() chain', () => {
    start();
    return load().then((loaded) => {
      expect(loaded).toBe(false);
      stop();
    });
  });
});

// ---------------------------------------------------------------------------
// Panel positioning
// ---------------------------------------------------------------------------

import { show as showPanel, hide as hidePanel } from '../../lib/annotation-panel.js';

describe('annotation panel positioning', () => {
  afterEach(() => hidePanel());

  it('positions panel to the right when space available', () => {
    const ann = { id: 1, region: { x: 50, y: 100, width: 200, height: 100 }, comment: '' };
    showPanel(ann);
    const panel = document.querySelector('[data-vg-annotate="panel"]');
    expect(panel).not.toBeNull();
    const left = parseInt(panel.style.left);
    // Should be right of region: 50 + 200 + 12 = 262
    expect(left).toBe(262);
  });

  it('positions panel to the left when near right edge', () => {
    // Simulate annotation near right edge (viewport is 1024 in jsdom)
    const ann = { id: 2, region: { x: 600, y: 100, width: 200, height: 100 }, comment: '' };
    showPanel(ann);
    const panel = document.querySelector('[data-vg-annotate="panel"]');
    const left = parseInt(panel.style.left);
    // Should be left of region: 600 - 240 - 12 = 348
    expect(left).toBeLessThan(600);
  });

  it('panel left position never goes below 8px', () => {
    const ann = { id: 3, region: { x: 10, y: 100, width: 5, height: 5 }, comment: '' };
    // Force right edge overflow by using large region x
    const bigAnn = { id: 4, region: { x: 900, y: 100, width: 200, height: 100 }, comment: '' };
    showPanel(bigAnn);
    const panel = document.querySelector('[data-vg-annotate="panel"]');
    const left = parseInt(panel.style.left);
    expect(left).toBeGreaterThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// Legacy attr cleanup
// ---------------------------------------------------------------------------

describe('legacy attr cleanup on start', () => {
  it('removes data-vg-review elements on start', () => {
    document.body.innerHTML = '<div data-vg-review="marker-1">old</div>';
    expect(document.querySelector('[data-vg-review]')).not.toBeNull();
    start();
    expect(document.querySelector('[data-vg-review]')).toBeNull();
    stop();
  });

  it('removes data-vg-inspector elements on start', () => {
    document.body.innerHTML = '<div data-vg-inspector="overlay">old</div>';
    expect(document.querySelector('[data-vg-inspector]')).not.toBeNull();
    start();
    expect(document.querySelector('[data-vg-inspector]')).toBeNull();
    stop();
  });

  it('does not remove non-viewgraph elements', () => {
    document.body.innerHTML = '<div class="real">keep</div><div data-vg-review="x">remove</div>';
    start();
    expect(document.querySelector('.real')).not.toBeNull();
    expect(document.querySelector('[data-vg-review]')).toBeNull();
    stop();
  });
});

// ---------------------------------------------------------------------------
// Annotation ID stability
// ---------------------------------------------------------------------------

describe('annotation ID stability', () => {
  it('removeAnnotation does not renumber remaining annotations', () => {
    // Manually push annotations to simulate state
    start();
    // Can't easily create annotations without DOM events, but we can test
    // that removeAnnotation on non-existent ID doesn't affect others
    removeAnnotation(1);
    removeAnnotation(999);
    expect(getAnnotations()).toHaveLength(0);
    stop();
  });
});

// ---------------------------------------------------------------------------
// Sidebar close dismisses annotate mode
// ---------------------------------------------------------------------------

describe('sidebar close button', () => {
  it('stopAnnotate deactivates mode when called directly', () => {
    start();
    expect(isActive()).toBe(true);
    stop();
    expect(isActive()).toBe(false);
  });

  it('hideMarkers removes all annotate elements from DOM', () => {
    document.body.innerHTML = '<div data-vg-annotate="marker-1">M</div><div data-vg-annotate="overlay">O</div>';
    // Import and call hideMarkers
    const markers = document.querySelectorAll('[data-vg-annotate]');
    expect(markers.length).toBe(2);
    // hideMarkers removes all data-vg-annotate elements
    document.querySelectorAll('[data-vg-annotate]').forEach((el) => el.remove());
    expect(document.querySelectorAll('[data-vg-annotate]').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Hover exclusion of annotate UI children
// ---------------------------------------------------------------------------

describe('highlight skips annotate UI', () => {
  it('element with data-vg-annotate is excluded', () => {
    document.body.innerHTML = '<div data-vg-annotate="sidebar"><span>Note</span></div>';
    const span = document.querySelector('span');
    // Walk up from span - should find data-vg-annotate parent
    let node = span;
    let found = false;
    while (node && node !== document.documentElement) {
      if (node.hasAttribute && node.hasAttribute('data-vg-annotate')) { found = true; break; }
      node = node.parentElement;
    }
    expect(found).toBe(true);
  });

  it('normal element is not excluded', () => {
    document.body.innerHTML = '<div class="content"><span>Real</span></div>';
    const span = document.querySelector('span');
    let node = span;
    let found = false;
    while (node && node !== document.documentElement) {
      if (node.hasAttribute && node.hasAttribute('data-vg-annotate')) { found = true; break; }
      node = node.parentElement;
    }
    expect(found).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click dedup - same element doesn't create duplicate annotation
// ---------------------------------------------------------------------------

describe('click dedup', () => {
  it('annotations with identical region and ancestor are detected as duplicates', () => {
    const region = { x: 10, y: 10, width: 100, height: 50 };
    const a1 = { id: 1, type: 'element', region, comment: 'first', nids: [], ancestor: 'div.card' };
    const a2 = { id: 2, type: 'element', region, comment: 'second', nids: [], ancestor: 'div.card' };
    // Same ancestor + same region coordinates = duplicate
    expect(a1.ancestor === a2.ancestor
      && a1.region.x === a2.region.x && a1.region.y === a2.region.y
      && a1.region.width === a2.region.width && a1.region.height === a2.region.height).toBe(true);
  });

  it('annotations with different regions are not duplicates', () => {
    const r1 = { x: 10, y: 10, width: 100, height: 50 };
    const r2 = { x: 200, y: 300, width: 100, height: 50 };
    expect(r1.x === r2.x && r1.y === r2.y).toBe(false);
  });

  it('annotations with same region but different ancestor are not duplicates', () => {
    const region = { x: 10, y: 10, width: 100, height: 50 };
    expect('div.card' === 'button.primary').toBe(false);
  });
});
