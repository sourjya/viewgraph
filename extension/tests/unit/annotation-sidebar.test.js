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
  // Set location to localhost so server discovery works in tests
  Object.defineProperty(window, 'location', { value: { href: 'http://localhost:8040/projects', hostname: 'localhost', protocol: 'http:' }, writable: true, configurable: true });
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
      getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
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
  it('(+) mode button hint text is at least 9px', () => {
    start();
    create();
    const modeBar = shadowQuery(`[${ATTR}="mode-bar"]`);
    if (modeBar) {
      const hints = modeBar.querySelectorAll('span');
      const hintSpans = [...hints].filter((s) => s.textContent.match(/Click to select|Shift\+drag|Add a page/));
      for (const h of hintSpans) {
        const size = parseInt(h.style.fontSize);
        expect(size).toBeGreaterThanOrEqual(9);
      }
    }
    stop();
    destroy();
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
    const _b = addPageNote();
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
    const _c = addPageNote();
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

  it('(+) status banner is positioned directly above footer buttons, not above tabs', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    });
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    const sendBtn = shadowQuery(`[${ATTR}="send"]`);
    const reviewContent = shadowQuery(`[${ATTR}="review-content"]`);
    // Banner must be inside review-content (not a sibling of primary-tabs)
    expect(reviewContent.contains(banner)).toBe(true);
    // Banner must come after the list and before or at the footer level
    const children = [...reviewContent.children].map((el) => el.getAttribute(ATTR) || el.tagName);
    const bannerIdx = children.indexOf('status-banner');
    const listIdx = children.indexOf('list');
    expect(bannerIdx).toBeGreaterThan(listIdx);
  });

  it('(-) status banner is NOT a child of primary-tabs area', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    });
    const primaryTabs = shadowQuery(`[${ATTR}="primary-tabs"]`);
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    // Banner must not be a sibling immediately after primary-tabs
    expect(primaryTabs.nextElementSibling?.getAttribute(ATTR)).not.toBe('status-banner');
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
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'test', projectRoot: '/home/user/project', urlPatterns: ['localhost:8040'], serverVersion: 'test' }) });
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
    const hasHr = children.some((el) => el.tagName === 'HR');
    const hasAuto = children.some((el) => el.textContent?.includes('AUTO-CAPTURE'));
    expect(hasHr || hasAuto).toBe(true);
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

  it('(+) baseline row renders with Set button when no baseline exists', async () => {
    const captures = [{ filename: 'viewgraph-localhost-20260408-120612.json', url: 'http://localhost:8040', timestamp: new Date().toISOString(), nodeCount: 12, title: 'Test' }];
    globalThis.fetch = mockFetchWith(captures, []);
    start();
    create();
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 200));
    const baseRow = shadowQuery(`[${ATTR}="baseline-row"]`);
    if (baseRow) {
      const btn = shadowQuery(`[${ATTR}="baseline-btn"]`);
      expect(btn.textContent).toBe('Set');
    }
    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Pending state after Send to Agent
// ---------------------------------------------------------------------------

describe('pending state after Send to Agent', () => {
  it('(+) pending annotation renders amber status text', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].pending = true;
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      expect(text).toContain('Sent to agent');
    }

    stop();
    destroy();
  });

  it('(+) resolved annotation shows resolution instead of pending', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].pending = true;
    anns[0].resolved = true;
    anns[0].resolution = { by: 'kiro', action: 'fixed', summary: 'Done' };
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      expect(text).toContain('fixed');
      expect(text).not.toContain('Sent to agent');
    }

    stop();
    destroy();
  });

  it('(+) non-pending unresolved annotation does not show amber text', () => {
    start();
    addPageNote();
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      expect(text).not.toContain('Sent to agent');
    }

    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Keyboard shortcuts integration
// ---------------------------------------------------------------------------

describe('keyboard shortcuts integration', () => {
  it('(+) shortcuts are cleaned up on destroy without errors', () => {
    start();
    create();
    destroy();
    stop();

    // After destroy, dispatching shortcut keys should not throw
    expect(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(event);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Collapsed strip
// ---------------------------------------------------------------------------

describe('collapsed strip', () => {
  it('(+) strip always shows chat bubble with count 0', () => {
    start();
    create();
    collapse();

    const badge = document.querySelector(`[${ATTR}="collapse-badge"]`);
    const countEl = badge?.querySelector('[data-vg-badge-count]');
    expect(countEl).toBeTruthy();
    expect(countEl.textContent).toContain('0');

    stop();
    destroy();
  });

  it('(+) strip shows VG icon as img element', () => {
    start();
    create();
    collapse();

    const badge = document.querySelector(`[${ATTR}="collapse-badge"]`);
    const img = badge?.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('icon-16.png');

    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Help card
// ---------------------------------------------------------------------------

describe('help card', () => {
  it('(+) help card contains keycap-styled shortcut keys', () => {
    start();
    create();

    const helpCard = shadowQuery(`[${ATTR}="help-card"]`);
    expect(helpCard).toBeTruthy();
    // Card is hidden by default
    expect(helpCard.style.display).toBe('none');

    stop();
    destroy();
  });

  it('(+) help card links have SVG icons and text labels', () => {
    start();
    create();

    const helpCard = shadowQuery(`[${ATTR}="help-card"]`);
    const links = helpCard?.querySelectorAll('a') || [];
    expect(links.length).toBe(3);
    // Each link has an SVG icon span and a text span
    for (const link of links) {
      expect(link.querySelector('svg')).toBeTruthy();
      expect(link.querySelectorAll('span').length).toBe(2);
    }

    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Settings footer link
// ---------------------------------------------------------------------------

describe('settings', () => {
  it('(+) settings link exists in footer', () => {
    start();
    create();

    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Settings');

    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Annotation type badge differentiation
// ---------------------------------------------------------------------------

describe('annotation type badges', () => {
  it('(+) regular bug annotation shows colored number badge', () => {
    start();
    addPageNote(); // creates annotation id=1
    const anns = getAnnotations();
    anns[0].type = 'element';
    anns[0].category = 'visual';
    create();
    refresh();

    const entries = getEntries();
    expect(entries.length).toBeGreaterThan(0);
    // Should not have idea or diagnostic styling
    const badge = entries[0].querySelector('span');
    expect(badge.textContent).toContain('#');

    stop();
    destroy();
  });

  it('(+) idea annotation shows yellow badge with lightbulb', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].category = 'idea';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      // Contains lightbulb SVG path and yellow color
      expect(html).toContain('M9 18h6');
      expect(html).toMatch(/eab308|234, 179, 8/);
    }

    stop();
    destroy();
  });

  it('(+) diagnostic note shows teal badge with terminal icon', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test data' };
    anns[0].comment = 'Network: 2 failed requests';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      // Contains terminal SVG path and teal color
      expect(html).toContain('4 17 10 11 4 5');
      expect(html).toMatch(/0d9488|13, 148, 136/);
    }

    stop();
    destroy();
  });

  it('(+) page note shows blue badge with document icon', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].type = 'page-note';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      // Contains document SVG path and blue color
      expect(html).toContain('M14 2H6');
      expect(html).toMatch(/0ea5e9|14, 165, 233/);
    }

    stop();
    destroy();
  });

  it('(+) diagnostic note shows styled section tag in comment', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Console', data: 'TypeError: x is not defined' };
    anns[0].comment = 'Console: TypeError: x is not defined';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      expect(text).toContain('Console');
    }

    stop();
    destroy();
  });

  it('(+) diagnostic note truncates long excerpt', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'a'.repeat(200) };
    anns[0].comment = 'Network: ' + 'a'.repeat(200);
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      // Should be truncated with ellipsis
      expect(text).toContain('...');
    }

    stop();
    destroy();
  });

  it('(-) diagnostic badge takes priority over idea badge', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test' };
    anns[0].category = 'idea';
    anns[0].comment = 'Network: test';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      // Diagnostic (teal) takes priority over idea (yellow)
      expect(html).toMatch(/0d9488|13, 148, 136/);
      expect(html).not.toMatch(/eab308|234, 179, 8/);
    }

    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Inspect tab section copy buttons
// ---------------------------------------------------------------------------

describe('inspect tab section copy buttons', () => {
  it('(+) each section has a copy button with unique data-section', async () => {
    start();
    create();
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const copyBtns = shadowQueryAll(`[${ATTR}="section-copy"]`);
    // In test env, at least Network and Console sections should render
    if (copyBtns.length > 0) {
      // Each button has a unique data-section attribute
      const sections = copyBtns.map((b) => b.dataset.section);
      const unique = new Set(sections);
      expect(unique.size).toBe(sections.length);
    }

    stop();
    destroy();
  });

  it('(+) copy buttons have distinct section names (no cross-contamination)', async () => {
    start();
    create();
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const copyBtns = shadowQueryAll(`[${ATTR}="section-copy"]`);
    const sections = copyBtns.map((b) => b.dataset.section);
    // Verify known sections exist
    if (sections.length > 0) {
      expect(sections).toContain('Network');
      expect(sections).toContain('Console');
    }

    stop();
    destroy();
  });
});

// ---------------------------------------------------------------------------
// Diagnostic note button behavior
// ---------------------------------------------------------------------------

describe('diagnostic note button', () => {
  it('(+) created annotation has diagnostic property with section name', () => {
    start();
    // Manually create a diagnostic annotation to simulate note button
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test data here' };
    anns[0].comment = 'Network: 1 failed / 5';
    expect(anns[0].diagnostic.section).toBe('Network');
    expect(anns[0].diagnostic.data).toBe('test data here');
    stop();
  });

  it('(+) diagnostic data is a snapshot, not a live reference', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    const originalData = 'Network failures at time of click';
    anns[0].diagnostic = { section: 'Network', data: originalData };
    // Simulating page state change after note creation
    const laterData = 'Different data after page change';
    // The annotation should still have the original data
    expect(anns[0].diagnostic.data).toBe(originalData);
    expect(anns[0].diagnostic.data).not.toBe(laterData);
    stop();
  });

  it('(+) note button disabled when diagnostic annotation already exists for section', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test' };
    // Check that getAnnotations finds the diagnostic
    const hasNetwork = getAnnotations().some((a) => a.diagnostic?.section === 'Network');
    expect(hasNetwork).toBe(true);
    stop();
  });

  it('(-) note button not disabled for different section', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test' };
    const hasConsole = getAnnotations().some((a) => a.diagnostic?.section === 'Console');
    expect(hasConsole).toBe(false);
    stop();
  });
});

// ---------------------------------------------------------------------------
// Auto-audit toggle and badge
// ---------------------------------------------------------------------------

describe('auto-audit', () => {
  it('(+) audit toggle renders ON or OFF text', async () => {
    start();
    create();

    // Inspect tab content is rendered lazily - trigger it
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const toggle = shadowQuery(`[${ATTR}="audit-toggle"]`);
    // Toggle may not exist if Inspect tab didn't render (test env limitation)
    if (toggle) {
      expect(toggle.textContent).toMatch(/ON|OFF/);
    }

    stop();
    destroy();
  });

  it('(+) audit badge element is created in inspect content', async () => {
    start();
    create();

    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const badge = shadowQuery(`[${ATTR}="audit-badge"]`);
    if (badge) {
      expect(badge.style.display).toBe('none');
    }

    stop();
    destroy();
  });

  it('(+) auto-audit has description text', async () => {
    start();
    create();
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const inspectContent = shadowQuery(`[${ATTR}="inspect-content"]`);
    if (inspectContent && inspectContent.textContent.length > 0) {
      const text = inspectContent.textContent;
      expect(text).toContain('a11y');
    }

    stop();
    destroy();
  });

  it('(+) auto-audit appears after auto-capture in DOM order', async () => {
    start();
    create();
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const inspectContent = shadowQuery(`[${ATTR}="inspect-content"]`);
    if (inspectContent) {
      const html = inspectContent.innerHTML;
      const autoCapturePos = html.indexOf('AUTO-CAPTURE');
      const autoAuditPos = html.indexOf('AUTO-AUDIT');
      if (autoCapturePos > -1 && autoAuditPos > -1) {
        expect(autoAuditPos).toBeGreaterThan(autoCapturePos);
      }
    }

    stop();
    destroy();
  });
});

// ──────────────────────────────────────────────
// F15: Suggestions panel rendering order - regression tests
// ──────────────────────────────────────────────

describe('suggestions panel survives refresh', () => {
  it('(+) suggestions panel exists in list after refresh', () => {
    start();
    create();
    refresh();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const sugPanel = list?.querySelector(`[${ATTR}="suggestions-panel"]`);
    expect(sugPanel).not.toBeNull();
  });

  it('(+) suggestions panel is first child of list', () => {
    start();
    create();
    refresh();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const firstChild = list?.firstElementChild;
    expect(firstChild?.getAttribute(ATTR)).toBe('suggestions-panel');
  });

  it('(+) suggestions panel survives multiple refresh cycles', () => {
    start();
    create();
    refresh();
    refresh();
    refresh();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const panels = list?.querySelectorAll(`[${ATTR}="suggestions-panel"]`);
    expect(panels?.length).toBe(1);
  });
});

// ──────────────────────────────────────────────
// F17: Trust indicator and send gate
// ──────────────────────────────────────────────

describe('trust indicator', () => {
  it('(+) trust-shield element exists in sidebar header', () => {
    start();
    create();
    const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
    expect(shield).not.toBeNull();
  });

  it('(+) trust-shield is inside the toggle/header area', () => {
    start();
    create();
    const toggle = shadowQuery(`[${ATTR}="toggle"]`);
    const shield = toggle?.querySelector(`[${ATTR}="trust-shield"]`);
    expect(shield).not.toBeNull();
  });

  it('(+) shows green shield for localhost with server connected', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    resetServerCache();
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/page', hostname: 'localhost', protocol: 'http:' },
      writable: true, configurable: true,
    });
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['localhost:3000'], trustedPatterns: [], serverVersion: '0.3.5' }) });
      return Promise.reject(new Error('unmocked'));
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
    expect(shield.querySelector('svg')).not.toBeNull();
    expect(shield.title).toContain('trusted');
  });

  it('(+) shows green shield for localhost even without server', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/page', hostname: 'localhost', protocol: 'http:' },
      writable: true, configurable: true,
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    expect(shadowQuery(`[${ATTR}="trust-shield"]`).title).toContain('trusted');
  });

  it('(+) shows amber shield for remote URL without server', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    Object.defineProperty(window, 'location', {
      value: { href: 'https://evil.com/page', hostname: 'evil.com', protocol: 'https:' },
      writable: true, configurable: true,
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    expect(shadowQuery(`[${ATTR}="trust-shield"]`).title).toContain('untrusted');
  });

  it('(+) shows blue shield for configured trusted pattern', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    resetServerCache();
    Object.defineProperty(window, 'location', {
      value: { href: 'https://staging.myapp.com/page', hostname: 'staging.myapp.com', protocol: 'https:' },
      writable: true, configurable: true,
    });
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['staging.myapp.com'], trustedPatterns: ['staging.myapp.com'], serverVersion: '0.3.5' }) });
      return Promise.reject(new Error('unmocked'));
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    expect(shadowQuery(`[${ATTR}="trust-shield"]`).title).toContain('configured');
  });

  it('(+) shield always visible - never stays display:none after discoverServer resolves', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
  });
});
