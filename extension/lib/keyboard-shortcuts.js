/**
 * Keyboard Shortcut Manager
 *
 * Handles keyboard shortcuts for ViewGraph annotate mode.
 * All shortcuts use Ctrl/Cmd modifier to avoid conflicts with page shortcuts.
 *
 * Shortcuts:
 * - Escape: deselect current element / close panel
 * - Ctrl+Enter: send annotations to agent
 * - Ctrl+Shift+C: copy markdown report
 * - Ctrl+Shift+S: take screenshot
 * - 1/2/3: set severity (critical/major/minor) on selected annotation
 * - Delete/Backspace: delete selected annotation
 *
 * @see docs/roadmap/roadmap.md
 */

import { ATTR } from './selector.js';

/**
 * @typedef {Object} ShortcutHandlers
 * @property {function} [onEscape] - Deselect / close panel
 * @property {function} [onSend] - Send to agent (Ctrl+Enter)
 * @property {function} [onCopyMd] - Copy markdown (Ctrl+Shift+C)
 * @property {function} [onScreenshot] - Screenshot (Ctrl+Shift+S)
 * @property {function} [onSeverity] - Set severity (1/2/3)
 * @property {function} [onDelete] - Delete annotation
 */

let active = false;
let handler = null;

/**
 * Start listening for keyboard shortcuts.
 * @param {ShortcutHandlers} handlers
 */
export function startShortcuts(handlers) {
  if (active) return;
  active = true;

  handler = (e) => {
    // Ignore if typing in an input/textarea inside our UI
    const target = e.target;
    if (target.closest(`[${ATTR}]`) && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    // Ignore if typing in page inputs (not our UI)
    if (!target.closest(`[${ATTR}]`) && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      handlers.onEscape?.();
      return;
    }

    if (ctrl && e.key === 'Enter') {
      e.preventDefault();
      handlers.onSend?.();
      return;
    }

    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      handlers.onCopyMd?.();
      return;
    }

    if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handlers.onScreenshot?.();
      return;
    }

    if (e.key === '1' || e.key === '2' || e.key === '3') {
      const severity = { '1': 'critical', '2': 'major', '3': 'minor' }[e.key];
      handlers.onSeverity?.(severity);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!target.closest(`[${ATTR}]`)) {
        e.preventDefault();
        handlers.onDelete?.();
      }
    }

    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handlers.onToggleCollapse?.();
      return;
    }

    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      handlers.onClose?.();
      return;
    }
  };

  document.addEventListener('keydown', handler, true);
}

/**
 * Stop listening for keyboard shortcuts.
 */
export function stopShortcuts() {
  if (handler) {
    document.removeEventListener('keydown', handler, true);
    handler = null;
  }
  active = false;
}

/**
 * Check if shortcuts are active.
 * @returns {boolean}
 */
export function isShortcutsActive() {
  return active;
}
