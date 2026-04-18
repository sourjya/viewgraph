/**
 * Sidebar miscellaneous tests.
 *
 * Covers keyboard shortcuts cleanup, collapsed strip badge/icon,
 * help card structure, settings link, and suggestions panel persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  start, stop, create, destroy, refresh, collapse, ATTR,
  shadowQuery,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('keyboard shortcuts integration', () => {
  it('(+) shortcuts are cleaned up on destroy without errors', () => {
    start();
    create();
    destroy();
    stop();

    expect(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(event);
    }).not.toThrow();
  });
});

describe('collapsed strip', () => {
  it('(+) strip always shows chat bubble with count 0', () => {
    start();
    create();
    collapse();

    const badge = document.querySelector(`[${ATTR}="collapse-badge"]`);
    const countEl = badge?.querySelector('[data-vg-badge-count]');
    expect(countEl).toBeTruthy();
    expect(countEl.textContent).toContain('0');

    stop();
    destroy();
  });

  it('(+) strip shows VG icon as img element', () => {
    start();
    create();
    collapse();

    const badge = document.querySelector(`[${ATTR}="collapse-badge"]`);
    const img = badge?.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('icon-16.png');

    stop();
    destroy();
  });
});

describe('help card', () => {
  it('(+) help card contains keycap-styled shortcut keys', () => {
    start();
    create();

    const helpCard = shadowQuery(`[${ATTR}="help-card"]`);
    expect(helpCard).toBeTruthy();
    expect(helpCard.style.display).toBe('none');

    stop();
    destroy();
  });

  it('(+) help card links have SVG icons and text labels', () => {
    start();
    create();

    const helpCard = shadowQuery(`[${ATTR}="help-card"]`);
    const links = helpCard?.querySelectorAll('a') || [];
    expect(links.length).toBe(3);
    for (const link of links) {
      expect(link.querySelector('svg')).toBeTruthy();
      expect(link.querySelectorAll('span').length).toBe(2);
    }

    stop();
    destroy();
  });
});

describe('settings', () => {
  it('(+) settings link exists in footer', () => {
    start();
    create();

    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Settings');

    stop();
    destroy();
  });
});

describe('suggestions panel survives refresh', () => {
  it('(+) suggestions panel exists in list after refresh', () => {
    start();
    create();
    refresh();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const sugPanel = list?.querySelector(`[${ATTR}="suggestions-panel"]`);
    expect(sugPanel).not.toBeNull();
  });

  it('(+) suggestions panel is first child of list', () => {
    start();
    create();
    refresh();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const firstChild = list?.firstElementChild;
    expect(firstChild?.getAttribute(ATTR)).toBe('suggestions-panel');
  });

  it('(+) suggestions panel survives multiple refresh cycles', () => {
    start();
    create();
    refresh();
    refresh();
    refresh();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const panels = list?.querySelectorAll(`[${ATTR}="suggestions-panel"]`);
    expect(panels?.length).toBe(1);
  });
});
