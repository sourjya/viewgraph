/**
 * Collector Utilities
 *
 * Shared helpers for enrichment collectors. Eliminates duplicated
 * DOM traversal, visibility checks, and element filtering patterns
 * across 14 collector modules.
 *
 * @see docs/architecture/codebase-review-2026-04-18.md - Finding #7
 */

import { ATTR } from '../selector.js';

/**
 * Walk visible DOM elements, skipping ViewGraph UI elements.
 * Yields elements up to `max` count, excluding elements inside
 * the ViewGraph sidebar (marked with ATTR).
 *
 * @param {{ max?: number, root?: Element }} options
 * @yields {Element}
 */
export function* walkDOM({ max = 2000, root = document.body } = {}) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let count = 0;
  let node = walker.nextNode();
  while (node && count < max) {
    if (!node.closest(`[${ATTR}]`)) {
      count++;
      yield node;
    }
    node = walker.nextNode();
  }
}

/**
 * Check if an element has zero dimensions (not rendered or collapsed).
 * @param {Element} el
 * @returns {boolean}
 */
export function isZeroSize(el) {
  const rect = el.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0;
}

/**
 * Check if an element is visually hidden via CSS.
 * Checks display, visibility, and opacity.
 * @param {Element} el
 * @returns {boolean}
 */
export function isVisuallyHidden(el) {
  const cs = window.getComputedStyle(el);
  return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0';
}

/**
 * Check if an element is inside the ViewGraph sidebar UI.
 * @param {Element} el
 * @returns {boolean}
 */
export function isVGUI(el) {
  return !!el.closest(`[${ATTR}]`);
}
