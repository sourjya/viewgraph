/**
 * Continuous Capture Watcher Tests
 *
 * Tests MutationObserver-based auto-capture with debounce, rate limiting,
 * HMR event handling, and visibility pause behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startWatcher, stopWatcher, isWatcherEnabled, resetWatcher } from '#lib/session/continuous-capture.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"><p>Hello</p></div>';
  resetWatcher();
});

afterEach(() => {
  stopWatcher();
  vi.restoreAllMocks();
});

describe('continuous capture watcher', () => {
  it('(+) starts and stops cleanly', () => {
    const cb = vi.fn();
    startWatcher(cb);
    expect(isWatcherEnabled()).toBe(true);
    stopWatcher();
    expect(isWatcherEnabled()).toBe(false);
  });

  it('(+) triggers capture on DOM mutation after debounce', async () => {
    const cb = vi.fn();
    startWatcher(cb);
    // Mutate the DOM
    document.getElementById('app').appendChild(document.createElement('span'));
    // Wait for 2s debounce + buffer
    await new Promise((r) => setTimeout(r, 2200));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('(+) debounces rapid mutations into single capture', async () => {
    const cb = vi.fn();
    startWatcher(cb);
    const app = document.getElementById('app');
    // Fire 5 mutations in quick succession
    for (let i = 0; i < 5; i++) {
      app.appendChild(document.createElement('div'));
    }
    await new Promise((r) => setTimeout(r, 2500));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('(+) rate limits to 1 capture per 5s', async () => {
    const cb = vi.fn();
    startWatcher(cb);
    const app = document.getElementById('app');
    // First mutation
    app.appendChild(document.createElement('span'));
    await new Promise((r) => setTimeout(r, 2200));
    expect(cb).toHaveBeenCalledTimes(1);
    // Second mutation immediately after - should be rate limited
    app.appendChild(document.createElement('div'));
    await new Promise((r) => setTimeout(r, 2200));
    expect(cb).toHaveBeenCalledTimes(1); // still 1
  });

  it('(-) ignores mutations inside ViewGraph UI elements', async () => {
    const cb = vi.fn();
    // Pre-add the VG element before starting watcher
    const vgEl = document.createElement('div');
    vgEl.setAttribute('data-vg-annotate', 'panel');
    document.body.appendChild(vgEl);
    startWatcher(cb);
    // Mutate inside the VG element - should be ignored
    vgEl.appendChild(document.createElement('span'));
    vgEl.textContent = 'changed';
    await new Promise((r) => setTimeout(r, 2500));
    expect(cb).not.toHaveBeenCalled();
  });

  it('(-) does not trigger after stopWatcher', async () => {
    const cb = vi.fn();
    startWatcher(cb);
    stopWatcher();
    document.getElementById('app').appendChild(document.createElement('span'));
    await new Promise((r) => setTimeout(r, 2500));
    expect(cb).not.toHaveBeenCalled();
  });

  it('(+) responds to vite:afterUpdate event', async () => {
    const cb = vi.fn();
    startWatcher(cb);
    document.dispatchEvent(new CustomEvent('vite:afterUpdate'));
    await new Promise((r) => setTimeout(r, 1200));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
