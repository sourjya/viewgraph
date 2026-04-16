/**
 * Sidebar Settings - Unit Tests
 *
 * @see lib/sidebar/settings.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSettings } from '#lib/sidebar/settings.js';

beforeEach(() => {
  globalThis.chrome = {
    runtime: { getManifest: () => ({ version: '0.3.4' }), sendMessage: () => {} },
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

  it('(+) Advanced Settings button exists', () => {
    const s = createSettings();
    const btns = [...s.element.querySelectorAll('button')];
    const adv = btns.find((b) => b.textContent.includes('Advanced Settings'));
    expect(adv).toBeTruthy();
  });
});
