/**
 * Capture Diff - Unit Tests
 *
 * Tests comparison logic between two parsed captures.
 * Detects added/removed elements, layout changes, and testid changes.
 */

import { describe, it, expect } from 'vitest';
import { diffCaptures } from '#src/analysis/capture-diff.js';

/** Helper: minimal parsed capture with given nodes and details. */
function makeCapture(nodes, details = {}) {
  return {
    metadata: { url: 'http://test.com', timestamp: '2026-04-08T00:00:00Z' },
    nodes: { high: nodes, med: [], low: [] },
    details,
  };
}

describe('diffCaptures', () => {
  it('detects added elements', () => {
    const a = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' } });

    const b = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
      { id: 'btn2', tag: 'button', text: 'Delete', bbox: { x: 200, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' }, btn2: { selector: 'button.delete' } });

    const diff = diffCaptures(a, b);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe('btn2');
  });

  it('detects removed elements', () => {
    const a = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
      { id: 'btn2', tag: 'button', text: 'Delete', bbox: { x: 200, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' }, btn2: { selector: 'button.delete' } });

    const b = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' } });

    const diff = diffCaptures(a, b);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].id).toBe('btn2');
  });

  it('detects layout changes (bbox diff)', () => {
    const a = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' } });

    const b = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 200, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' } });

    const diff = diffCaptures(a, b);
    expect(diff.moved).toHaveLength(1);
    expect(diff.moved[0].id).toBe('btn1');
    expect(diff.moved[0].before.w).toBe(100);
    expect(diff.moved[0].after.w).toBe(200);
  });

  it('detects testid changes', () => {
    const a = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save', attributes: { 'data-testid': 'save-btn' } } });

    const b = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save', attributes: {} } });

    const diff = diffCaptures(a, b);
    expect(diff.testidChanges.removed).toContain('save-btn');
  });

  it('returns empty diff for identical captures', () => {
    const a = makeCapture([
      { id: 'btn1', tag: 'button', text: 'Save', bbox: { x: 0, y: 0, w: 100, h: 40 }, actions: ['click'] },
    ], { btn1: { selector: 'button.save' } });

    const diff = diffCaptures(a, a);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.moved).toHaveLength(0);
  });
});
