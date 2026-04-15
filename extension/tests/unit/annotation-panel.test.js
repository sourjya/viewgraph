/**
 * Annotation Panel Tests
 *
 * Tests for the floating comment panel that appears when an annotation
 * is selected. Covers layout, overflow, and input behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { show, hide, currentAnnotationId } from '../../lib/annotation-panel.js';

const ATTR = 'data-vg-annotate';

/** Create a minimal annotation object for testing. */
function makeAnnotation(overrides = {}) {
  return {
    id: 1, comment: '', severity: '', category: '',
    region: { x: 100, y: 100, width: 200, height: 50 },
    ...overrides,
  };
}

/** Find the panel element in the DOM. */
function getPanel() {
  return document.querySelector(`[${ATTR}="panel"]`);
}

describe('annotation panel', () => {
  beforeEach(() => {
    // Mock chrome.storage for config reads
    globalThis.chrome = {
      storage: { local: { get: async () => ({}) } },
    };
  });

  afterEach(() => {
    hide();
    delete globalThis.chrome;
  });

  it('(+) shows panel for annotation', async () => {
    await show(makeAnnotation());
    expect(getPanel()).toBeTruthy();
    expect(currentAnnotationId()).toBe(1);
  });

  it('(+) hides panel and clears state', async () => {
    await show(makeAnnotation());
    hide();
    expect(getPanel()).toBeNull();
    expect(currentAnnotationId()).toBeNull();
  });

  it('(+) textarea has box-sizing border-box to prevent overflow', async () => {
    await show(makeAnnotation());
    const textarea = getPanel().querySelector(`[${ATTR}="input"]`);
    expect(textarea).toBeTruthy();
    expect(textarea.style.boxSizing).toBe('border-box');
  });

  it('(+) textarea width is 100% and contained within panel', async () => {
    await show(makeAnnotation());
    const panel = getPanel();
    const textarea = panel.querySelector(`[${ATTR}="input"]`);
    expect(textarea.style.width).toBe('100%');
    expect(panel.style.boxSizing).toBe('border-box');
    expect(textarea.style.boxSizing).toBe('border-box');
  });

  it('(+) panel has fixed width of 270px', async () => {
    await show(makeAnnotation());
    expect(getPanel().style.width).toBe('270px');
  });

  it('(-) showing new annotation replaces previous panel', async () => {
    await show(makeAnnotation({ id: 1 }));
    await show(makeAnnotation({ id: 2 }));
    const panels = document.querySelectorAll(`[${ATTR}="panel"]`);
    expect(panels.length).toBe(1);
    expect(currentAnnotationId()).toBe(2);
  });

  it('(+) shows suggestion chips when element has diagnostics', async () => {
    // Create a button without aria-label to trigger diagnostics
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    await show(makeAnnotation({ element: { selector: 'button' } }));
    const chips = getPanel()?.querySelectorAll(`[${ATTR}="suggestion-chip"]`) || [];
    // Button without accessible name should produce at least one chip
    expect(chips.length).toBeGreaterThan(0);
    btn.remove();
  });

  it('(+) clicking suggestion chip populates textarea', async () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    await show(makeAnnotation({ element: { selector: 'button' } }));
    const chip = getPanel()?.querySelector(`[${ATTR}="suggestion-chip"]`);
    const textarea = getPanel()?.querySelector(`[${ATTR}="input"]`);
    if (chip && textarea) {
      chip.click();
      expect(textarea.value.length).toBeGreaterThan(0);
      // Chip should dim after click
      expect(chip.style.opacity).toBe('0.4');
    }
    btn.remove();
  });

  it('(-) no suggestion chips when smartSuggestions is disabled', async () => {
    globalThis.chrome = {
      storage: { local: { get: async () => ({ vg_project_config: { smartSuggestions: false } }) } },
    };
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    await show(makeAnnotation({ element: { selector: 'button' } }));
    const chips = getPanel()?.querySelectorAll(`[${ATTR}="suggestion-chip"]`) || [];
    expect(chips.length).toBe(0);
    btn.remove();
  });
});
