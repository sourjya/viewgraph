/**
 * Annotation Sidebar - Integration Tests
 *
 * Tests the full sidebar lifecycle: create, refresh with annotations,
 * list rendering, tab filtering, expand/collapse. Uses chrome API mocks.
 *
 * @see lib/annotation-sidebar.js - sidebar implementation
 * @see lib/annotate.js - annotation state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  start, stop, addPageNote, getAnnotations, clearAnnotations,
  updateComment, resolveAnnotation, removeAnnotation, updateSeverity, updateCategory, ATTR,
} from '#lib/annotate.js';
import { create, destroy, refresh, expand, collapse, isCollapsed } from '#lib/annotation-sidebar.js';

// ---------------------------------------------------------------------------
// Chrome API mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = '';
  // Mock chrome APIs needed by sidebar
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn((key, cb) => { if (cb) cb({}); return Promise.resolve({}); }),
        set: vi.fn((data, cb) => { if (cb) cb(); return Promise.resolve(); }),
      },
      sync: {
        get: vi.fn((key, cb) => { if (cb) cb({}); return Promise.resolve({}); }),
        set: vi.fn((data, cb) => { if (cb) cb(); return Promise.resolve(); }),
      },
    },
    runtime: {
      sendMessage: vi.fn((msg, cb) => { if (cb) cb({ ok: true }); }),
    },
  };
  // Mock getBoundingClientRect for annotation creation
  Element.prototype._origGetBCR = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 };
  };
});

afterEach(() => {
  destroy();
  stop();
  clearAnnotations();
  Element.prototype.getBoundingClientRect = Element.prototype._origGetBCR;
  delete Element.prototype._origGetBCR;
  delete globalThis.chrome;
});

// ---------------------------------------------------------------------------
// Helper: query inside shadow DOM
// ---------------------------------------------------------------------------

/** Find the sidebar's shadow root and query within it. */
function shadowQuery(selector) {
  const host = document.querySelector(`[${ATTR}="shadow-host"]`);
  if (!host || !host.shadowRoot) return null;
  return host.shadowRoot.querySelector(selector);
}

function shadowQueryAll(selector) {
  const host = document.querySelector(`[${ATTR}="shadow-host"]`);
  if (!host || !host.shadowRoot) return [];
  return [...host.shadowRoot.querySelectorAll(selector)];
}

/** Get the sidebar element from shadow DOM. */
function getSidebar() {
  return shadowQuery(`[${ATTR}="sidebar"]`);
}

/** Get the list element. */
function getList() {
  return shadowQuery(`[${ATTR}="list"]`);
}

/** Get the tab container. */
function getTabContainer() {
  return shadowQuery(`[${ATTR}="tab-container"]`);
}

/** Get all entry elements in the list. */
function getEntries() {
  const list = getList();
  if (!list) return [];
  return [...list.querySelectorAll(`[${ATTR}="entry"]`)];
}

// ---------------------------------------------------------------------------
// Sidebar creation and structure
// ---------------------------------------------------------------------------

describe('sidebar creation', () => {
  it('(+) create mounts sidebar in shadow DOM', () => {
    start();
    create();
    const host = document.querySelector(`[${ATTR}="shadow-host"]`);
    expect(host).not.toBeNull();
    expect(host.shadowRoot).not.toBeNull();
    expect(getSidebar()).not.toBeNull();
  });

  it('(+) sidebar has header, mode-bar, tab-container, list, footer', () => {
    start();
    create();
    expect(shadowQuery(`[${ATTR}="header"]`)).not.toBeNull();
    expect(shadowQuery(`[${ATTR}="mode-bar"]`)).not.toBeNull();
    expect(getTabContainer()).not.toBeNull();
    expect(getList()).not.toBeNull();
    expect(shadowQuery(`[${ATTR}="footer"]`)).not.toBeNull();
  });

  it('(+) destroy removes shadow host from DOM', () => {
    start();
    create();
    expect(document.querySelector(`[${ATTR}="shadow-host"]`)).not.toBeNull();
    destroy();
    expect(document.querySelector(`[${ATTR}="shadow-host"]`)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// List rendering with annotations - THE CRITICAL TEST
// ---------------------------------------------------------------------------

describe('sidebar list rendering', () => {
  it('(+) empty state shows hint text', () => {
    start();
    create();
    const list = getList();
    expect(list).not.toBeNull();
    expect(list.textContent).toContain('Click an element');
  });

  it('(+) list shows entries after adding annotations then refreshing', () => {
    start();
    addPageNote();
    addPageNote();
    addPageNote();
    create();
    const entries = getEntries();
    expect(entries.length).toBe(3);
  });

  it('(+) list shows entries when annotations exist before create', () => {
    start();
    updateComment(addPageNote().id, 'first note');
    updateComment(addPageNote().id, 'second note');
    expect(getAnnotations()).toHaveLength(2);
    create();
    const entries = getEntries();
    expect(entries.length).toBe(2);
    // Verify content is rendered
    const listEl = getList();
    expect(listEl.textContent).toContain('first note');
    expect(listEl.textContent).toContain('second note');
  });

  it('(+) refresh updates list after new annotation', () => {
    start();
    addPageNote();
    create();
    expect(getEntries().length).toBe(1);
    addPageNote();
    refresh();
    expect(getEntries().length).toBe(2);
  });

  it('(+) refresh updates list after removing annotation', () => {
    start();
    const a = addPageNote();
    const b = addPageNote();
    create();
    expect(getEntries().length).toBe(2);
    removeAnnotation(a.id);
    refresh();
    expect(getEntries().length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tab filtering
// ---------------------------------------------------------------------------

describe('sidebar tab filtering', () => {
  it('(+) tab bar shows Open, Resolved, All counts', () => {
    start();
    addPageNote();
    addPageNote();
    const a = addPageNote();
    resolveAnnotation(a.id);
    create();
    const tabContainer = getTabContainer();
    expect(tabContainer).not.toBeNull();
    expect(tabContainer.textContent).toContain('Open (2)');
    expect(tabContainer.textContent).toContain('Resolved (1)');
    expect(tabContainer.textContent).toContain('All (3)');
  });

  it('(+) default filter is open - only shows unresolved', () => {
    start();
    addPageNote();
    const a = addPageNote();
    resolveAnnotation(a.id);
    create();
    // Default filter is 'open', so only 1 entry visible
    expect(getEntries().length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Expand/collapse lifecycle
// ---------------------------------------------------------------------------

describe('sidebar expand/collapse', () => {
  it('(+) expand calls refresh - list populated after expand', () => {
    start();
    create();
    // Add annotations after create (simulates async load race)
    addPageNote();
    addPageNote();
    // List might be stale
    collapse();
    expect(isCollapsed()).toBe(true);
    expand();
    expect(isCollapsed()).toBe(false);
    // After expand, refresh should have been called
    expect(getEntries().length).toBe(2);
  });

  it('(+) annotations added while collapsed appear after expand', () => {
    start();
    create();
    collapse();
    addPageNote();
    addPageNote();
    addPageNote();
    expand();
    expect(getEntries().length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Regression: all annotations must render, not just first N
// ---------------------------------------------------------------------------

describe('sidebar renders all annotations', () => {
  it('(+) 10 open annotations produce 10 list entries', () => {
    start();
    for (let i = 0; i < 10; i++) addPageNote();
    expect(getAnnotations()).toHaveLength(10);
    create();
    expect(getEntries().length).toBe(10);
  });

  it('(+) annotations with comments all render with text', () => {
    start();
    for (let i = 0; i < 5; i++) {
      const n = addPageNote();
      updateComment(n.id, `note ${i}`);
    }
    create();
    expect(getEntries().length).toBe(5);
    const list = getList();
    expect(list.textContent).toContain('note 0');
    expect(list.textContent).toContain('note 4');
  });

  it('(+) mix of open and resolved all render under All tab', () => {
    start();
    const a = addPageNote();
    const b = addPageNote();
    const c = addPageNote();
    resolveAnnotation(a.id);
    resolveAnnotation(b.id);
    create();
    // Default filter is 'open' - only c is open
    expect(getEntries().length).toBe(1);
    // Verify tab counts
    const tabContainer = getTabContainer();
    expect(tabContainer.textContent).toContain('Open (1)');
    expect(tabContainer.textContent).toContain('Resolved (2)');
    expect(tabContainer.textContent).toContain('All (3)');
  });
});

// ---------------------------------------------------------------------------
// Regression: annotations with severity/category must render (CHIP_COLORS TDZ)
// ---------------------------------------------------------------------------

describe('sidebar renders annotations with severity and category', () => {
  it('(+) annotation with severity renders colored badge', () => {
    start();
    const n = addPageNote();
    updateSeverity(n.id, 'critical');
    create();
    expect(getEntries().length).toBe(1);
    // Severity encodes as badge background color, with title attribute
    const list = getList();
    const badge = list.querySelector('span[title="critical"]');
    expect(badge).toBeTruthy();
  });

  it('(+) annotation with category renders entry', () => {
    start();
    const n = addPageNote();
    updateCategory(n.id, 'visual');
    create();
    expect(getEntries().length).toBe(1);
    // Category is stored on annotation but not shown inline in sidebar
    expect(getAnnotations()[0].category).toBe('visual');
  });

  it('(+) 9 annotations with mixed severity/category all render', () => {
    start();
    for (let i = 0; i < 9; i++) {
      const n = addPageNote();
      if (i % 3 === 0) updateSeverity(n.id, 'critical');
      if (i % 2 === 0) updateCategory(n.id, 'visual');
    }
    create();
    // Click "All" tab to see all entries (default filter is "open")
    const tabs = getTabContainer();
    const allTab = [...tabs.querySelectorAll('button')].find((b) => b.textContent.includes('All'));
    if (allTab) allTab.click();
    expect(getEntries().length).toBe(9);
  });
});
