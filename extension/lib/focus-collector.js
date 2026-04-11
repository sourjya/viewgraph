/**
 * Focus Management Chain Collector
 *
 * Captures the current focus state: active element, tab order sequence,
 * focus traps (elements that intercept Tab), and unreachable interactive
 * elements. Debugs "can't tab to submit" and "focus stuck in modal" bugs.
 *
 * Tab order follows browser rules: tabIndex > 0 first (ascending), then
 * tabIndex = 0 in DOM order, skipping tabIndex = -1 and hidden elements.
 *
 * @see docs/roadmap/roadmap.md - M13.2 focus management chain
 */

import { buildSelector, ATTR } from './selector.js';


/** Focusable element selectors (matches browser tab-stop behavior). */
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]', '[contenteditable="true"]',
].join(',');

/** Check if an element is visible and not hidden from the accessibility tree. */
function isVisible(el) {
  const cs = window.getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  if (cs.opacity && parseFloat(cs.opacity) === 0) return false;
  return true;
}

/**
 * Collect focus management data from the live DOM.
 * @returns {{ activeElement: string|null, tabOrder: Array, traps: Array, unreachable: Array, issues: Array }}
 */
export function collectFocusChain() {
  const issues = [];

  // Active element
  const active = document.activeElement;
  const activeSelector = active && active !== document.body ? buildSelector(active) : null;

  // Gather all focusable elements
  const all = [...document.querySelectorAll(FOCUSABLE)]
    .filter((el) => !el.closest(`[${ATTR}]`));

  // Split by tabIndex behavior
  const positive = []; // tabIndex > 0 (sorted ascending)
  const zero = [];     // tabIndex = 0 or implicit (DOM order)
  const negative = []; // tabIndex = -1 (unreachable via Tab)

  for (const el of all) {
    if (!isVisible(el)) continue;
    const ti = el.tabIndex;
    if (ti < 0) {
      negative.push(el);
    } else if (ti > 0) {
      positive.push(el);
    } else {
      zero.push(el);
    }
  }

  // Sort positive tabIndex ascending
  positive.sort((a, b) => a.tabIndex - b.tabIndex);

  // Tab order: positive first, then zero (DOM order)
  const tabOrder = [...positive, ...zero].slice(0, 200).map((el) => ({
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    tabIndex: el.tabIndex,
    role: el.getAttribute('role') || undefined,
    text: (el.textContent || '').trim().slice(0, 40) || undefined,
  }));

  // Unreachable: interactive elements with tabIndex=-1
  const unreachable = negative.slice(0, 50).map((el) => ({
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || '').trim().slice(0, 40) || undefined,
  }));

  // Detect focus traps: elements with role=dialog or [aria-modal=true]
  const traps = [];
  const trapEls = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]');
  for (const trap of trapEls) {
    if (trap.closest(`[${ATTR}]`)) continue;
    const focusable = trap.querySelectorAll(FOCUSABLE);
    const visibleFocusable = [...focusable].filter(isVisible);
    traps.push({
      selector: buildSelector(trap),
      tag: trap.tagName.toLowerCase(),
      focusableCount: visibleFocusable.length,
      containsActive: active ? trap.contains(active) : false,
    });
  }

  // Issues
  if (unreachable.length > 0) {
    issues.push({
      type: 'unreachable-elements',
      message: `${unreachable.length} interactive element(s) have tabIndex=-1 and cannot be reached via Tab`,
      count: unreachable.length,
    });
  }

  if (traps.length > 0) {
    for (const trap of traps) {
      if (trap.focusableCount === 0) {
        issues.push({
          type: 'empty-focus-trap',
          message: `${trap.selector} is a focus trap with no focusable elements inside`,
          selector: trap.selector,
        });
      }
    }
  }

  return { activeElement: activeSelector, tabOrder, traps, unreachable, issues };
}
