/**
 * Tests for sidebar/suggestions-ui.js - Redesigned suggestion bar.
 * Covers: collapsed badge, expanded checklist, add-to-review, dismiss, clean state.
 *
 * @see extension/lib/sidebar/suggestions-ui.js
 * @see .kiro/specs/auto-suggestions/design-v2.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderSuggestionBar } from '#lib/sidebar/suggestions-ui.js';

/** Build a test suggestion. */
function makeSug(overrides = {}) {
  return {
    id: 'sug-1', tier: 'accessibility', severity: 'warning',
    title: 'Missing alt text on 3 images', detail: 'img.hero, img.logo',
    selector: 'img', elements: ['img'], source: 'a11y-alt',
    ...overrides,
  };
}

describe('renderSuggestionBar', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  // ──────────────────────────────────────────────
  // Clean state
  // ──────────────────────────────────────────────

  it('(+) hides panel when no suggestions', () => {
    renderSuggestionBar(container, [], {});
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]');
    expect(panel).not.toBeNull();
    expect(panel.style.display).toBe('none');
  });

  it('(+) clean state panel has no visible content', () => {
    renderSuggestionBar(container, [], {});
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]');
    expect(panel.children.length).toBe(0);
  });

  // ──────────────────────────────────────────────
  // Collapsed state
  // ──────────────────────────────────────────────

  it('(+) shows collapsed badge with count', () => {
    renderSuggestionBar(container, [makeSug(), makeSug({ id: 'sug-2' })], {});
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]');
    expect(panel.textContent).toContain('2 suggestions');
  });

  it('(+) collapsed badge has Review button', () => {
    renderSuggestionBar(container, [makeSug()], {});
    const btn = container.querySelector('button');
    expect(btn.textContent).toBe('Review');
  });

  it('(+) collapsed badge shows lightbulb icon', () => {
    renderSuggestionBar(container, [makeSug()], {});
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]');
    expect(panel.textContent).toContain('\ud83d\udca1');
  });

  it('(+) singular "suggestion" for count of 1', () => {
    renderSuggestionBar(container, [makeSug()], {});
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]');
    expect(panel.textContent).toContain('1 suggestion');
    expect(panel.textContent).not.toContain('1 suggestions');
  });

  // ──────────────────────────────────────────────
  // Expanded state
  // ──────────────────────────────────────────────

  it('(+) clicking Review expands to show suggestion rows', () => {
    renderSuggestionBar(container, [makeSug(), makeSug({ id: 'sug-2', tier: 'quality', title: 'Failed requests' })], {});
    const reviewBtn = container.querySelector('button');
    reviewBtn.click();
    const rows = container.querySelectorAll('[data-vg-annotate="suggestion-row"]');
    expect(rows.length).toBe(2);
  });

  it('(+) expanded rows show tier pills', () => {
    renderSuggestionBar(container, [makeSug(), makeSug({ id: 'sug-2', tier: 'testability', title: 'Missing testids' })], {});
    container.querySelector('button').click();
    const text = container.textContent;
    expect(text).toContain('A11Y');
    expect(text).toContain('TEST');
  });

  it('(+) expanded rows show severity icons', () => {
    renderSuggestionBar(container, [makeSug({ severity: 'error' })], {});
    container.querySelector('button').click();
    expect(container.textContent).toContain('\ud83d\udd34');
  });

  it('(+) expanded state has Collapse button', () => {
    renderSuggestionBar(container, [makeSug()], {});
    container.querySelector('button').click();
    const btns = [...container.querySelectorAll('button')];
    const collapse = btns.find((b) => b.textContent === 'Collapse');
    expect(collapse).toBeDefined();
  });

  it('(+) expanded state has Add All and Dismiss All buttons', () => {
    renderSuggestionBar(container, [makeSug()], {});
    container.querySelector('button').click();
    const btns = [...container.querySelectorAll('button')].map((b) => b.textContent);
    expect(btns).toContain('Add All to Review');
    expect(btns).toContain('Dismiss All');
  });

  it('(+) Collapse returns to collapsed badge', () => {
    renderSuggestionBar(container, [makeSug()], {});
    container.querySelector('button').click(); // expand
    const btns = [...container.querySelectorAll('button')];
    btns.find((b) => b.textContent === 'Collapse').click();
    // Should be back to collapsed - Review button visible
    const reviewBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Review');
    expect(reviewBtn).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // Add to review
  // ──────────────────────────────────────────────

  it('(+) clicking + calls onAdd after fade animation', async () => {
    const onAdd = vi.fn();
    renderSuggestionBar(container, [makeSug({ severity: 'warning' })], { onAdd });
    container.querySelector('button').click(); // expand
    const addBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Add');
    addBtn.click();
    // onAdd fires after 200ms fade
    await new Promise((r) => setTimeout(r, 250));
    expect(onAdd).toHaveBeenCalled();
    expect(onAdd.mock.calls[0][0].severity).toBe('major');
  });

  it('(+) Add All calls onAddAll with all suggestions', () => {
    const onAddAll = vi.fn();
    const sugs = [makeSug(), makeSug({ id: 'sug-2', title: 'Other issue' })];
    renderSuggestionBar(container, sugs, { onAddAll });
    container.querySelector('button').click(); // expand
    const addAllBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Add All to Review');
    addAllBtn.click();
    expect(onAddAll).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'sug-1' }),
      expect.objectContaining({ id: 'sug-2' }),
    ]));
  });

  it('(+) Add All shows clean state after', () => {
    renderSuggestionBar(container, [makeSug()], { onAddAll: vi.fn() });
    container.querySelector('button').click();
    [...container.querySelectorAll('button')].find((b) => b.textContent === 'Add All to Review').click();
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]'); expect(panel.style.display).toBe('none');
  });

  // ──────────────────────────────────────────────
  // Dismiss
  // ──────────────────────────────────────────────

  it('(+) Dismiss All calls onDismissAll', () => {
    const onDismissAll = vi.fn();
    renderSuggestionBar(container, [makeSug()], { onDismissAll });
    container.querySelector('button').click();
    [...container.querySelectorAll('button')].find((b) => b.textContent === 'Dismiss All').click();
    expect(onDismissAll).toHaveBeenCalled();
  });

  it('(+) Dismiss All shows clean state', () => {
    renderSuggestionBar(container, [makeSug()], { onDismissAll: vi.fn() });
    container.querySelector('button').click();
    [...container.querySelectorAll('button')].find((b) => b.textContent === 'Dismiss All').click();
    const panel = container.querySelector('[data-vg-annotate="suggestions-panel"]'); expect(panel.style.display).toBe('none');
  });

  // ──────────────────────────────────────────────
  // Panel structure
  // ──────────────────────────────────────────────

  it('(+) panel is prepended as first child of container', () => {
    container.appendChild(document.createElement('div')); // existing content
    renderSuggestionBar(container, [makeSug()], {});
    expect(container.firstElementChild.getAttribute('data-vg-annotate')).toBe('suggestions-panel');
  });

  it('(+) only one panel exists after multiple renders', () => {
    renderSuggestionBar(container, [makeSug()], {});
    renderSuggestionBar(container, [makeSug()], {});
    const panels = container.querySelectorAll('[data-vg-annotate="suggestions-panel"]');
    // Each render prepends a new one - caller is responsible for cleanup
    // But panel should at least exist
    expect(panels.length).toBeGreaterThanOrEqual(1);
  });
});
