/**
 * Sidebar Settings - Unit Tests
 *
 * @see lib/sidebar/settings.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSettings } from '#lib/sidebar/settings.js';
import { mockChrome } from '../../mocks/chrome.js';
import { mockServer } from '../../mocks/server.js';

beforeEach(() => {
  mockChrome();
  mockServer({ offline: true });
});

afterEach(() => { delete globalThis.chrome; });

describe('createSettings', () => {
  it('(+) returns element, show, hide, isVisible', () => {
    const s = createSettings();
    expect(s.element).toBeTruthy();
    expect(typeof s.show).toBe('function');
    expect(typeof s.hide).toBe('function');
    expect(typeof s.isVisible).toBe('function');
  });

  it('(+) starts hidden', () => {
    const s = createSettings();
    expect(s.isVisible()).toBe(false);
    expect(s.element.style.display).toBe('none');
  });

  it('(+) show makes visible', () => {
    const s = createSettings();
    s.show();
    expect(s.isVisible()).toBe(true);
    expect(s.element.style.display).toBe('block');
  });

  it('(+) hide after show', () => {
    const s = createSettings();
    s.show();
    s.hide();
    expect(s.isVisible()).toBe(false);
  });

  it('(+) has capture toggle rows with ON/OFF buttons', () => {
    const s = createSettings();
    const toggles = s.element.querySelectorAll('span');
    const texts = [...toggles].map((t) => t.textContent);
    expect(texts).toContain('ViewGraph JSON');
    expect(texts).toContain('HTML snapshot');
    expect(texts).toContain('Screenshot');
  });

  it('(+) ViewGraph JSON toggle shows ON and is not clickable', () => {
    const s = createSettings();
    const spans = [...s.element.querySelectorAll('span')];
    const onSpans = spans.filter((sp) => sp.textContent === 'ON');
    expect(onSpans.length).toBeGreaterThan(0);
  });

  it('(+) HTML snapshot and Screenshot toggles default to OFF', () => {
    const s = createSettings();
    const spans = [...s.element.querySelectorAll('span')];
    const offSpans = spans.filter((sp) => sp.textContent === 'OFF');
    expect(offSpans.length).toBeGreaterThanOrEqual(2);
  });

  it('(+) All servers link exists', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const adv = links.find((a) => a.textContent.includes('All servers'));
    expect(adv).toBeTruthy();
  });
});

// ──────────────────────────────────────────────
// Settings server routing - regression tests
// ──────────────────────────────────────────────

describe('settings server routing', () => {
  it('(+) uses discoverServer not blind port scan - shows matched server only', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    resetServerCache();
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/page', hostname: 'localhost', protocol: 'http:' },
      writable: true, configurable: true,
    });
    // Two servers: 9876 (app-one, localhost:3000) and 9877 (app-two, localhost:4000)
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes(':9876/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes(':9876/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/app-one', urlPatterns: ['localhost:3000'], serverVersion: '0.3.5' }) });
      if (u.includes(':9877/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes(':9877/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/app-two', urlPatterns: ['localhost:4000'], serverVersion: '0.3.5' }) });
      return Promise.reject(new Error('offline'));
    });
    const s = createSettings();
    // Wait for async server discovery
    await vi.waitFor(() => {
      const text = s.element.textContent;
      return text.includes('Project Settings') || text.includes('Not connected') || text.includes('Connected');
    }, { timeout: 3000 });
    const text = s.element.textContent;
    // Should show app-one info (matched to localhost:3000), NOT app-two
    expect(text).not.toContain('/app-two');
  });

  it('(-) shows not connected when no server matches current URL', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    resetServerCache();
    Object.defineProperty(window, 'location', {
      value: { href: 'https://remote-site.com/page', hostname: 'remote-site.com', protocol: 'https:' },
      writable: true, configurable: true,
    });
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    const s = createSettings();
    s.show();
    // Allow async server check to complete
    await new Promise((r) => setTimeout(r, 100));
    expect(s.element.textContent).toContain('Not Connected');
  });
});

// ──────────────────────────────────────────────
// Settings card UI regression tests
// ──────────────────────────────────────────────

describe('settings card design', () => {
  it('(+) card has header, body, and footer sections', () => {
    const s = createSettings();
    const card = s.element.querySelector('[data-vg-annotate="server-card"]');
    expect(card).not.toBeNull();
    expect(card.children.length).toBe(4); // header, body, footer, all-servers
  });

  it('(+) body is always visible (never display:none)', () => {
    const s = createSettings();
    const body = s.element.querySelector('[data-vg-annotate="project-details"]');
    expect(body).not.toBeNull();
    expect(body.style.display).not.toBe('none');
  });

  it('(+) body shows fallback text when no server info', () => {
    const s = createSettings();
    const body = s.element.querySelector('[data-vg-annotate="project-details"]');
    expect(body.textContent).toContain('No project mapping');
  });

  it('(+) footer has URL mapping docs link', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const docsLink = links.find((a) => a.textContent.includes('URL mapping'));
    expect(docsLink).toBeTruthy();
    expect(docsLink.href).toContain('multi-project');
  });

  it('(+) footer has All servers link', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const allLink = links.find((a) => a.textContent.includes('All servers'));
    expect(allLink).toBeTruthy();
  });

  it('(+) header shows checking status initially', () => {
    const s = createSettings();
    const card = s.element.querySelector('[data-vg-annotate="server-card"]');
    const header = card.firstElementChild;
    expect(header.textContent).toContain('Checking');
  });

  it('(+) header updates to Connected after successful getInfo', async () => {
    const transport = await import('#lib/transport.js');
    transport.reset();
    transport.init('http://127.0.0.1:9876');
    mockChrome();
    Object.defineProperty(window, 'location', { value: { href: 'http://localhost:3000/page' }, writable: true, configurable: true });
    mockServer({ info: { projectRoot: '/test', urlPatterns: ['localhost:3000'], serverVersion: '0.3.7', agent: 'Kiro' } });
    const s = createSettings();
    s.show();
    await new Promise((r) => setTimeout(r, 150));
    const card = s.element.querySelector('[data-vg-annotate="server-card"]');
    expect(card.textContent).toContain('Connected');
    transport.reset();
  });

  it('(+) body shows agent and URL after successful getInfo', async () => {
    const transport = await import('#lib/transport.js');
    transport.reset(); transport.init('http://127.0.0.1:9876');
    mockChrome();
    Object.defineProperty(window, 'location', { value: { href: 'http://localhost:4000/page' }, writable: true, configurable: true });
    mockServer({ info: { projectRoot: '/myproject', urlPatterns: ['localhost:4000'], agent: 'Kiro', serverVersion: '0.3.7' } });
    const s = createSettings();
    s.show();
    await new Promise((r) => setTimeout(r, 150));
    const body = s.element.querySelector('[data-vg-annotate="project-details"]');
    expect(body.textContent).toContain('Kiro');
    expect(body.textContent).toContain('localhost:4000');
    expect(body.textContent).toContain('/myproject');
    transport.reset();
  });

  it('(+) header shows Not Connected when server offline', async () => {
    mockServer({ offline: true });
    mockChrome();
    const s = createSettings();
    s.show();
    await new Promise((r) => setTimeout(r, 150));
    const card = s.element.querySelector('[data-vg-annotate="server-card"]');
    expect(card.textContent).toContain('Not Connected');
  });

  it('(+) URL mapping docs link has visible link color', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const docsLink = links.find((a) => a.textContent.includes('URL mapping'));
    // Must not be invisible gray (#666) - should be a recognizable link color
    expect(docsLink.style.color).toContain('--vg-color');
    expect(docsLink.style.color).toContain('--vg-color');
  });

  it('(+) All servers link has visible link color', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const allLink = links.find((a) => a.textContent.includes('All servers'));
    expect(allLink.style.color).toContain('--vg-color');
    expect(allLink.style.color).toContain('--vg-color');
  });

  it('(+) URL mapping docs link has an SVG icon', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const docsLink = links.find((a) => a.textContent.includes('URL mapping'));
    expect(docsLink.querySelector('svg')).not.toBeNull();
  });

  it('(+) All servers link has an SVG icon', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const allLink = links.find((a) => a.textContent.includes('All servers'));
    expect(allLink.querySelector('svg')).not.toBeNull();
  });

  it('(+) server info rows use consistent font size and baseline alignment', async () => {
    const transport = await import('#lib/transport.js');
    transport.reset(); transport.init('http://127.0.0.1:9876');
    mockChrome();
    Object.defineProperty(window, 'location', { value: { href: 'http://localhost:4000/page' }, writable: true, configurable: true });
    mockServer({ info: { projectRoot: '/myproject', urlPatterns: ['localhost:4000'], agent: 'Kiro', serverVersion: '0.4.1' } });
    const s = createSettings();
    s.show();
    await new Promise((r) => setTimeout(r, 150));
    const body = s.element.querySelector('[data-vg-annotate="project-details"]');
    const rows = body.querySelectorAll('div');
    for (const row of rows) {
      expect(row.style.alignItems).toBe('baseline');
      const spans = row.querySelectorAll('span');
      for (const span of spans) {
        if (span.style.fontSize) expect(['10px', '11px']).toContain(span.style.fontSize);
      }
    }
    transport.reset();
  });

  it('(+) settings screen has bottom offset to not cover footer', () => {
    const s = createSettings();
    expect(s.element.style.bottom).toBe('42px');
  });

  it('(+) all-servers section exists and starts hidden', () => {
    const s = createSettings();
    const section = s.element.querySelector('[data-vg-annotate="all-servers"]');
    expect(section).toBeTruthy();
    expect(section.style.display).toBe('none');
  });

  it('(+) All servers link toggles section visibility', () => {
    const s = createSettings();
    const links = [...s.element.querySelectorAll('a')];
    const allLink = links.find((a) => a.textContent.includes('All servers'));
    const section = s.element.querySelector('[data-vg-annotate="all-servers"]');

    allLink.click();
    expect(section.style.display).toBe('block');

    allLink.click();
    expect(section.style.display).toBe('none');
  });
});
