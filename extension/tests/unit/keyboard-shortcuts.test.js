/**
 * Keyboard Shortcuts - Unit Tests
 *
 * @see lib/keyboard-shortcuts.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startShortcuts, stopShortcuts, isShortcutsActive } from '#lib/keyboard-shortcuts.js';

beforeEach(() => { stopShortcuts(); });
afterEach(() => { stopShortcuts(); });

function press(key, opts = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  document.body.dispatchEvent(event);
}

describe('keyboard shortcuts', () => {
  it('(+) starts and reports active', () => {
    expect(isShortcutsActive()).toBe(false);
    startShortcuts({});
    expect(isShortcutsActive()).toBe(true);
  });

  it('(+) stops and reports inactive', () => {
    startShortcuts({});
    stopShortcuts();
    expect(isShortcutsActive()).toBe(false);
  });

  it('(+) fires onEscape on Escape key', () => {
    const onEscape = vi.fn();
    startShortcuts({ onEscape });
    press('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('(+) fires onSend on Ctrl+Enter', () => {
    const onSend = vi.fn();
    startShortcuts({ onSend });
    press('Enter', { ctrlKey: true });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('(+) fires onSeverity with correct value', () => {
    const onSeverity = vi.fn();
    startShortcuts({ onSeverity });
    press('1');
    expect(onSeverity).toHaveBeenCalledWith('critical');
    press('2');
    expect(onSeverity).toHaveBeenCalledWith('major');
    press('3');
    expect(onSeverity).toHaveBeenCalledWith('minor');
  });

  it('(-) does not fire after stop', () => {
    const onEscape = vi.fn();
    startShortcuts({ onEscape });
    stopShortcuts();
    press('Escape');
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('(-) double start is safe', () => {
    startShortcuts({});
    startShortcuts({});
    expect(isShortcutsActive()).toBe(true);
  });
});
