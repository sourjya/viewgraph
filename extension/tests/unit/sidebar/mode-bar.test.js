/**
 * Mode Bar Unit Tests
 * @see lib/sidebar/mode-bar.js
 */
import { describe, it, expect, vi } from 'vitest';
import { createModeBar, MODE_ICONS, MODE_HINTS } from '#lib/sidebar/mode-bar.js';

describe('createModeBar', () => {
  it('(+) creates three mode buttons', () => {
    const m = createModeBar({ onModeClick: vi.fn() });
    expect(Object.keys(m.buttons)).toEqual(['element', 'region', 'page']);
  });

  it('(+) clicking a button calls onModeClick with key', () => {
    const fn = vi.fn();
    const m = createModeBar({ onModeClick: fn });
    m.buttons.element.click();
    expect(fn).toHaveBeenCalledWith('element');
  });

  it('(+) updateActive highlights the active mode', () => {
    const m = createModeBar({ onModeClick: vi.fn() });
    m.updateActive('region');
    expect(m.buttons.region.style.background).toContain('99, 102, 241');
    expect(m.buttons.element.style.background).toBe('transparent');
  });

  it('(+) updateActive(null) deactivates all', () => {
    const m = createModeBar({ onModeClick: vi.fn() });
    m.updateActive('element');
    m.updateActive(null);
    expect(m.buttons.element.style.background).toBe('transparent');
  });

  it('(+) MODE_ICONS has all three keys', () => {
    expect(MODE_ICONS.element).toContain('svg');
    expect(MODE_ICONS.region).toContain('svg');
    expect(MODE_ICONS.page).toContain('svg');
  });

  it('(+) MODE_HINTS has all three keys', () => {
    expect(MODE_HINTS.element).toBe('Click to select');
    expect(MODE_HINTS.region).toBe('Shift+drag area');
    expect(MODE_HINTS.page).toBe('Add a page note');
  });
});
