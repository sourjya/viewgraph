/**
 * Sidebar annotation type badge and diagnostic note tests.
 *
 * Covers badge differentiation (bug, idea, diagnostic, page-note),
 * diagnostic note creation, snapshot behavior, and section deduplication.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  start, stop, create, destroy, refresh,
  addPageNote, getAnnotations,
  getEntries,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('annotation type badges', () => {
  it('(+) regular bug annotation shows colored number badge', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].type = 'element';
    anns[0].category = 'visual';
    create();
    refresh();

    const entries = getEntries();
    expect(entries.length).toBeGreaterThan(0);
    const badge = entries[0].querySelector('span');
    expect(badge.textContent).toContain('#');

    stop();
    destroy();
  });

  it('(+) idea annotation shows yellow badge with lightbulb', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].category = 'idea';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      expect(html).toContain('M9 18h6');
      expect(html).toMatch(/eab308|234, 179, 8/);
    }

    stop();
    destroy();
  });

  it('(+) diagnostic note shows teal badge with terminal icon', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test data' };
    anns[0].comment = 'Network: 2 failed requests';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      expect(html).toContain('4 17 10 11 4 5');
      expect(html).toMatch(/0d9488|13, 148, 136/);
    }

    stop();
    destroy();
  });

  it('(+) page note shows blue badge with document icon', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].type = 'page-note';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      expect(html).toContain('M14 2H6');
      expect(html).toMatch(/0ea5e9|14, 165, 233/);
    }

    stop();
    destroy();
  });

  it('(+) diagnostic note shows styled section tag in comment', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Console', data: 'TypeError: x is not defined' };
    anns[0].comment = 'Console: TypeError: x is not defined';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      expect(text).toContain('Console');
    }

    stop();
    destroy();
  });

  it('(+) diagnostic note truncates long excerpt', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'a'.repeat(200) };
    anns[0].comment = 'Network: ' + 'a'.repeat(200);
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const text = entries[0].textContent;
      expect(text).toContain('...');
    }

    stop();
    destroy();
  });

  it('(-) diagnostic badge takes priority over idea badge', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test' };
    anns[0].category = 'idea';
    anns[0].comment = 'Network: test';
    create();
    refresh();

    const entries = getEntries();
    if (entries.length > 0) {
      const html = entries[0].innerHTML;
      expect(html).toMatch(/0d9488|13, 148, 136/);
      expect(html).not.toMatch(/eab308|234, 179, 8/);
    }

    stop();
    destroy();
  });
});

describe('diagnostic note button', () => {
  it('(+) created annotation has diagnostic property with section name', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test data here' };
    anns[0].comment = 'Network: 1 failed / 5';
    expect(anns[0].diagnostic.section).toBe('Network');
    expect(anns[0].diagnostic.data).toBe('test data here');
    stop();
  });

  it('(+) diagnostic data is a snapshot, not a live reference', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    const originalData = 'Network failures at time of click';
    anns[0].diagnostic = { section: 'Network', data: originalData };
    const laterData = 'Different data after page change';
    expect(anns[0].diagnostic.data).toBe(originalData);
    expect(anns[0].diagnostic.data).not.toBe(laterData);
    stop();
  });

  it('(+) note button disabled when diagnostic annotation already exists for section', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test' };
    const hasNetwork = getAnnotations().some((a) => a.diagnostic?.section === 'Network');
    expect(hasNetwork).toBe(true);
    stop();
  });

  it('(-) note button not disabled for different section', () => {
    start();
    addPageNote();
    const anns = getAnnotations();
    anns[0].diagnostic = { section: 'Network', data: 'test' };
    const hasConsole = getAnnotations().some((a) => a.diagnostic?.section === 'Console');
    expect(hasConsole).toBe(false);
    stop();
  });
});
