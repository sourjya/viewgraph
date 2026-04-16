/**
 * Tests for sidebar/review.js - Review tab annotation list rendering.
 *
 * Covers: empty state, annotation entries, filter tabs, type toggles,
 * trash button, pending requests, resolved entries.
 *
 * @see extension/lib/sidebar/review.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderReviewList } from '#lib/sidebar/review.js';

/** Build a minimal annotation object for testing. */
function makeAnn(overrides = {}) {
  return {
    id: 1, comment: 'Fix this', resolved: false, pending: false,
    severity: null, ancestor: null, region: { y: 100 },
    ...overrides,
  };
}

/** Build default state for renderReviewList. */
function makeState(overrides = {}) {
  return {
    annotations: [],
    pendingRequests: [],
    activeFilter: 'open',
    activeTypeFilters: new Set(['element', 'region', 'idea', 'diagnostic', 'page-note']),
    agentName: 'Kiro',
    ...overrides,
  };
}

/** Build no-op callbacks for renderReviewList. */
function makeCallbacks(overrides = {}) {
  return {
    onRefresh: vi.fn(),
    onShowPanel: vi.fn(),
    onHidePanel: vi.fn(),
    onRemove: vi.fn(),
    onResolve: vi.fn(),
    onClear: vi.fn(),
    onSpotlight: vi.fn(),
    onFilterChange: vi.fn(),
    onTypeFilterToggle: vi.fn(),
    onRequestCapture: vi.fn(),
    onRequestDecline: vi.fn(),
    getSidebarEl: () => document.createElement('div'),
    ...overrides,
  };
}

describe('renderReviewList', () => {
  let list;
  let tabContainer;
  let sidebarEl;

  beforeEach(() => {
    list = document.createElement('div');
    tabContainer = document.createElement('div');
    sidebarEl = document.createElement('div');
  });

  it('(+) shows hint when no annotations', () => {
    renderReviewList(list, tabContainer, sidebarEl, makeState(), makeCallbacks());
    expect(list.textContent).toContain('Click an element');
  });

  it('(+) renders annotation entries', () => {
    const state = makeState({ annotations: [makeAnn({ id: 1 }), makeAnn({ id: 2, comment: 'Another' })] });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(list.textContent).toContain('#1');
    expect(list.textContent).toContain('#2');
  });

  it('(+) renders filter tabs with counts', () => {
    const anns = [makeAnn({ id: 1 }), makeAnn({ id: 2, resolved: true })];
    const state = makeState({ annotations: anns, activeFilter: 'all' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(tabContainer.textContent).toContain('Open (1)');
    expect(tabContainer.textContent).toContain('Resolved (1)');
    expect(tabContainer.textContent).toContain('All (2)');
  });

  it('(+) calls onFilterChange when tab clicked', () => {
    const cb = makeCallbacks();
    const state = makeState({ annotations: [makeAnn()] });
    renderReviewList(list, tabContainer, sidebarEl, state, cb);
    const tabs = tabContainer.querySelectorAll('button');
    // First tab is "Open", second is "Resolved"
    const resolvedTab = Array.from(tabs).find((t) => t.textContent.includes('Resolved'));
    resolvedTab.click();
    expect(cb.onFilterChange).toHaveBeenCalledWith('resolved');
  });

  it('(+) shows resolved entry with checkmark', () => {
    const ann = makeAnn({ id: 1, resolved: true, resolution: { by: 'agent', action: 'fixed', summary: 'Done' } });
    const state = makeState({ annotations: [ann], activeFilter: 'resolved' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(list.textContent).toContain('fixed by agent');
  });

  it('(+) shows pending indicator', () => {
    const ann = makeAnn({ id: 1, pending: true });
    const state = makeState({ annotations: [ann] });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(list.textContent).toContain('Sent to agent');
  });

  it('(+) renders pending requests header', () => {
    const state = makeState({
      annotations: [],
      pendingRequests: [{ id: 'r1', url: 'http://localhost:3000', purpose: 'capture', guidance: 'Check header' }],
    });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(list.textContent).toContain('Kiro Requests (1)');
    expect(list.textContent).toContain('Check header');
  });

  it('(+) calls onRemove when delete clicked', () => {
    const cb = makeCallbacks();
    const state = makeState({ annotations: [makeAnn({ id: 5 })] });
    renderReviewList(list, tabContainer, sidebarEl, state, cb);
    // Find the delete button (last button in entry with X icon)
    const btns = list.querySelectorAll('button');
    const delBtn = Array.from(btns).find((b) => b.innerHTML.includes('M18 6L6 18'));
    delBtn.click();
    expect(cb.onRemove).toHaveBeenCalledWith(5);
  });

  it('(+) shows empty message when filter has no matches', () => {
    const state = makeState({ annotations: [makeAnn()], activeFilter: 'resolved' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(list.textContent).toContain('No resolved items yet');
  });

  it('(-) handles empty annotations array gracefully', () => {
    renderReviewList(list, tabContainer, sidebarEl, makeState({ annotations: [] }), makeCallbacks());
    expect(list.children.length).toBeGreaterThan(0);
  });

  it('(+) renders type filter toggles', () => {
    const state = makeState({ annotations: [makeAnn()] });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    const typeFilters = tabContainer.querySelectorAll('[data-type]');
    expect(typeFilters.length).toBe(4);
  });
});
