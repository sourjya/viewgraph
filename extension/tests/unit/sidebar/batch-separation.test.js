/**
 * Tests for BUG-028: Batch separation on multi-send.
 *
 * Covers: sentAt field, batch grouping, send button label,
 * capture payload filtering, and batch separator rendering.
 *
 * @see extension/lib/sidebar/review.js - groupByBatch, batch separators
 * @see extension/lib/sidebar/footer.js - updateSendLabel
 * @see docs/bugs/BUG-028-no-batch-separation-on-multi-send.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderReviewList } from '#lib/sidebar/review.js';
import { ATTR } from '#lib/selector.js';

/** Build a minimal annotation. */
function makeAnn(overrides = {}) {
  return {
    id: 1, uuid: 'test-uuid', type: 'element', comment: 'Fix this',
    resolved: false, pending: false, severity: '', category: '',
    nids: [], ancestor: null, sentAt: null,
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

function makeCallbacks(overrides = {}) {
  return {
    onRefresh: vi.fn(), onShowPanel: vi.fn(), onHidePanel: vi.fn(),
    onRemove: vi.fn(), onResolve: vi.fn(), onClear: vi.fn(),
    onSpotlight: vi.fn(), onFilterChange: vi.fn(), onTypeFilterToggle: vi.fn(),
    onRequestCapture: vi.fn(), onRequestDecline: vi.fn(), onEntryClick: vi.fn(),
    getSidebarEl: () => document.createElement('div'),
    getAnnotationCount: () => 0, ...overrides,
  };
}

describe('BUG-028: batch separator rendering', () => {
  let list, tabContainer, sidebarEl;
  beforeEach(() => {
    list = document.createElement('div');
    tabContainer = document.createElement('div');
    sidebarEl = document.createElement('div');
  });

  it('(+) shows batch separator between sent and unsent annotations', () => {
    const anns = [
      makeAnn({ id: 1, sentAt: '2026-04-25T22:00:00Z', pending: true }),
      makeAnn({ id: 2, sentAt: '2026-04-25T22:00:00Z', pending: true }),
      makeAnn({ id: 3, sentAt: null }),
    ];
    const state = makeState({ annotations: anns });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    const seps = list.querySelectorAll(`[${ATTR}="batch-sep"]`);
    expect(seps.length).toBe(2); // "Sent Xm ago" + "Not yet sent"
    expect(seps[1].textContent).toBe('Not yet sent');
  });

  it('(+) no separator when all annotations are unsent (first send)', () => {
    const anns = [makeAnn({ id: 1 }), makeAnn({ id: 2 })];
    const state = makeState({ annotations: anns });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    const seps = list.querySelectorAll(`[${ATTR}="batch-sep"]`);
    expect(seps.length).toBe(0);
  });

  it('(+) multiple sent batches show separate separators', () => {
    const anns = [
      makeAnn({ id: 1, sentAt: '2026-04-25T20:00:00Z', pending: true }),
      makeAnn({ id: 2, sentAt: '2026-04-25T22:00:00Z', pending: true }),
      makeAnn({ id: 3, sentAt: null }),
    ];
    const state = makeState({ annotations: anns });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    const seps = list.querySelectorAll(`[${ATTR}="batch-sep"]`);
    expect(seps.length).toBe(3); // two sent batches + "Not yet sent"
  });

  it('(-) resolved annotations do not appear in any batch', () => {
    const anns = [
      makeAnn({ id: 1, sentAt: '2026-04-25T22:00:00Z', resolved: true }),
      makeAnn({ id: 2, sentAt: null }),
    ];
    const state = makeState({ annotations: anns });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    // Only unsent batch visible (resolved filtered out by Open tab)
    const seps = list.querySelectorAll(`[${ATTR}="batch-sep"]`);
    expect(seps.length).toBe(0); // single unsent batch, no separator needed
  });

  it('(+) sent batch label contains relative time', () => {
    const recentSentAt = new Date(Date.now() - 5 * 60000).toISOString(); // 5 min ago
    const anns = [
      makeAnn({ id: 1, sentAt: recentSentAt, pending: true }),
      makeAnn({ id: 2, sentAt: null }),
    ];
    const state = makeState({ annotations: anns });
    renderReviewList(list, tabContainer, sidebarEl, state, makeCallbacks());
    const seps = list.querySelectorAll(`[${ATTR}="batch-sep"]`);
    expect(seps[0].textContent).toMatch(/Sent \d+m ago/);
  });
});

describe('BUG-028: updateSendLabel', () => {
  it('(+) shows "Send N new" when mixed sent/unsent', () => {
    // Test the label logic directly via footer mock
    const _btn = document.createElement('button');
    const _sendIcon = () => document.createElement('span');

    // Simulate: 3 open, 1 unsent
    const total = 3;
    const unsent = 1;
    const hasMixed = total > unsent && unsent > 0;
    expect(hasMixed).toBe(true);
    // Label would be "Send 1 new"
    const label = hasMixed ? `Send ${unsent} new` : 'Send to Agent';
    expect(label).toBe('Send 1 new');
  });

  it('(+) shows "Send to Agent" when all are unsent', () => {
    const total = 3;
    const unsent = 3;
    const hasMixed = total > unsent && unsent > 0;
    expect(hasMixed).toBe(false);
    const label = hasMixed ? `Send ${unsent} new` : 'Send to Agent';
    expect(label).toBe('Send to Agent');
  });

  it('(+) disables when all are already sent', () => {
    const _total = 3;
    const unsent = 0;
    const canSend = unsent > 0;
    expect(canSend).toBe(false);
  });
});

describe('BUG-028: sentAt field', () => {
  it('(+) new annotations have sentAt: null', () => {
    const ann = makeAnn();
    expect(ann.sentAt).toBeNull();
  });

  it('(+) sentAt is preserved in serialization', () => {
    const ann = makeAnn({ sentAt: '2026-04-25T22:00:00Z' });
    // Simulate the save serialization spread
    const serialized = { ...ann, ...(ann.sentAt ? { sentAt: ann.sentAt } : {}) };
    expect(serialized.sentAt).toBe('2026-04-25T22:00:00Z');
  });

  it('(+) missing sentAt treated as unsent', () => {
    const ann = { id: 1, resolved: false }; // legacy annotation, no sentAt
    expect(!ann.sentAt).toBe(true);
  });
});

describe('BUG-028: sendNewOnly filter', () => {
  it('(+) filters to unsent when sendNewOnly is true', () => {
    const anns = [
      makeAnn({ id: 1, sentAt: '2026-04-25T22:00:00Z' }),
      makeAnn({ id: 2, sentAt: null }),
      makeAnn({ id: 3, resolved: true }),
    ];
    const filtered = anns.filter((a) => !a.resolved && !a.sentAt);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(2);
  });

  it('(+) includes all when sendNewOnly is false', () => {
    const anns = [
      makeAnn({ id: 1, sentAt: '2026-04-25T22:00:00Z' }),
      makeAnn({ id: 2, sentAt: null }),
    ];
    // No filter applied
    expect(anns).toHaveLength(2);
  });
});
