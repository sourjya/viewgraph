/**
 * Service Worker State Collector - Unit Tests
 *
 * Tests service worker detection when navigator.serviceWorker is
 * undefined (no SW support) and when a mock controller is present.
 *
 * @see lib/collectors/service-worker-collector.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { collectServiceWorkerState } from '#lib/collectors/service-worker-collector.js';

describe('collectServiceWorkerState', () => {
  const origSW = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', { value: origSW, configurable: true });
  });

  it('(-) returns null controller when serviceWorker is undefined', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    const result = await collectServiceWorkerState();
    expect(result.controller).toBeNull();
  });

  it('(+) returns controller info when SW is active', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: { scriptURL: 'https://example.com/sw.js', state: 'activated' },
      },
      configurable: true,
    });
    const result = await collectServiceWorkerState();
    expect(result.controller).toEqual({
      scriptURL: 'https://example.com/sw.js',
      state: 'activated',
    });
  });

  it('(-) returns empty caches array by default', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    const result = await collectServiceWorkerState();
    expect(Array.isArray(result.caches)).toBe(true);
  });
});
