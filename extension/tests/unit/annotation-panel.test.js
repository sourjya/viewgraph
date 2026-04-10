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
  afterEach(() => {
    hide();
  });

  it('(+) shows panel for annotation', () => {
    show(makeAnnotation());
    expect(getPanel()).toBeTruthy();
    expect(currentAnnotationId()).toBe(1);
  });

  it('(+) hides panel and clears state', () => {
    show(makeAnnotation());
    hide();
    expect(getPanel()).toBeNull();
    expect(currentAnnotationId()).toBeNull();
  });

  it('(+) textarea has box-sizing border-box to prevent overflow', () => {
    show(makeAnnotation());
    const textarea = getPanel().querySelector(`[${ATTR}="input"]`);
    expect(textarea).toBeTruthy();
    expect(textarea.style.boxSizing).toBe('border-box');
  });

  it('(+) textarea width is 100% and contained within panel', () => {
    show(makeAnnotation());
    const panel = getPanel();
    const textarea = panel.querySelector(`[${ATTR}="input"]`);
    expect(textarea.style.width).toBe('100%');
    // Panel has box-sizing: border-box, textarea should too
    expect(panel.style.boxSizing).toBe('border-box');
    expect(textarea.style.boxSizing).toBe('border-box');
  });

  it('(+) panel has fixed width of 270px', () => {
    show(makeAnnotation());
    expect(getPanel().style.width).toBe('270px');
  });

  it('(-) showing new annotation replaces previous panel', () => {
    show(makeAnnotation({ id: 1 }));
    show(makeAnnotation({ id: 2 }));
    const panels = document.querySelectorAll(`[${ATTR}="panel"]`);
    expect(panels.length).toBe(1);
    expect(currentAnnotationId()).toBe(2);
  });
});
