/**
 * Sidebar creation and structure tests.
 *
 * Verifies shadow DOM mounting, structural elements, and destroy cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  start, stop, create, destroy, _getShadowRoot, ATTR,
  shadowQuery, getSidebar, getTabContainer, getList,
  setupBeforeEach, setupAfterEach,
} from './sidebar-test-helpers.js';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('sidebar creation', () => {
  it('(+) create mounts sidebar in shadow DOM', () => {
    start();
    create();
    const host = document.querySelector(`[${ATTR}="shadow-host"]`);
    expect(host).not.toBeNull();
    expect(_getShadowRoot()).not.toBeNull();
    expect(getSidebar()).not.toBeNull();
  });

  it('(+) sidebar has header, mode-bar, tab-container, list, footer', () => {
    start();
    create();
    expect(shadowQuery(`[${ATTR}="header"]`)).not.toBeNull();
    expect(shadowQuery(`[${ATTR}="mode-bar"]`)).not.toBeNull();
    expect(getTabContainer()).not.toBeNull();
    expect(getList()).not.toBeNull();
    expect(shadowQuery(`[${ATTR}="footer"]`)).not.toBeNull();
  });

  it('(+) destroy removes shadow host from DOM', () => {
    start();
    create();
    expect(document.querySelector(`[${ATTR}="shadow-host"]`)).not.toBeNull();
    destroy();
    expect(document.querySelector(`[${ATTR}="shadow-host"]`)).toBeNull();
  });

  it('(+) mode button hint text is at least 9px', () => {
    start();
    create();
    const modeBar = shadowQuery(`[${ATTR}="mode-bar"]`);
    if (modeBar) {
      const hints = modeBar.querySelectorAll('span');
      const hintSpans = [...hints].filter((s) => s.textContent.match(/Click to select|Shift\+drag|Add a page/));
      for (const h of hintSpans) {
        const size = parseInt(h.style.fontSize);
        expect(size).toBeGreaterThanOrEqual(9);
      }
    }
    stop();
    destroy();
  });
});
