/**
 * BUG-031: Record Flow blocks page interaction.
 *
 * Verifies that annotate mode is paused during recording so clicks
 * pass through to the web app, and resumed when recording stops.
 *
 * @see extension/lib/annotate.js - pause/resume
 * @see extension/lib/sidebar/toggles.js - recBtn handler
 * @see docs/bugs/BUG-031-record-flow-blocks-page-interaction.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { start, stop, pause, resume, isActive } from '#lib/annotate.js';
import { mockChrome } from '../mocks/chrome.js';

beforeEach(() => {
  document.body.innerHTML = '<button id="app-btn">Click me</button>';
  mockChrome();
});

afterEach(() => {
  stop();
  document.body.innerHTML = '';
});

describe('BUG-031: Record Flow allows page interaction', () => {
  it('(-) click listener is active when annotate starts (blocks interaction)', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    start();
    // Verify click listener was added in capture phase (this is what blocks clicks)
    const clickCall = addSpy.mock.calls.find(([event]) => event === 'click');
    expect(clickCall).toBeTruthy();
    expect(clickCall[2]).toBe(true); // capture: true
    addSpy.mockRestore();
  });

  it('(+) clicks pass through after pause (recording started)', () => {
    start();
    pause();
    const btn = document.getElementById('app-btn');

    // Simulate click - no capture listener to intercept
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(event);

    // Event should NOT be prevented - annotate listeners are removed
    expect(event.defaultPrevented).toBe(false);
  });

  it('(+) click listener is re-added after resume (blocks interaction again)', () => {
    start();
    pause();
    const addSpy = vi.spyOn(document, 'addEventListener');
    resume();
    const clickCall = addSpy.mock.calls.find(([event]) => event === 'click');
    expect(clickCall).toBeTruthy();
    expect(clickCall[2]).toBe(true); // capture: true
    addSpy.mockRestore();
  });

  it('(+) resume is no-op when not active', () => {
    // Should not throw when called without start()
    expect(() => resume()).not.toThrow();
  });

  it('(+) pause removes click listener from document', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    start();
    pause();
    const clickCall = removeSpy.mock.calls.find(([event]) => event === 'click');
    expect(clickCall).toBeTruthy();
    removeSpy.mockRestore();
  });

  it('(+) resume re-adds click listener to document', () => {
    start();
    pause();
    const addSpy = vi.spyOn(document, 'addEventListener');
    resume();
    const clickCall = addSpy.mock.calls.find(([event]) => event === 'click');
    expect(clickCall).toBeTruthy();
    addSpy.mockRestore();
  });

  it('(+) isActive remains true during pause/resume cycle', () => {
    start();
    expect(isActive()).toBe(true);
    pause();
    expect(isActive()).toBe(true);
    resume();
    expect(isActive()).toBe(true);
  });
});
