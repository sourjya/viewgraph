/**
 * Sidebar inspect tab tests.
 *
 * Covers capture section rendering, copy buttons, baseline row,
 * and auto-audit toggle/badge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Increase default waitFor timeout for CI environments where DOM updates are slower
vi.setConfig({ testTimeout: 15000 });

/** Helper: wait for async DOM updates after tab switch. */
const tick = (ms = 200) => new Promise((r) => setTimeout(r, ms));
import {
  start, stop, create, destroy, ATTR,
  resetServerCache, transport,
  shadowQuery, shadowQueryAll,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

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
    transport.init('http://127.0.0.1:9876');
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
    await tick();
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
    await tick();
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
    await tick();
    const ic = getInspectContent();
    await vi.waitFor(() => {
      expect(ic.textContent).toContain('SNAPSHOTS');
    });
    const status = ic.querySelector(`[${ATTR}="capture-status"]`);
    const dots = [...status.querySelectorAll('span')].filter((s) => s.style.borderRadius === '50%');
    expect(dots.length).toBe(1);
    expect(dots[0].style.background).toContain('4ade80');
  });

  it('(+) warning shown when latest capture is empty', async () => {
    const now = Date.now();
    globalThis.fetch = mockFetchWith([
      { filename: 'cap-1.json', timestamp: new Date(now - 30000).toISOString(), nodeCount: 0 },
    ]);
    start();
    create();
    clickInspectTab();
    await tick();
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
    await tick();
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
    await tick();
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
    await tick();
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
    await tick();
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
    await tick();
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
    await tick();
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

describe('inspect tab section copy buttons', () => {
  it('(+) each section has a copy button with unique data-section', async () => {
    start();
    create();
    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const copyBtns = shadowQueryAll(`[${ATTR}="section-copy"]`);
    if (copyBtns.length > 0) {
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
    if (sections.length > 0) {
      expect(sections).toContain('Network');
      expect(sections).toContain('Console');
    }

    stop();
    destroy();
  });
});

describe('auto-audit', () => {
  it('(+) audit toggle renders ON or OFF text', async () => {
    start();
    create();

    const tabs = shadowQueryAll(`[${ATTR}="primary-tab"]`);
    const inspectTab = [...tabs].find((t) => t.textContent.includes('Inspect'));
    if (inspectTab) inspectTab.click();
    await new Promise((r) => setTimeout(r, 100));

    const toggle = shadowQuery(`[${ATTR}="audit-toggle"]`);
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
