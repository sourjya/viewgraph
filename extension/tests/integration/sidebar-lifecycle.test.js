/**
 * Integration Tests - Sidebar Lifecycle & Resolved History
 *
 * Tests the critical path: sidebar opens -> server discovered ->
 * resolved history loads -> Resolved tab shows data.
 *
 * These tests exercise the full M19 communication chain:
 * content script -> sendMessage -> SW mock -> transport -> fetch mock -> response
 *
 * @see lib/annotation-sidebar.js - sidebar creation
 * @see lib/sidebar/sync.js - loadResolvedHistory
 * @see lib/sidebar/review.js - Resolved tab rendering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  start, stop, create, destroy, ATTR,
  resetServerCache, transport,
  shadowQuery, shadowQueryAll,
  setupBeforeEach, setupAfterEach,
} from '../unit/sidebar/sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('sidebar lifecycle - critical path', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = globalThis.fetch;
    transport.init('http://127.0.0.1:9876');
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('(+) sidebar creates and mounts in shadow DOM', () => {
    start();
    create();
    const sidebar = shadowQuery(`[${ATTR}="sidebar"]`);
    expect(sidebar).toBeTruthy();
    expect(sidebar.tagName).toBe('DIV');
  });

  it('(+) sidebar shows Review and Inspect tabs', () => {
    start();
    create();
    const tabs = shadowQuery(`[${ATTR}="primary-tabs"]`);
    expect(tabs).toBeTruthy();
    const buttons = [...tabs.querySelectorAll('button')];
    const labels = buttons.map((b) => b.textContent);
    expect(labels).toContain('Review');
    expect(labels).toContain('Inspect');
  });

  it('(+) sidebar shows filter tabs (Open/Resolved/All)', () => {
    start();
    create();
    const tabContainer = shadowQuery(`[${ATTR}="tab-container"]`);
    expect(tabContainer).toBeTruthy();
    const text = tabContainer.textContent;
    expect(text).toContain('Open');
    expect(text).toContain('Resolved');
    expect(text).toContain('All');
  });
});

describe('resolved history loading', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = globalThis.fetch;
    transport.init('http://127.0.0.1:9876');
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('(+) Resolved tab shows server history when no local annotations', async () => {
    // Mock server to return resolved annotations
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            projectRoot: '/test', urlPatterns: ['localhost:8040'],
            serverVersion: '0.6.0', agent: 'Kiro', trustedPatterns: [],
          }),
        });
      }
      if (u.includes('/annotations/resolved')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            resolved: [
              { uuid: 'r1', comment: 'Fix button alignment', type: 'element', severity: 'major', ancestor: 'button.submit', resolution: { action: 'fixed', by: 'kiro', summary: 'Added flex alignment' } },
              { uuid: 'r2', comment: 'Missing alt text', type: 'element', severity: 'minor', ancestor: 'img.hero', resolution: { action: 'fixed', by: 'kiro', summary: 'Added alt attribute' } },
            ],
          }),
        });
      }
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });

    start();
    create();

    // Wait for discovery + loadResolvedHistory to complete
    await vi.waitFor(() => {
      const tabContainer = shadowQuery(`[${ATTR}="tab-container"]`);
      expect(tabContainer?.textContent).toContain('Resolved (2)');
    }, { timeout: 3000 });

    // Click the Resolved tab
    const tabContainer = shadowQuery(`[${ATTR}="tab-container"]`);
    const resolvedTab = [...tabContainer.querySelectorAll('button')].find((b) => b.textContent.includes('Resolved'));
    resolvedTab.click();

    // Wait for the resolved entries to render
    await vi.waitFor(() => {
      const list = shadowQuery(`[${ATTR}="list"]`);
      expect(list?.textContent).toContain('Fix button alignment');
    }, { timeout: 2000 });

    const list = shadowQuery(`[${ATTR}="list"]`);
    expect(list.textContent).toContain('Missing alt text');
    expect(list.textContent).toContain('fixed by kiro');
  });

  it('(+) Resolved tab shows 0 when server has no resolved annotations', async () => {
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            projectRoot: '/test', urlPatterns: ['localhost:8040'],
            serverVersion: '0.6.0', agent: 'Kiro', trustedPatterns: [],
          }),
        });
      }
      if (u.includes('/annotations/resolved')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ resolved: [] }) });
      }
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });

    start();
    create();

    await vi.waitFor(() => {
      const tabContainer = shadowQuery(`[${ATTR}="tab-container"]`);
      expect(tabContainer?.textContent).toContain('Resolved (0)');
    }, { timeout: 3000 });
  });

  it('(+) Resolved tab count reflects server history even after extension reload', async () => {
    // This simulates the post-reload scenario: no local annotations,
    // but server has resolved history from previous sessions
    globalThis.fetch = vi.fn((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            projectRoot: '/test', urlPatterns: ['localhost:8040'],
            serverVersion: '0.6.0', agent: 'Kiro', trustedPatterns: [],
          }),
        });
      }
      if (u.includes('/annotations/resolved')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            resolved: [
              { uuid: 'a1', comment: 'Issue 1', type: 'element', resolution: { action: 'fixed', by: 'kiro', summary: 'Fixed' } },
              { uuid: 'a2', comment: 'Issue 2', type: 'element', resolution: { action: 'wontfix', by: 'kiro', summary: 'By design' } },
              { uuid: 'a3', comment: 'Issue 3', type: 'element', resolution: { action: 'fixed', by: 'kiro', summary: 'Fixed' } },
            ],
          }),
        });
      }
      if (u.includes('/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      return Promise.reject(new Error(`unmocked: ${u}`));
    });

    start();
    create();

    // Resolved count should show 3 from server history
    await vi.waitFor(() => {
      const tabContainer = shadowQuery(`[${ATTR}="tab-container"]`);
      expect(tabContainer?.textContent).toContain('Resolved (3)');
    }, { timeout: 3000 });
  });
});
