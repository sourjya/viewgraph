/**
 * Sidebar Captures - Unit Tests
 *
 * @see lib/sidebar/captures.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderCaptures } from '#lib/sidebar/captures.js';
import { resetServerCache } from '#lib/constants.js';
import * as transport from '#lib/transport.js';

beforeEach(() => {
  resetServerCache();
  transport.init('http://127.0.0.1:9876');
  globalThis.chrome = { runtime: { sendNativeMessage: undefined } };
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost:8040/page', hostname: 'localhost', protocol: 'http:' },
    writable: true, configurable: true,
  });
});

describe('renderCaptures', () => {
  it('(+) does nothing when server is offline', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    const container = document.createElement('div');
    await renderCaptures(container);
    expect(container.children.length).toBe(0);
  });

  it('(+) does nothing when no captures returned', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (url.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (url.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['localhost:8040'] }) });
      if (url.includes('/captures')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ captures: [] }) });
      return Promise.reject(new Error('unmocked'));
    });
    const container = document.createElement('div');
    await renderCaptures(container);
    expect(container.children.length).toBe(0);
  });

  it('(+) renders capture info when captures exist', async () => {
    const now = new Date().toISOString();
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['localhost:8040'], serverVersion: 'test' }) });
      if (u.includes('/captures')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ captures: [{ filename: 'cap-1.json', url: 'http://localhost:8040/page', timestamp: now, nodeCount: 50, title: 'Test' }] }) });
      if (u.includes('/baselines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ baselines: [] }) });
      if (u.includes('/annotations')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ resolved: [] }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });
    const container = document.createElement('div');
    await renderCaptures(container);
    expect(container.children.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('SNAPSHOTS');
  });

  it('(+) shows warning for empty capture', async () => {
    const now = new Date().toISOString();
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['localhost:8040'], serverVersion: 'test' }) });
      if (u.includes('/captures')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ captures: [{ filename: 'cap-1.json', url: 'http://localhost:8040/page', timestamp: now, nodeCount: 0 }] }) });
      if (u.includes('/baselines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ baselines: [] }) });
      if (u.includes('/annotations')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ resolved: [] }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });
    const container = document.createElement('div');
    await renderCaptures(container);
    expect(container.textContent).toContain('empty');
  });

  it('(+) shows baseline section', async () => {
    const now = new Date().toISOString();
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      if (u.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ projectRoot: '/test', urlPatterns: ['localhost:8040'], serverVersion: 'test' }) });
      if (u.includes('/captures')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ captures: [{ filename: 'cap-1.json', url: 'http://localhost:8040/page', timestamp: now, nodeCount: 50 }] }) });
      if (u.includes('/baselines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ baselines: [] }) });
      if (u.includes('/annotations')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ resolved: [] }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });
    const container = document.createElement('div');
    await renderCaptures(container);
    expect(container.textContent).toContain('BASELINE');
  });
});
