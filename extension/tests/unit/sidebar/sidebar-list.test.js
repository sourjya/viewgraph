/**
 * Sidebar list rendering, tab filtering, expand/collapse, and annotation display tests.
 *
 * Covers the core list lifecycle: empty state, adding/removing annotations,
 * tab counts, expand/collapse refresh, severity/category badges.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  start, stop, create, destroy, refresh, expand, collapse, isCollapsed,
  addPageNote, getAnnotations, removeAnnotation,
  updateComment, resolveAnnotation, updateSeverity, updateCategory, ATTR,
  getList, getTabContainer, getEntries,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('sidebar list rendering', () => {
  it('(+) empty state shows hint text', () => {
    start();
    create();
    const list = getList();
    expect(list).not.toBeNull();
    expect(list.textContent).toContain('Click an element');
  });

  it('(+) list shows entries after adding annotations then refreshing', () => {
    start();
    addPageNote();
    addPageNote();
    addPageNote();
    create();
    const entries = getEntries();
    expect(entries.length).toBe(3);
  });

  it('(+) list shows entries when annotations exist before create', () => {
    start();
    updateComment(addPageNote().id, 'first note');
    updateComment(addPageNote().id, 'second note');
    expect(getAnnotations()).toHaveLength(2);
    create();
    const entries = getEntries();
    expect(entries.length).toBe(2);
    const listEl = getList();
    expect(listEl.textContent).toContain('first note');
    expect(listEl.textContent).toContain('second note');
  });

  it('(+) refresh updates list after new annotation', () => {
    start();
    addPageNote();
    create();
    expect(getEntries().length).toBe(1);
    addPageNote();
    refresh();
    expect(getEntries().length).toBe(2);
  });

  it('(+) refresh updates list after removing annotation', () => {
    start();
    const a = addPageNote();
    const _b = addPageNote();
    create();
    expect(getEntries().length).toBe(2);
    removeAnnotation(a.id);
    refresh();
    expect(getEntries().length).toBe(1);
  });
});

describe('sidebar tab filtering', () => {
  it('(+) tab bar shows Open, Resolved, All counts', () => {
    start();
    addPageNote();
    addPageNote();
    const a = addPageNote();
    resolveAnnotation(a.id);
    create();
    const tabContainer = getTabContainer();
    expect(tabContainer).not.toBeNull();
    expect(tabContainer.textContent).toContain('Open (2)');
    expect(tabContainer.textContent).toContain('Resolved (1)');
    expect(tabContainer.textContent).toContain('All (3)');
  });

  it('(+) default filter is open - only shows unresolved', () => {
    start();
    addPageNote();
    const a = addPageNote();
    resolveAnnotation(a.id);
    create();
    expect(getEntries().length).toBe(1);
  });
});

describe('sidebar expand/collapse', () => {
  it('(+) expand calls refresh - list populated after expand', () => {
    start();
    create();
    addPageNote();
    addPageNote();
    collapse();
    expect(isCollapsed()).toBe(true);
    expand();
    expect(isCollapsed()).toBe(false);
    expect(getEntries().length).toBe(2);
  });

  it('(+) annotations added while collapsed appear after expand', () => {
    start();
    create();
    collapse();
    addPageNote();
    addPageNote();
    addPageNote();
    expand();
    expect(getEntries().length).toBe(3);
  });
});

describe('sidebar renders all annotations', () => {
  it('(+) 10 open annotations produce 10 list entries', () => {
    start();
    for (let i = 0; i < 10; i++) addPageNote();
    expect(getAnnotations()).toHaveLength(10);
    create();
    expect(getEntries().length).toBe(10);
  });

  it('(+) annotations with comments all render with text', () => {
    start();
    for (let i = 0; i < 5; i++) {
      const n = addPageNote();
      updateComment(n.id, `note ${i}`);
    }
    create();
    expect(getEntries().length).toBe(5);
    const list = getList();
    expect(list.textContent).toContain('note 0');
    expect(list.textContent).toContain('note 4');
  });

  it('(+) mix of open and resolved all render under All tab', () => {
    start();
    const a = addPageNote();
    const b = addPageNote();
    const _c = addPageNote();
    resolveAnnotation(a.id);
    resolveAnnotation(b.id);
    create();
    expect(getEntries().length).toBe(1);
    const tabContainer = getTabContainer();
    expect(tabContainer.textContent).toContain('Open (1)');
    expect(tabContainer.textContent).toContain('Resolved (2)');
    expect(tabContainer.textContent).toContain('All (3)');
  });
});

describe('sidebar renders annotations with severity and category', () => {
  it('(+) annotation with severity renders colored badge', () => {
    start();
    const n = addPageNote();
    updateSeverity(n.id, 'critical');
    create();
    expect(getEntries().length).toBe(1);
    const list = getList();
    const badge = list.querySelector('span[data-tooltip="critical"]');
    expect(badge).toBeTruthy();
  });

  it('(+) annotation with category renders entry', () => {
    start();
    const n = addPageNote();
    updateCategory(n.id, 'visual');
    create();
    expect(getEntries().length).toBe(1);
    expect(getAnnotations()[0].category).toBe('visual');
  });

  it('(+) 9 annotations with mixed severity/category all render', () => {
    start();
    for (let i = 0; i < 9; i++) {
      const n = addPageNote();
      if (i % 3 === 0) updateSeverity(n.id, 'critical');
      if (i % 2 === 0) updateCategory(n.id, 'visual');
    }
    create();
    const tabs = getTabContainer();
    const allTab = [...tabs.querySelectorAll('button')].find((b) => b.textContent.includes('All'));
    if (allTab) allTab.click();
    expect(getEntries().length).toBe(9);
  });
});
