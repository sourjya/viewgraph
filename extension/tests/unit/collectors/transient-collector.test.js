/**
 * Transient UI State Collector Tests
 *
 * Covers: mutation buffer, toast heuristic, issue detection (toast-no-aria-live,
 * flash-content, rapid-reflow, animation-jank), timeline output, and cleanup.
 *
 * @see extension/lib/collectors/transient-collector.js
 * @see .kiro/specs/transient-capture/tasks.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startTransientObserver,
  stopTransientObserver,
  resetTransient,
  collectTransient,
} from '#lib/collectors/transient-collector.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  resetTransient();
});

afterEach(() => {
  resetTransient();
});

describe('transient collector - mutation buffer', () => {
  it('(+) records added elements in buffer', async () => {
    startTransientObserver();
    const el = document.createElement('div');
    el.textContent = 'Hello';
    el.id = 'test-el';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    expect(result.timeline.length).toBeGreaterThan(0);
    const added = result.timeline.find((e) => e.action === 'added' && e.selector.includes('test-el'));
    expect(added).toBeDefined();
    expect(added.text).toBe('Hello');
  });

  it('(+) records removed elements in buffer', async () => {
    startTransientObserver();
    const el = document.createElement('div');
    el.id = 'remove-me';
    el.textContent = 'Bye';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    document.body.removeChild(el);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    const removed = result.timeline.find((e) => e.action === 'removed' && e.selector.includes('remove-me'));
    expect(removed).toBeDefined();
    expect(removed.lifespan).toBeGreaterThan(0);
  });

  it('(+) limits buffer to 100 entries', async () => {
    startTransientObserver();
    for (let i = 0; i < 120; i++) {
      const el = document.createElement('span');
      el.textContent = `item-${i}`;
      document.body.appendChild(el);
    }
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    expect(result.timeline.length).toBeLessThanOrEqual(100);
  });

  it('(-) excludes ViewGraph UI mutations', async () => {
    startTransientObserver();
    const vgEl = document.createElement('div');
    vgEl.setAttribute('data-vg-annotate', 'panel');
    document.body.appendChild(vgEl);
    const child = document.createElement('span');
    child.textContent = 'VG internal';
    vgEl.appendChild(child);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    const vgEntries = result.timeline.filter((e) => e.text?.includes('VG internal'));
    expect(vgEntries.length).toBe(0);
  });

  it('(+) stopTransientObserver clears buffer', async () => {
    startTransientObserver();
    document.body.appendChild(document.createElement('div'));
    await new Promise((r) => setTimeout(r, 50));
    stopTransientObserver();
    const result = collectTransient();
    expect(result.timeline.length).toBe(0);
  });
});

describe('transient collector - toast heuristic', () => {
  it('(+) detects toast element (position:fixed + high z-index)', async () => {
    startTransientObserver();
    const toast = document.createElement('div');
    toast.textContent = 'Success!';
    toast.id = 'toast';
    toast.style.position = 'fixed';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    const entry = result.timeline.find((e) => e.selector.includes('toast'));
    expect(entry).toBeDefined();
  });

  it('(-) does NOT flag element with position:static as toast', async () => {
    startTransientObserver();
    const el = document.createElement('div');
    el.textContent = 'Normal element';
    el.style.position = 'static';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    expect(result.issues.filter((i) => i.type === 'toast-no-aria-live').length).toBe(0);
  });

  it('(-) does NOT flag ViewGraph UI elements as toast', async () => {
    startTransientObserver();
    const el = document.createElement('div');
    el.setAttribute('data-vg-annotate', 'tooltip');
    el.textContent = 'Tooltip';
    el.style.position = 'fixed';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    expect(result.issues.length).toBe(0);
  });
});

describe('transient collector - issue detection', () => {
  it('(+) flags toast without aria-live as major issue', async () => {
    startTransientObserver();
    const toast = document.createElement('div');
    toast.textContent = 'Error occurred';
    toast.style.position = 'fixed';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    const issue = result.issues.find((i) => i.type === 'toast-no-aria-live');
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('major');
    expect(issue.message).toContain('Error occurred');
    expect(issue.evidence.hasAriaLive).toBe(false);
  });

  it('(-) does NOT flag toast with aria-live ancestor', async () => {
    startTransientObserver();
    const container = document.createElement('div');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
    const toast = document.createElement('div');
    toast.textContent = 'Saved!';
    toast.style.position = 'fixed';
    toast.style.zIndex = '9999';
    container.appendChild(toast);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    const issue = result.issues.find((i) => i.type === 'toast-no-aria-live');
    expect(issue).toBeUndefined();
  });

  it('(+) flags flash content (lifespan < 500ms)', async () => {
    vi.useFakeTimers();
    startTransientObserver();
    const el = document.createElement('div');
    el.textContent = 'Loading...';
    el.id = 'flash';
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(50);
    document.body.removeChild(el);
    await vi.advanceTimersByTimeAsync(50);
    const result = collectTransient();
    const issue = result.issues.find((i) => i.type === 'flash-content');
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('warning');
    expect(issue.lifespan).toBeLessThan(500);
    vi.useRealTimers();
  });

  it('(-) does NOT flag element with lifespan > 500ms as flash', async () => {
    vi.useFakeTimers();
    startTransientObserver();
    const el = document.createElement('div');
    el.textContent = 'Visible long enough';
    el.id = 'not-flash';
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(600);
    document.body.removeChild(el);
    await vi.advanceTimersByTimeAsync(50);
    const result = collectTransient();
    const issue = result.issues.find((i) => i.type === 'flash-content');
    expect(issue).toBeUndefined();
    vi.useRealTimers();
  });

  it('(+) flags rapid reflow (3+ add/remove in 5s)', async () => {
    vi.useFakeTimers();
    startTransientObserver();
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.className = 'flicker';
      el.textContent = 'blink';
      document.body.appendChild(el);
      await vi.advanceTimersByTimeAsync(100);
      document.body.removeChild(el);
      await vi.advanceTimersByTimeAsync(100);
    }
    const result = collectTransient();
    const issue = result.issues.find((i) => i.type === 'rapid-reflow');
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('major');
    expect(issue.evidence.count).toBeGreaterThanOrEqual(3);
    vi.useRealTimers();
  });

  it('(-) does NOT flag 2 add/remove cycles as rapid reflow', async () => {
    vi.useFakeTimers();
    startTransientObserver();
    for (let i = 0; i < 2; i++) {
      const el = document.createElement('div');
      el.className = 'flicker';
      el.textContent = 'blink';
      document.body.appendChild(el);
      await vi.advanceTimersByTimeAsync(100);
      document.body.removeChild(el);
      await vi.advanceTimersByTimeAsync(100);
    }
    const result = collectTransient();
    const issue = result.issues.find((i) => i.type === 'rapid-reflow');
    expect(issue).toBeUndefined();
    vi.useRealTimers();
  });
});

describe('transient collector - output structure', () => {
  it('(+) collectTransient returns correct shape', () => {
    startTransientObserver();
    const result = collectTransient();
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('timeline');
    expect(result).toHaveProperty('animations');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.timeline)).toBe(true);
    expect(Array.isArray(result.animations)).toBe(true);
    expect(typeof result.summary.transientElements).toBe('number');
    expect(typeof result.summary.issues).toBe('number');
    expect(typeof result.summary.activeAnimations).toBe('number');
  });

  it('(+) timeline entries have relative timestamps (negative)', async () => {
    startTransientObserver();
    document.body.appendChild(document.createElement('span'));
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    if (result.timeline.length > 0) {
      expect(result.timeline[0].t).toBeLessThanOrEqual(0);
    }
  });

  it('(+) summary counts match arrays', async () => {
    startTransientObserver();
    const toast = document.createElement('div');
    toast.textContent = 'Alert!';
    toast.style.position = 'fixed';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    await new Promise((r) => setTimeout(r, 50));
    const result = collectTransient();
    expect(result.summary.issues).toBe(result.issues.length);
    expect(result.summary.transientElements).toBe(result.timeline.length);
    expect(result.summary.activeAnimations).toBe(result.animations.length);
  });
});
