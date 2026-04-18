/**
 * Sidebar trust indicator tests.
 *
 * Covers trust shield rendering for localhost, remote, configured patterns,
 * and server connected/disconnected states. Uses dynamic imports for
 * resetServerCache and per-test window.location overrides.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  start, create, ATTR,
  shadowQuery,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('trust indicator', () => {
  it('(+) trust-shield element exists in sidebar header', () => {
    start();
    create();
    const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
    expect(shield).not.toBeNull();
  });

  it('(+) trust-shield is inside the footer status row (ADR-012)', () => {
    start();
    create();
    const footer = shadowQuery(`[${ATTR}="footer"]`);
    const shield = footer?.querySelector(`[${ATTR}="trust-shield"]`);
    expect(shield).not.toBeNull();
  });

  it('(+) shows green shield for localhost with server connected', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    resetServerCache();
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/page', hostname: 'localhost', protocol: 'http:' },
      writable: true, configurable: true,
    });
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['localhost:3000'], trustedPatterns: [], serverVersion: '0.3.5' }) });
      return Promise.reject(new Error('unmocked'));
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
    expect(shield.querySelector('svg')).not.toBeNull();
    expect(shield.getAttribute('data-tooltip')).toContain('trusted');
  });

  it('(+) shows green shield for localhost even without server', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/page', hostname: 'localhost', protocol: 'http:' },
      writable: true, configurable: true,
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    expect(shadowQuery(`[${ATTR}="trust-shield"]`).getAttribute('data-tooltip')).toContain('trusted');
  });

  it('(+) shows amber shield for remote URL without server', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    Object.defineProperty(window, 'location', {
      value: { href: 'https://evil.com/page', hostname: 'evil.com', protocol: 'https:' },
      writable: true, configurable: true,
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    expect(shadowQuery(`[${ATTR}="trust-shield"]`).getAttribute('data-tooltip')).toContain('untrusted');
  });

  it('(+) shows blue shield for configured trusted pattern', async () => {
    const { resetServerCache } = await import('#lib/constants.js');
    resetServerCache();
    Object.defineProperty(window, 'location', {
      value: { href: 'https://staging.myapp.com/page', hostname: 'staging.myapp.com', protocol: 'https:' },
      writable: true, configurable: true,
    });
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['staging.myapp.com'], trustedPatterns: ['staging.myapp.com'], serverVersion: '0.3.5' }) });
      return Promise.reject(new Error('unmocked'));
    });
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
    expect(shadowQuery(`[${ATTR}="trust-shield"]`).getAttribute('data-tooltip')).toContain('configured');
  });

  it('(+) shield always visible - never stays display:none after discoverServer resolves', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    start();
    create();
    await vi.waitFor(() => {
      const shield = shadowQuery(`[${ATTR}="trust-shield"]`);
      expect(shield?.style.display).toBe('inline-flex');
    }, { timeout: 3000 });
  });
});
