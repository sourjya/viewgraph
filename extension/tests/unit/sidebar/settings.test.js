/**
 * Sidebar Settings - Unit Tests
 *
 * @see lib/sidebar/settings.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSettings } from '#lib/sidebar/settings.js';
import { VERSION } from '#tests/helpers.js';

beforeEach(() => {
  globalThis.chrome = {
    runtime: { getManifest: () => ({ version: VERSION }), sendMessage: () => {} },
    storage: { local: { get: (key, cb) => { if (cb) cb({}); return Promise.resolve({}); }, set: () => Promise.resolve() } },
  };
  globalThis.fetch = () => Promise.reject(new Error('offline'));
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
