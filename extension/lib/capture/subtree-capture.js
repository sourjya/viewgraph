/**
 * Subtree Capture
 *
 * Captures a focused subtree of the DOM with full detail (all computed
 * styles, not just high-salience). Used when the user draws a box around
 * a specific area and says "capture just this".
 *
 * Produces a smaller, more focused capture payload with richer detail
 * per element than a full-page capture.
 *
 * @see docs/roadmap/roadmap.md - M14.4
 */

import { buildSelector } from '../selector.js';

/**
 * Capture a subtree rooted at the given element.
 * @param {Element} root - Root element of the subtree
 * @param {{ maxDepth?: number }} options
 * @returns {{ elements: Array, rootSelector: string, elementCount: number }}
 */
export function captureSubtree(root, options = {}) {
  const maxDepth = options.maxDepth ?? 10;
  const elements = [];

  function walk(el, depth) {
    if (depth > maxDepth) return;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    elements.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      testid: el.getAttribute('data-testid') || undefined,
      text: el.textContent?.trim().slice(0, 100) || undefined,
      bbox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      styles: {
        display: cs.display, position: cs.position,
        color: cs.color, background: cs.backgroundColor,
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        margin: cs.margin, padding: cs.padding,
        border: cs.border, borderRadius: cs.borderRadius,
        opacity: cs.opacity, zIndex: cs.zIndex,
        overflow: cs.overflow, visibility: cs.visibility,
      },
      attributes: getAttributes(el),
      interactive: isInteractive(el),
      depth,
    });

    for (const child of el.children) {
      walk(child, depth + 1);
    }
  }

  walk(root, 0);

  return {
    elements,
    rootSelector: buildSelector(root),
    elementCount: elements.length,
  };
}

/** Get relevant attributes from an element. */
function getAttributes(el) {
  const attrs = {};
  for (const attr of ['role', 'aria-label', 'aria-hidden', 'aria-expanded', 'href', 'type', 'name', 'placeholder', 'disabled']) {
    const val = el.getAttribute(attr);
    if (val != null) attrs[attr] = val;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/** Check if element is interactive. */
function isInteractive(el) {
  const tag = el.tagName.toLowerCase();
  return ['a', 'button', 'input', 'select', 'textarea', 'summary'].includes(tag)
    || el.hasAttribute('tabindex')
    || el.getAttribute('role') === 'button';
}
