/**
 * Tests for BUG-027: Capture request history + smooth collapse animation.
 *
 * Covers:
 * - Height collapse animation on accepted/declined request cards
 * - Completed request entries appearing in Resolved tab
 * - Agent-request category annotation creation
 *
 * @see extension/lib/annotation-sidebar.js - request handlers
 * @see extension/lib/sidebar/review.js - review list rendering
 * @see docs/bugs/BUG-027-capture-request-no-history.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderReviewList } from '#lib/sidebar/review.js';

/** Build a minimal annotation object for testing. */
function makeAnn(overrides = {}) {
  return {
    id: 1, uuid: 'test-uuid', type: 'page-note', comment: '',
    resolved: false, pending: false, severity: '', category: '',
    nids: [], ancestor: null, region: { x: 0, y: 0, width: 0, height: 0 },
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
    onEntryClick: vi.fn(),
    getSidebarEl: () => document.createElement('div'),
    getAnnotationCount: () => 0,
    ...overrides,
  };
}

describe('BUG-027: capture request collapse animation', () => {
  let list, tabContainer, sidebarEl;

  beforeEach(() => {
    list = document.createElement('div');
    tabContainer = document.createElement('div');
    sidebarEl = document.createElement('div');
  });

  it('(+) request card has no maxHeight initially (allows natural sizing)', () => {
    const req = { id: 'r1', url: 'http://localhost:3000', purpose: 'verify', guidance: 'Check fix' };
    const state = makeState({ pendingRequests: [req] });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    // Find the request entry (has guidance text)
    const entries = list.querySelectorAll('div');
    const reqEntry = Array.from(entries).find((e) => e.textContent.includes('Check fix'));
    expect(reqEntry).toBeTruthy();
    // No maxHeight set initially - card sizes naturally
    expect(reqEntry.style.maxHeight).toBe('');
  });

  it('(+) request card capture button triggers onRequestCapture callback', () => {
    const cb = makeCallbacks();
    const req = { id: 'r1', url: 'http://localhost:3000', purpose: 'capture', guidance: 'Reload page' };
    const state = makeState({ pendingRequests: [req] });
    renderReviewList(list, tabContainer, sidebarEl, state, cb);

    // Find the capture button (camera icon button)
    const buttons = list.querySelectorAll('button');
    const capBtn = Array.from(buttons).find((b) => b.innerHTML.includes('M23 19') || b.getAttribute('data-tooltip') === 'Capture now');
    expect(capBtn).toBeTruthy();
    capBtn.click();
    expect(cb.onRequestCapture).toHaveBeenCalled();
  });

  it('(+) request card decline button triggers onRequestDecline callback', () => {
    const cb = makeCallbacks();
    const req = { id: 'r1', url: 'http://localhost:3000', purpose: 'capture' };
    const state = makeState({ pendingRequests: [req] });
    renderReviewList(list, tabContainer, sidebarEl, state, cb);

    const buttons = list.querySelectorAll('button');
    const decBtn = Array.from(buttons).find((b) => b.getAttribute('data-tooltip') === 'Decline capture request');
    expect(decBtn).toBeTruthy();
    decBtn.click();
    expect(cb.onRequestDecline).toHaveBeenCalled();
  });

  it('(-) request card without guidance renders without guidance block', () => {
    const req = { id: 'r1', url: 'http://localhost:3000', purpose: 'capture' };
    const state = makeState({ pendingRequests: [req] });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    // Should not have a guidance div with borderLeft styling
    const guideDivs = Array.from(list.querySelectorAll('div')).filter(
      (d) => d.style.borderLeft && d.style.borderLeft.includes('solid'),
    );
    expect(guideDivs.length).toBe(0);
  });
});

describe('BUG-027: completed request history in Resolved tab', () => {
  let list, tabContainer, sidebarEl;

  beforeEach(() => {
    list = document.createElement('div');
    tabContainer = document.createElement('div');
    sidebarEl = document.createElement('div');
  });

  it('(+) completed agent-request annotation appears in Resolved filter', () => {
    const ann = makeAnn({
      id: 'P1', type: 'page-note', category: 'agent-request',
      comment: 'Agent \u2705 Verify: Check header alignment',
      resolved: true,
      resolution: { action: 'completed', by: 'user', summary: 'Captured for agent request r1' },
    });
    const state = makeState({ annotations: [ann], activeFilter: 'resolved' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    expect(list.textContent).toContain('Agent');
    expect(list.textContent).toContain('Verify');
    expect(list.textContent).toContain('completed by user');
  });

  it('(+) completed agent-request does NOT appear in Open filter', () => {
    const ann = makeAnn({
      id: 'P1', type: 'page-note', category: 'agent-request',
      comment: 'Agent Capture: http://localhost:3000',
      resolved: true,
      resolution: { action: 'completed', by: 'user', summary: 'Captured' },
    });
    const state = makeState({ annotations: [ann], activeFilter: 'open' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    // Should show empty message, not the annotation
    expect(list.textContent).toContain('No open items');
  });

  it('(+) completed agent-request appears in All filter', () => {
    const ann = makeAnn({
      id: 'P1', type: 'page-note', category: 'agent-request',
      comment: 'Agent \ud83d\udd0d Inspect: Check layout',
      resolved: true,
      resolution: { action: 'completed', by: 'user', summary: 'Captured' },
    });
    const state = makeState({ annotations: [ann], activeFilter: 'all' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    expect(list.textContent).toContain('Inspect');
  });

  it('(+) completed agent-request is visible when page-note filter is active', () => {
    const ann = makeAnn({
      id: 'P1', type: 'page-note', category: 'agent-request',
      comment: 'Agent Capture: test',
      resolved: true,
      resolution: { action: 'completed', by: 'user', summary: 'Done' },
    });
    const filters = new Set(['page-note']);
    const state = makeState({ annotations: [ann], activeFilter: 'resolved', activeTypeFilters: filters });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    expect(list.textContent).toContain('Agent Capture');
  });

  it('(-) completed agent-request is hidden when page-note filter is off', () => {
    const ann = makeAnn({
      id: 'P1', type: 'page-note', category: 'agent-request',
      comment: 'Agent Capture: test',
      resolved: true,
      resolution: { action: 'completed', by: 'user', summary: 'Done' },
    });
    // Only element filter active, no page-note
    const filters = new Set(['element']);
    const state = makeState({ annotations: [ann], activeFilter: 'resolved', activeTypeFilters: filters });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    expect(list.textContent).not.toContain('Agent Capture');
  });

  it('(+) Resolved tab count includes completed agent-request', () => {
    const anns = [
      makeAnn({ id: 1, resolved: true, resolution: { action: 'fixed', by: 'agent' } }),
      makeAnn({
        id: 'P1', type: 'page-note', category: 'agent-request',
        comment: 'Agent Capture: test', resolved: true,
        resolution: { action: 'completed', by: 'user', summary: 'Done' },
      }),
    ];
    const state = makeState({ annotations: anns, activeFilter: 'all' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    expect(tabContainer.textContent).toContain('Resolved (2)');
  });

  it('(+) multiple completed requests render as separate entries', () => {
    const anns = [
      makeAnn({
        id: 'P1', type: 'page-note', category: 'agent-request',
        comment: 'Agent Verify: Check header', resolved: true,
        resolution: { action: 'completed', by: 'user', summary: 'Captured r1' },
      }),
      makeAnn({
        id: 'P2', type: 'page-note', category: 'agent-request',
        comment: 'Agent Capture: Full page', resolved: true,
        resolution: { action: 'completed', by: 'user', summary: 'Captured r2' },
      }),
    ];
    const state = makeState({ annotations: anns, activeFilter: 'resolved' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());

    expect(list.textContent).toContain('Check header');
    expect(list.textContent).toContain('Full page');
  });
});
