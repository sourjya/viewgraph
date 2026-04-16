/**
 * Sidebar Strip - Unit Tests
 *
 * @see lib/sidebar/strip.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStrip } from '#lib/sidebar/strip.js';

beforeEach(() => {
  globalThis.chrome = {
    runtime: { getURL: (p) => `chrome-extension://test/${p}` },
  };
});

const MODE_ICONS = {
  element: '<svg width="16" height="16"></svg>',
  region: '<svg width="16" height="16"></svg>',
  page: '<svg width="16" height="16"></svg>',
};
const MODE_HINTS = { element: 'Click', region: 'Drag', page: 'Note' };

describe('createStrip', () => {
  it('(+) returns element with updateCount and updateModeButtons', () => {
    const s = createStrip({ onExpand: () => {}, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: () => {} });
    expect(s.element).toBeTruthy();
    expect(typeof s.updateCount).toBe('function');
    expect(typeof s.updateModeButtons).toBe('function');
  });

  it('(+) starts hidden', () => {
    const s = createStrip({ onExpand: () => {}, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: () => {} });
    expect(s.element.style.display).toBe('none');
  });

  it('(+) updateCount creates badge element', () => {
    const s = createStrip({ onExpand: () => {}, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: () => {} });
    s.updateCount();
    const badge = s.element.querySelector('[data-vg-badge-count]');
    expect(badge).toBeTruthy();
  });

  it('(+) updateCount shows 0 when no annotations', () => {
    const s = createStrip({ onExpand: () => {}, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: () => {} });
    s.updateCount();
    const badge = s.element.querySelector('[data-vg-badge-count]');
    expect(badge.textContent).toContain('0');
  });

  it('(+) onExpand callback fires on chevron click', () => {
    const onExpand = vi.fn();
    const s = createStrip({ onExpand, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: () => {} });
    const buttons = s.element.querySelectorAll('button');
    buttons[0].click(); // expand chevron
    expect(onExpand).toHaveBeenCalled();
  });

  it('(+) has mode buttons for each icon', () => {
    const s = createStrip({ onExpand: () => {}, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick: () => {} });
    const buttons = s.element.querySelectorAll('button[data-mode]');
    expect(buttons.length).toBe(3);
  });

  it('(+) onModeClick fires with key', () => {
    const onModeClick = vi.fn();
    const s = createStrip({ onExpand: () => {}, modeIcons: MODE_ICONS, modeHints: MODE_HINTS, onModeClick });
    const btn = s.element.querySelector('[data-mode="element"]');
    btn.click();
    expect(onModeClick).toHaveBeenCalledWith('element');
  });
});
