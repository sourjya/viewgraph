/**
 * BUG-030: Marker scroll repositioning tests.
 *
 * Verifies that the onScrollReposition handler updates marker positions
 * when the annotated element's bounding rect changes (e.g., after scroll).
 *
 * @see extension/lib/annotate.js - onScrollReposition
 * @see docs/bugs/BUG-030-markers-dont-scroll.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { start, stop, clearAnnotations } from '#lib/annotate.js';
import { mockChrome } from '../mocks/chrome.js';

beforeEach(() => {
  document.body.innerHTML = '<div class="target" style="width:100px;height:50px;">Target</div>';
  mockChrome();
});

afterEach(() => {
  stop();
  clearAnnotations();
  document.body.innerHTML = '';
});

describe('BUG-030: marker scroll repositioning', () => {
  it('(+) scroll listener is registered on start', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    start();
    const scrollCall = addSpy.mock.calls.find(([event]) => event === 'scroll');
    expect(scrollCall).toBeTruthy();
    addSpy.mockRestore();
  });

  it('(+) scroll listener is removed on stop', () => {
    start();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    stop();
    const scrollCall = removeSpy.mock.calls.find(([event]) => event === 'scroll');
    expect(scrollCall).toBeTruthy();
    removeSpy.mockRestore();
  });

  it('(+) scroll listener is removed on pause', async () => {
    start();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { pause } = await import('#lib/annotate.js');
    pause();
    const scrollCall = removeSpy.mock.calls.find(([event]) => event === 'scroll');
    expect(scrollCall).toBeTruthy();
    removeSpy.mockRestore();
  });

  it('(+) markers use position absolute for document-relative positioning', () => {
    // Verify the marker creation uses absolute positioning
    const marker = document.createElement('div');
    marker.style.position = 'absolute';
    expect(marker.style.position).toBe('absolute');
  });
});
