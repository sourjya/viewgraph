/**
 * Sidebar Strip - Unit Tests
 *
 * Covers: creation, badge, mode buttons, expand callback,
 * BUG-024 drag repositioning, persistence, hover grip indicator.
 *
 * @see lib/sidebar/strip.js
 * @see docs/bugs/BUG-024-collapsed-strip-not-repositionable.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStrip } from '#lib/sidebar/strip.js';
import { mockChrome } from '../../mocks/chrome.js';

let chromeMock;
beforeEach(() => {
  chromeMock = mockChrome({
    runtime: { getURL: (p) => `chrome-extension://test/${p}` },
    storage: {
      local: {
        get: vi.fn((key, cb) => { if (cb) cb({}); return Promise.resolve({}); }),
        set: vi.fn(() => Promise.resolve()),
      },
    },
  });
});

const MODE_ICONS = {
  element: '<svg width="16" height="16"></svg>',
  region: '<svg width="16" height="16"></svg>',
  page: '<svg width="16" height="16"></svg>',
};
const MODE_HINTS = { element: 'Click', region: 'Drag', page: 'Note' };

/** Helper to create a strip with default opts. */
function makeStrip(overrides = {}) {
  return createStrip({ onExpand: vi.fn(), modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: vi.fn(), ...overrides });
}

describe('createStrip', () => {
  it('(+) returns element with updateCount and updateModeButtons', () => {
    const s = makeStrip();
    expect(s.element).toBeTruthy();
    expect(typeof s.updateCount).toBe('function');
    expect(typeof s.updateModeButtons).toBe('function');
  });

  it('(+) starts hidden', () => {
    const s = makeStrip();
    expect(s.element.style.display).toBe('none');
  });

  it('(+) updateCount creates badge element', () => {
    const s = makeStrip();
    s.updateCount();
    const badge = s.element.querySelector('[data-vg-badge-count]');
    expect(badge).toBeTruthy();
  });

  it('(+) updateCount shows 0 when no annotations', () => {
    const s = makeStrip();
    s.updateCount();
    const badge = s.element.querySelector('[data-vg-badge-count]');
    expect(badge.textContent).toContain('0');
  });

  it('(+) onExpand callback fires on chevron click', () => {
    const onExpand = vi.fn();
    const s = makeStrip({ onExpand });
    const buttons = s.element.querySelectorAll('button');
    buttons[0].click(); // expand chevron
    expect(onExpand).toHaveBeenCalled();
  });

  it('(+) has mode buttons for each icon', () => {
    const s = makeStrip();
    const buttons = s.element.querySelectorAll('button[data-mode]');
    expect(buttons.length).toBe(3);
  });

  it('(+) onModeClick fires with key', () => {
    const onModeClick = vi.fn();
    const s = makeStrip({ onModeClick });
    const btn = s.element.querySelector('[data-mode="element"]');
    btn.click();
    expect(onModeClick).toHaveBeenCalledWith('element');
  });
});

// ──────────────────────────────────────────────
// BUG-024: Drag repositioning
// ──────────────────────────────────────────────

describe('BUG-024: drag repositioning', () => {
  it('(+) strip has default top: 60px', () => {
    const s = makeStrip();
    expect(s.element.style.top).toBe('60px');
  });

  it('(+) mousedown + mousemove > 4px initiates drag (does not expand)', () => {
    const onExpand = vi.fn();
    const s = makeStrip({ onExpand });
    document.body.appendChild(s.element);
    const icon = s.element.querySelector('img');

    icon.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 110, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    // Drag moved > 4px, so onExpand should NOT fire
    expect(onExpand).not.toHaveBeenCalled();
    document.body.removeChild(s.element);
  });

  it('(+) mousedown + mouseup without move triggers expand (click)', () => {
    const onExpand = vi.fn();
    const s = makeStrip({ onExpand });
    document.body.appendChild(s.element);
    const icon = s.element.querySelector('img');

    icon.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(onExpand).toHaveBeenCalled();
    document.body.removeChild(s.element);
  });

  it('(+) drag updates element top position', () => {
    const s = makeStrip();
    document.body.appendChild(s.element);
    const icon = s.element.querySelector('img');

    icon.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 200, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    // Top should have changed from default 60px
    const newTop = parseInt(s.element.style.top, 10);
    expect(newTop).not.toBe(60);
    document.body.removeChild(s.element);
  });

  it('(-) drag clamps to viewport top (cannot go above 0)', () => {
    const s = makeStrip();
    document.body.appendChild(s.element);
    const icon = s.element.querySelector('img');

    icon.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: -500, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const top = parseInt(s.element.style.top, 10);
    expect(top).toBeGreaterThanOrEqual(0);
    document.body.removeChild(s.element);
  });

  it('(+) drag persists position to chrome.storage.local', () => {
    const s = makeStrip();
    document.body.appendChild(s.element);
    const icon = s.element.querySelector('img');

    icon.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 200, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ vg_strip_top: expect.any(Number) }),
    );
    document.body.removeChild(s.element);
  });
});

describe('BUG-024: persistence (restore from storage)', () => {
  it('(+) restores saved top position from storage', async () => {
    chromeMock.storage.local.get = vi.fn((key, cb) => {
      if (cb) cb({ vg_strip_top: 300 });
      return Promise.resolve({ vg_strip_top: 300 });
    });
    const s = makeStrip();
    // Allow async storage read to complete
    await new Promise((r) => setTimeout(r, 10));
    expect(s.element.style.top).toBe('300px');
  });

  it('(+) uses default 60px when no saved position', async () => {
    chromeMock.storage.local.get = vi.fn((key, cb) => {
      if (cb) cb({});
      return Promise.resolve({});
    });
    const s = makeStrip();
    await new Promise((r) => setTimeout(r, 10));
    expect(s.element.style.top).toBe('60px');
  });
});

describe('BUG-024: hover grip indicator', () => {
  it('(+) VG icon shows grab cursor on hover', () => {
    const s = makeStrip();
    const icon = s.element.querySelector('img');
    icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(icon.style.cursor).toBe('grab');
  });

  it('(+) VG icon reverts cursor on mouseleave', () => {
    const s = makeStrip();
    const icon = s.element.querySelector('img');
    icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    icon.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(icon.style.cursor).toBe('pointer');
  });

  it('(+) grip dots element appears on icon hover', () => {
    const s = makeStrip();
    const icon = s.element.querySelector('img');
    icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const grip = s.element.querySelector('[data-vg-grip]');
    expect(grip).toBeTruthy();
    expect(grip.style.opacity).not.toBe('0');
  });

  it('(+) grip dots element hides on mouseleave', () => {
    const s = makeStrip();
    const icon = s.element.querySelector('img');
    icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    icon.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    const grip = s.element.querySelector('[data-vg-grip]');
    expect(grip.style.opacity).toBe('0');
  });
});
