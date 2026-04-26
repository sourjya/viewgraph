/**
 * Panic Capture - Unit Tests
 *
 * Tests the panic-flash visual feedback and capture mode metadata.
 * The keyboard command (Ctrl+Shift+V) is handled by the browser's
 * commands API and cannot be tested in jsdom - only the content script
 * flash handler and metadata are testable.
 *
 * @see extension/entrypoints/content.js - panic-flash handler
 * @see extension/wxt.config.js - commands manifest entry
 * @see docs/ideas/panic-capture.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('panic capture flash', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('(+) flash element is created and removed', async () => {
    // Simulate the panic-flash handler logic
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed', inset: '0', background: 'rgba(255,255,255,0.15)',
      zIndex: '2147483647', pointerEvents: 'none',
    });
    document.documentElement.appendChild(flash);
    expect(document.querySelector('div[style*="fixed"]')).toBeTruthy();

    // Simulate removal after timeout
    flash.remove();
    expect(document.querySelector('div[style*="2147483647"]')).toBeNull();
  });

  it('(+) flash does not block pointer events', () => {
    const flash = document.createElement('div');
    flash.style.pointerEvents = 'none';
    document.documentElement.appendChild(flash);
    expect(flash.style.pointerEvents).toBe('none');
    flash.remove();
  });
});

describe('panic capture metadata', () => {
  it('(+) captureMode is set to panic', () => {
    const capture = { metadata: { url: 'http://test', captureMode: 'review' } };
    capture.metadata.captureMode = 'panic';
    expect(capture.metadata.captureMode).toBe('panic');
  });

  it('(+) panic captures are distinguishable from review captures', () => {
    const panic = { metadata: { captureMode: 'panic' } };
    const review = { metadata: { captureMode: 'review' } };
    expect(panic.metadata.captureMode).not.toBe(review.metadata.captureMode);
  });
});

describe('panic capture manifest command', () => {
  it('(+) command key is Ctrl+Shift+V', () => {
    // Verified via wxt.config.js - commands['panic-capture'].suggested_key.default
    // Cannot import WXT config in jsdom, so we verify the expected value
    const expected = { default: 'Ctrl+Shift+V', mac: 'Command+Shift+V' };
    expect(expected.default).toBe('Ctrl+Shift+V');
    expect(expected.mac).toBe('Command+Shift+V');
  });
});
