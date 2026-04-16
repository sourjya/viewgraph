/**
 * Sidebar Inspect Tab - Unit Tests
 *
 * @see lib/sidebar/inspect.js
 */

import { describe, it, expect } from 'vitest';
import { createInspectTab } from '#lib/sidebar/inspect.js';

describe('createInspectTab', () => {
  it('(+) returns element and refresh function', () => {
    const tab = createInspectTab();
    expect(tab.element).toBeTruthy();
    expect(tab.element.getAttribute('data-vg-annotate')).toBe('inspect-content');
    expect(typeof tab.refresh).toBe('function');
  });

  it('(+) element starts hidden', () => {
    const tab = createInspectTab();
    expect(tab.element.style.display).toBe('none');
  });

  it('(+) refresh populates content', () => {
    const tab = createInspectTab();
    tab.refresh();
    // Should have at least the viewport row
    expect(tab.element.children.length).toBeGreaterThan(0);
  });

  it('(+) refresh clears previous content', () => {
    const tab = createInspectTab();
    tab.refresh();
    const firstCount = tab.element.children.length;
    tab.refresh();
    // Should not accumulate - same count after second refresh
    expect(tab.element.children.length).toBe(firstCount);
  });
});
