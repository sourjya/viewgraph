/**
 * Tests for sidebar/styles.js - shared style constants.
 * Verifies exported constants have expected shape and values.
 *
 * @see extension/lib/sidebar/styles.js
 */

import { describe, it, expect } from 'vitest';
import {
  FONT, FONT_MONO, LABEL_STYLE, TOGGLE_STYLE, TOGGLE_ON, TOGGLE_OFF,
  ACTION_BTN_STYLE, ICON_BTN_STYLE, TAB_STYLE, DESC_STYLE,
  DIVIDER_STYLE, DIVIDER_SUBTLE_STYLE,
} from '#lib/sidebar/styles.js';

describe('sidebar/styles', () => {
  it('(+) FONT is system-ui stack', () => {
    expect(FONT).toContain('system-ui');
  });

  it('(+) FONT_MONO is monospace stack', () => {
    expect(FONT_MONO).toContain('monospace');
  });

  it('(+) LABEL_STYLE has fontWeight and fontSize', () => {
    expect(LABEL_STYLE.fontWeight).toBe('600');
    expect(LABEL_STYLE.fontSize).toBe('11px');
    expect(LABEL_STYLE.fontFamily).toBe(FONT);
  });

  it('(+) TOGGLE_STYLE has cursor pointer', () => {
    expect(TOGGLE_STYLE.cursor).toBe('pointer');
  });

  it('(+) TOGGLE_ON/OFF have contrasting colors', () => {
    expect(TOGGLE_ON.background).not.toBe(TOGGLE_OFF.background);
    expect(TOGGLE_ON.color).not.toBe(TOGGLE_OFF.color);
  });

  it('(+) ACTION_BTN_STYLE has display flex', () => {
    expect(ACTION_BTN_STYLE.display).toBe('flex');
  });

  it('(+) ICON_BTN_STYLE has transparent background', () => {
    expect(ICON_BTN_STYLE.background).toBe('transparent');
  });

  it('(+) TAB_STYLE has text-align center', () => {
    expect(TAB_STYLE.textAlign).toBe('center');
  });

  it('(+) DESC_STYLE has muted color', () => {
    expect(DESC_STYLE.color).toContain('--vg-color-text-dim');
  });

  it('(+) DIVIDER_STYLE has border-top', () => {
    expect(DIVIDER_STYLE.borderTop).toContain('solid');
  });

  it('(+) DIVIDER_SUBTLE_STYLE uses darker color', () => {
    expect(DIVIDER_SUBTLE_STYLE.borderTop).toContain('--vg-surface-hover');
  });
});

describe('addHover', () => {
  it('(+) sets background on mouseenter and resets on mouseleave', () => {
    const { addHover } = require('#lib/sidebar/styles.js');
    const el = document.createElement('button');
    addHover(el, 'red', 'blue');
    el.dispatchEvent(new Event('mouseenter'));
    expect(el.style.background).toBe('red');
    el.dispatchEvent(new Event('mouseleave'));
    expect(el.style.background).toBe('blue');
  });

  it('(+) uses defaults when no args provided', () => {
    const { addHover, COLOR: _COLOR } = require('#lib/sidebar/styles.js');
    const el = document.createElement('button');
    addHover(el);
    el.dispatchEvent(new Event('mouseenter'));
    expect(el.style.background).toContain('255, 255, 255');
    el.dispatchEvent(new Event('mouseleave'));
    expect(el.style.background).toBe('transparent');
  });
});
