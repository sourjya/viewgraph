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

  it('(-) does not fire onSend without Ctrl modifier', () => {
    const onSend = vi.fn();
    startShortcuts({ onSend });
    press('Enter');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('(-) does not fire onCopyMd without Ctrl+Shift', () => {
    const onCopyMd = vi.fn();
    startShortcuts({ onCopyMd });
    press('c');
    press('c', { ctrlKey: true });
    press('c', { shiftKey: true });
    expect(onCopyMd).not.toHaveBeenCalled();
  });

  it('(+) fires onCopyMd on Ctrl+Shift+C', () => {
    const onCopyMd = vi.fn();
    startShortcuts({ onCopyMd });
    press('c', { ctrlKey: true, shiftKey: true });
    expect(onCopyMd).toHaveBeenCalledTimes(1);
  });

  it('(+) fires onToggleCollapse on Ctrl+Shift+B', () => {
    const onToggleCollapse = vi.fn();
    startShortcuts({ onToggleCollapse });
    press('b', { ctrlKey: true, shiftKey: true });
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('(+) fires onClose on Ctrl+Shift+X', () => {
    const onClose = vi.fn();
    startShortcuts({ onClose });
    press('x', { ctrlKey: true, shiftKey: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('(-) Ctrl+B without Shift does not fire onToggleCollapse', () => {
    const onToggleCollapse = vi.fn();
    startShortcuts({ onToggleCollapse });
    press('b', { ctrlKey: true });
    expect(onToggleCollapse).not.toHaveBeenCalled();
  });

  it('(+) fires onDelete on Delete key', () => {
    const onDelete = vi.fn();
    startShortcuts({ onDelete });
    press('Delete');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('(+) fires onDelete on Backspace key', () => {
    const onDelete = vi.fn();
    startShortcuts({ onDelete });
    press('Backspace');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('(-) severity keys 4-9 do not fire onSeverity', () => {
    const onSeverity = vi.fn();
    startShortcuts({ onSeverity });
    press('4');
    press('5');
    press('9');
    press('0');
    expect(onSeverity).not.toHaveBeenCalled();
  });

  it('(-) regular letter keys do not trigger any handler', () => {
    const handlers = { onEscape: vi.fn(), onSend: vi.fn(), onCopyMd: vi.fn(), onSeverity: vi.fn(), onDelete: vi.fn() };
    startShortcuts(handlers);
    press('a');
    press('z');
    press(' ');
    press('Tab');
    for (const fn of Object.values(handlers)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('(-) ignores keys when typing in page input', () => {
    const onEscape = vi.fn();
    const onSeverity = vi.fn();
    startShortcuts({ onEscape, onSeverity });
    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: input });
    document.body.dispatchEvent(event);
    expect(onSeverity).not.toHaveBeenCalled();
    input.remove();
  });

  it('(-) ignores keys when typing in textarea', () => {
    const onDelete = vi.fn();
    startShortcuts({ onDelete });
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: ta });
    document.body.dispatchEvent(event);
    expect(onDelete).not.toHaveBeenCalled();
    ta.remove();
  });

  it('(+) Cmd+Enter works as alternative to Ctrl+Enter (Mac)', () => {
    const onSend = vi.fn();
    startShortcuts({ onSend });
    press('Enter', { metaKey: true });
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
