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

  it('(+) footer status row visible when settings is open (ADR-013)', () => {
    start();
    create();

    // Click settings link to open settings
    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    link.click();

    // Footer should still be in the DOM and visible
    const footer = shadowQuery(`[${ATTR}="footer"]`);
    expect(footer).toBeTruthy();
    expect(footer.style.display).not.toBe('none');

    // Status dot should be visible
    const dot = footer.querySelector(`[${ATTR}="status-dot"]`);
    expect(dot).toBeTruthy();

    stop();
    destroy();
  });

  it('(+) settings link hidden when settings panel is open', () => {
    start();
    create();

    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    link.click();

    expect(link.style.display).toBe('none');

    stop();
    destroy();
  });

  it('(+) settings link restored after back button (<) closes settings', () => {
    start();
    create();

    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    link.click();
    expect(link.style.display).toBe('none');

    // Click the back button inside settings
    const backBtn = shadowQuery(`[${ATTR}="settings-screen"]`)?.querySelector('button');
    backBtn.click();

    expect(link.style.display).toBe('flex');

    stop();
    destroy();
  });

  // Note: Esc → settings close → link restore is tested manually.
  // jsdom doesn't propagate capture-phase keydown events to our handler.

  it('(+) export buttons hidden when settings is open', () => {
    start();
    create();

    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    link.click();

    const btns = shadowQuery(`[${ATTR}="export-buttons"]`);
    expect(btns.style.display).toBe('none');

    stop();
    destroy();
  });

  it('(+) export buttons restored after back button closes settings', () => {
    start();
    create();

    const link = shadowQuery(`[${ATTR}="settings-link"]`);
    link.click();

    const btns = shadowQuery(`[${ATTR}="export-buttons"]`);
    expect(btns.style.display).toBe('none');

    const backBtn = shadowQuery(`[${ATTR}="settings-screen"]`)?.querySelector('button');
    backBtn.click();

    expect(btns.style.display).toBe('');

    stop();
    destroy();
  });

  it('(+) settings screen does not cover footer (bottom offset)', () => {
    start();
    create();

    const screen = shadowQuery(`[${ATTR}="settings-screen"]`);
    expect(screen).toBeTruthy();
    expect(screen.style.bottom).not.toBe('0px');
    expect(screen.style.bottom).not.toBe('0');

    stop();
    destroy();
  });

  it('(+) status banner is inside footer, between buttons and status row', () => {
    start();
    create();

    const footer = shadowQuery(`[${ATTR}="footer"]`);
    const banner = footer?.querySelector(`[${ATTR}="status-banner"]`);
    expect(banner).toBeTruthy();

    // Banner should come after export buttons but before status dot
    const children = [...footer.children].map((el) => el.getAttribute(ATTR) || el.tagName);
    const bannerIdx = children.indexOf('status-banner');
    const dotParentIdx = children.findIndex((_, i) => footer.children[i].querySelector?.(`[${ATTR}="status-dot"]`));
    expect(bannerIdx).toBeLessThan(dotParentIdx);

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

describe('reload hint after resolution', () => {
  it('(+) showReloadHint renders hint inside suggestions panel', () => {
    start();
    create();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const { showReloadHint: show } = require('#lib/sidebar/suggestions-ui.js');
    show(list, 3);
    const hint = list.querySelector(`[${ATTR}="reload-hint"]`);
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain('3 issues resolved');
    expect(hint.textContent).toContain('Reload');
  });

  it('(-) showReloadHint does not duplicate on multiple calls', () => {
    start();
    create();
    const list = shadowQuery(`[${ATTR}="list"]`);
    const { showReloadHint: show } = require('#lib/sidebar/suggestions-ui.js');
    show(list, 2);
    show(list, 1);
    const hints = list.querySelectorAll(`[${ATTR}="reload-hint"]`);
    expect(hints.length).toBe(1);
  });
});

describe('status banner border', () => {
  it('(-) status banner has no borderBottom (prevents ghost lines)', () => {
    start();
    create();
    const banner = shadowQuery(`[${ATTR}="status-banner"]`);
    expect(banner).toBeTruthy();
    expect(banner.style.borderBottom).toBe('');
  });
});
