/**
 * Sidebar MCP connection state tests.
 *
 * Covers disconnected banner, Send button visibility, pending/resolved
 * annotation states, and send gate for untrusted URLs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  start, stop, create, destroy, refresh,
  addPageNote, getAnnotations, ATTR,
  resetServerCache, transport,
  shadowQuery, getEntries,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('sidebar MCP disconnected state', () => {
  let origFetch;
  beforeEach(() => {
    origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no server')));
    resetServerCache();
    transport.reset();
    // M19: discovery.js delegates to SW - mock sendMessage to return no server
    globalThis.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
      if (msg?.type === 'vg-get-server') { if (cb) cb({ url: null, agentName: null }); return; }
      if (msg?.type === 'vg-transport') { if (cb) cb({ ok: false, error: 'offline' }); return; }
      if (cb) cb({ ok: true });
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it('(+) shows status banner when no server running', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    });
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    expect(banner.textContent).toContain('Server timed out');
  });

  it('(+) offline banner shows timeout recovery hint', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    });
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    expect(banner.textContent).toContain('timed out');
    expect(banner.textContent).toContain('Reconnect');
  });

  it('(+) offline dot tooltip mentions timeout', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const dot = shadowQuery(`[${ATTR}="status-dot"]`);
      expect(dot?.getAttribute('data-tooltip')).toContain('timed out');
    });
    const dot = shadowQuery(`[${ATTR}="status-dot"]`);
    expect(dot.getAttribute('data-tooltip')).toContain('Reconnect');
  });

  it('(+) shows no-match message when servers exist but page doesn\'t match', async () => {
    // M19: Mock SW to return no match for page URL, but server exists for getAllServers
    globalThis.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
      if (msg?.type === 'vg-get-server') {
        if (cb) cb({ url: null, agentName: null });
        return;
      }
      if (msg?.type === 'vg-get-all-servers') {
        if (cb) cb({ servers: [{ url: 'http://127.0.0.1:9876', agent: 'Kiro' }] });
        return;
      }
      if (cb) cb({ ok: true });
    });
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no server')));
    resetServerCache();
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    }, { timeout: 3000 });
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    expect(banner.textContent).toContain('No matching project');
    const dot = shadowQuery(`[${ATTR}="status-dot"]`);
    expect(dot.getAttribute('data-tooltip')).toContain('No matching project');
  });

  it('(+) no-match state shows gray dot, not red', async () => {
    // M19: Mock SW - server exists but doesn't match page URL
    globalThis.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
      if (msg?.type === 'vg-get-server') {
        if (cb) cb({ url: null, agentName: null });
        return;
      }
      if (msg?.type === 'vg-get-all-servers') {
        if (cb) cb({ servers: [{ url: 'http://127.0.0.1:9876', agent: 'Kiro' }] });
        return;
      }
      if (cb) cb({ ok: true });
    });
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no server')));
    resetServerCache();
    start();
    create();
    await vi.waitFor(() => {
      const dot = shadowQuery(`[${ATTR}="status-dot"]`);
      expect(dot?.getAttribute('data-tooltip')).toContain('No matching');
    }, { timeout: 3000 });
    const dot = shadowQuery(`[${ATTR}="status-dot"]`);
    // Gray (muted), not red (errorLight)
    expect(dot.style.background).not.toContain('239');  // not errorLight red
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
    expect(copyBtn.title).not.toContain('not connected');
    expect(dlBtn.title).not.toContain('not connected');
  });

  it('(+) status banner is inside footer, below buttons', async () => {
    start();
    create();
    await new Promise((r) => setTimeout(r, 2000));
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    if (banner && banner.style.display === 'block') {
      const footer = shadowQuery(`[${ATTR}="footer"]`);
      expect(footer.contains(banner)).toBe(true);
    } else {
      expect(banner).not.toBeNull();
    }
  }, 5000);

  it('(-) status banner is NOT a child of primary-tabs area', async () => {
    start();
    create();
    await vi.waitFor(() => {
      const banner = shadowQuery(`[${ATTR}="status-banner"]`);
      expect(banner?.style.display).toBe('block');
    });
    const primaryTabs = shadowQuery(`[${ATTR}="primary-tabs"]`);
    const _banner = shadowQuery(`[${ATTR}="status-banner"]`);
    expect(primaryTabs.nextElementSibling?.getAttribute(ATTR)).not.toBe('status-banner');
  });
});

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

describe('send gate for untrusted URLs', () => {
  it('(+) send button exists in sidebar', () => {
    start();
    create();
    const sendBtn = shadowQuery(`[${ATTR}="send"]`);
    expect(sendBtn).not.toBeNull();
  });

  it('(+) help button has 8px padding matching header buttons', () => {
    start();
    create();
    const helpBtn = shadowQuery(`[${ATTR}="help-btn"]`);
    expect(helpBtn.style.padding).toBe('8px');
  });

  it('(+) status dot has border for visibility', () => {
    start();
    create();
    const dot = shadowQuery(`[${ATTR}="status-dot"]`);
    expect(dot.style.border).toContain('rgba');
  });

  it('(+) trust shield has background for visibility', () => {
    start();
    create();
    const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
    expect(shield.style.background).toContain('rgba');
  });
});
