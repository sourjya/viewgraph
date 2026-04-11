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
import { resetServerCache } from '#lib/constants.js';

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

// ---------------------------------------------------------------------------
// MCP connection state: banner and Send button
// ---------------------------------------------------------------------------

describe('sidebar MCP disconnected state', () => {
  // Force discoverServer to return null by making all fetches fail instantly
  let origFetch;
  beforeEach(() => {
    origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no server')));
    resetServerCache();
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it('(+) shows status banner when MCP server is offline', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    });
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    expect(banner.textContent).toContain('No project connected');
  });

  it('(+) hides Send button and promotes exports when MCP server is offline', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const btn = shadowQuery(`[${ATTR}="send"]`);
      expect(btn?.style.display).toBe('none');
    });
    const copyBtn = shadowQuery(`[${ATTR}="copy-md"]`);
    expect(copyBtn.style.background).toMatch(/6366f1|rgb\(99,\s*102,\s*241\)/);
  });

  it('(+) Copy MD and Report buttons stay enabled when MCP is offline', async () => {
    start();
    create();
    await vi.waitFor(() => {
      expect(shadowQuery(`[${ATTR}="send"]`)?.disabled).toBe(true);
    });
    const copyBtn = shadowQuery(`[${ATTR}="copy-md"]`);
    const dlBtn = shadowQuery(`[${ATTR}="download"]`);
    expect(copyBtn).toBeTruthy();
    expect(dlBtn).toBeTruthy();
    // Neither has the MCP-specific disabled title
    expect(copyBtn.title).not.toContain('not connected');
    expect(dlBtn.title).not.toContain('not connected');
  });
});

// ---------------------------------------------------------------------------
// Inspect tab: separator and capture list UX
// ---------------------------------------------------------------------------

describe('inspect tab captures section', () => {
  let origFetch;

  /** Click the Inspect tab button inside shadow DOM. */
  function clickInspectTab() {
    const tabs = shadowQuery(`[${ATTR}="primary-tabs"]`);
    const inspectBtn = [...tabs.querySelectorAll('button')].find((b) => b.textContent === 'Inspect');
    inspectBtn.click();
  }

  /** Get the inspect content container. */
  function getInspectContent() {
    return shadowQuery(`[${ATTR}="inspect-content"]`);
  }

  /**
   * Build a mock fetch that responds to health, captures, and baselines endpoints.
   * @param {Array} captures - capture objects to return
   * @param {Array} baselines - baseline objects to return
   */
  function mockFetchWith(captures = [], baselines = []) {
    return vi.fn((url, opts) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      }
      if (u.includes('/info')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'test' }) });
      }
      if (u.includes('/captures')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ captures }) });
      }
      if (u.includes('/baselines/compare')) {
        return Promise.resolve({ ok: false });
      }
      if (u.includes('/baselines')) {
        if (opts?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ baselines }) });
      }
      if (u.includes('/annotations/resolved')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ resolved: [] }) });
      }
      return Promise.reject(new Error(`unmocked: ${u}`));
    });
  }

  beforeEach(() => {
    origFetch = globalThis.fetch;
    resetServerCache();
    // jsdom lacks matchMedia - mock it for collectBreakpoints
    window.matchMedia = vi.fn((query) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    delete window.matchMedia;
  });

  it('(+) separator exists between diagnostics and capture sections', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 60000).toISOString(), nodeCount: 80 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      const hrs = ic.querySelectorAll('hr');
      expect(hrs.length).toBeGreaterThanOrEqual(1);
    });
    const children = [...ic.children];
    const hrIdx = children.findIndex((el) => el.tagName === 'HR');
    const autoRow = children.find((el) => el.textContent.includes('AUTO-CAPTURE'));
    const autoIdx = children.indexOf(autoRow);
    expect(hrIdx).toBeGreaterThan(0);
    expect(hrIdx).toBeLessThan(autoIdx);
  });

  it('(+) snapshots status shows count and relative time', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 80 },
      { filename: 'cap-2.json', timestamp: new Date(now - 120000).toISOString(), nodeCount: 80 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.textContent).toContain('SNAPSHOTS');
    });
    expect(ic.textContent).toContain('2');
    expect(ic.textContent).toContain('just now');
  });

  it('(+) green dot when latest capture is recent', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 10000).toISOString(), nodeCount: 80 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.textContent).toContain('SNAPSHOTS');
    });
    const status = ic.querySelector(`[${ATTR}="capture-status"]`);
    const dots = [...status.querySelectorAll('span')].filter((s) => s.style.borderRadius === '50%');
    expect(dots.length).toBe(1);
    expect(dots[0].style.background).toBe('rgb(74, 222, 128)');
  });

  it('(+) warning shown when latest capture is empty', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 0 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.textContent).toContain('empty');
    });
  });

  it('(-) no warning when capture has elements', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 80 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.textContent).toContain('SNAPSHOTS');
    });
    expect(ic.querySelectorAll(`[${ATTR}="capture-warning"]`).length).toBe(0);
  });

  it('(-) no snapshots row when server returns empty list', async () => {
    globalThis.fetch = mockFetchWith([]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await new Promise((r) => setTimeout(r, 50));
    expect(ic.textContent).not.toContain('SNAPSHOTS');
  });

  it('(+) capture ID shown with filename', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'viewgraph-localhost-20260408-120612.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 80 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      const id = ic.querySelector(`[${ATTR}="capture-id"]`);
      expect(id).toBeTruthy();
    });
    const id = ic.querySelector(`[${ATTR}="capture-id"]`);
    expect(id.textContent).toBe('viewgraph-localhost-20260408-120612');
  });

  it('(+) page title shown when available', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 80, title: 'My App - Dashboard' },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      const title = ic.querySelector(`[${ATTR}="capture-title"]`);
      expect(title).toBeTruthy();
    });
    expect(ic.querySelector(`[${ATTR}="capture-title"]`).textContent).toBe('My App - Dashboard');
  });

  it('(-) no title row when title is absent', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 80 },
    ]);
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.querySelector(`[${ATTR}="capture-id"]`)).toBeTruthy();
    });
    expect(ic.querySelector(`[${ATTR}="capture-title"]`)).toBeNull();
  });

  it('(+) copy button copies filename and shows checkmark', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'viewgraph-localhost-20260408-120612.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 80 },
    ]);
    let copied = null;
    navigator.clipboard = { writeText: vi.fn((t) => { copied = t; return Promise.resolve(); }) };
    start();
    create();
    clickInspectTab();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.querySelector(`[${ATTR}="copy-id"]`)).toBeTruthy();
    });
    const btn = ic.querySelector(`[${ATTR}="copy-id"]`);
    btn.click();
    await vi.waitFor(() => {
      expect(btn.textContent).toBe('Copied');
    });
    expect(copied).toBe('viewgraph-localhost-20260408-120612.json');
    delete navigator.clipboard;
  });
});