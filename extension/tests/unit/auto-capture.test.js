/**
 * Auto-Capture Controller - Unit Tests
 *
 * Tests the auto-capture lifecycle (start/stop/status).
 * Full integration with HMR detection is tested via hmr-detector.test.js.
 *
 * @see lib/auto-capture.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutoCapture, stopAutoCapture, isAutoCapturing } from '#lib/auto-capture.js';

// Mock chrome.runtime.sendMessage
vi.stubGlobal('chrome', {
  runtime: { sendMessage: vi.fn() },
});

// Mock matchMedia (used by breakpoint-collector)
vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
window.matchMedia = vi.fn().mockReturnValue({ matches: false });

beforeEach(() => {
  stopAutoCapture();
  vi.useFakeTimers();
});
afterEach(() => {
  stopAutoCapture();
  vi.useRealTimers();
});

describe('auto-capture controller', () => {
  it('(+) starts and reports active', () => {
    expect(isAutoCapturing()).toBe(false);
    startAutoCapture();
    expect(isAutoCapturing()).toBe(true);
  });

  it('(+) stops and reports inactive', () => {
    startAutoCapture();
    stopAutoCapture();
    expect(isAutoCapturing()).toBe(false);
  });

  it('(-) double start is safe', () => {
    startAutoCapture();
    startAutoCapture(); // Should not throw or create duplicate watchers
    expect(isAutoCapturing()).toBe(true);
    stopAutoCapture();
  });

  it('(-) double stop is safe', () => {
    startAutoCapture();
    stopAutoCapture();
    stopAutoCapture(); // Should not throw
    expect(isAutoCapturing()).toBe(false);
  });

  it('(+) triggers capture on HMR event', () => {
    const onCapture = vi.fn();
    startAutoCapture({ debounceMs: 50, onCapture });
    document.dispatchEvent(new Event('vite:afterUpdate'));
    vi.advanceTimersByTime(100);
    expect(onCapture).toHaveBeenCalledTimes(1);
    stopAutoCapture();
  });
});
