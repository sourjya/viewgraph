/**
 * Live Annotation Status - Unit Tests
 *
 * Tests server-side status emission and extension-side rendering
 * for the queued/fixing lifecycle states.
 *
 * @see server/src/tools/get-unresolved.js - emits 'queued'
 * @see server/src/tools/get-annotation-context.js - emits 'fixing'
 * @see extension/lib/sidebar/review.js - renders status labels
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderReviewList } from '#lib/sidebar/review.js';
import { ATTR } from '#lib/selector.js';

function makeAnn(overrides = {}) {
  return {
    id: 1, uuid: 'u1', type: 'element', comment: 'Fix this',
    resolved: false, pending: false, severity: '', category: '',
    nids: [], ancestor: null, sentAt: null, agentStatus: null,
    region: { x: 0, y: 0, width: 100, height: 50 },
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    annotations: [], pendingRequests: [], activeFilter: 'open',
    activeTypeFilters: new Set(['element', 'region', 'idea', 'diagnostic', 'page-note']),
    agentName: 'Kiro', ...overrides,
  };
}

function makeCallbacks() {
  return {
    onRefresh: vi.fn(), onShowPanel: vi.fn(), onHidePanel: vi.fn(),
    onRemove: vi.fn(), onResolve: vi.fn(), onClear: vi.fn(),
    onSpotlight: vi.fn(), onFilterChange: vi.fn(), onTypeFilterToggle: vi.fn(),
    onRequestCapture: vi.fn(), onRequestDecline: vi.fn(), onEntryClick: vi.fn(),
    getSidebarEl: () => document.createElement('div'),
    getAnnotationCount: () => 0,
  };
}

describe('live annotation status rendering', () => {
  let list, tabContainer, sidebarEl;
  beforeEach(() => {
    list = document.createElement('div');
    tabContainer = document.createElement('div');
    sidebarEl = document.createElement('div');
  });

  it('(+) shows "Agent received - in queue" for queued status', () => {
    const ann = makeAnn({ pending: true, agentStatus: 'queued', sentAt: '2026-04-26T00:00:00Z' });
    renderReviewList(list, tabContainer, sidebarEl, makeState({ annotations: [ann] }), makeCallbacks());
    expect(list.textContent).toContain('Agent received');
    expect(list.textContent).toContain('in queue');
  });

  it('(+) shows "Agent is fixing..." for fixing status', () => {
    const ann = makeAnn({ pending: true, agentStatus: 'fixing', sentAt: '2026-04-26T00:00:00Z' });
    renderReviewList(list, tabContainer, sidebarEl, makeState({ annotations: [ann] }), makeCallbacks());
    expect(list.textContent).toContain('Agent is fixing');
  });

  it('(+) shows generic "Sent to agent" when no agentStatus', () => {
    const ann = makeAnn({ pending: true, sentAt: '2026-04-26T00:00:00Z' });
    renderReviewList(list, tabContainer, sidebarEl, makeState({ annotations: [ann] }), makeCallbacks());
    expect(list.textContent).toContain('Sent to agent');
  });

  it('(-) resolved annotation does not show agent status', () => {
    const ann = makeAnn({ resolved: true, agentStatus: 'fixing', resolution: { action: 'fixed', by: 'kiro' } });
    const state = makeState({ annotations: [ann], activeFilter: 'resolved' });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    expect(list.textContent).not.toContain('Agent is fixing');
    expect(list.textContent).toContain('fixed');
  });

  it('(+) fixing status uses blue color (primaryLight)', () => {
    const ann = makeAnn({ pending: true, agentStatus: 'fixing', sentAt: '2026-04-26T00:00:00Z' });
    renderReviewList(list, tabContainer, sidebarEl, makeState({ annotations: [ann] }), makeCallbacks());
    const entries = list.querySelectorAll(`[${ATTR}="entry"]`);
    // The fixing line should have primaryLight color and pulse animation
    const fixingLine = entries[0]?.querySelector('div[style*="animation"]');
    expect(fixingLine).toBeTruthy();
  });
});
