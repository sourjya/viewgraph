/**
 * Stacking Context Collector
 *
 * Walks the DOM to identify stacking context boundaries and detect z-index
 * conflicts. A stacking context is created by elements with position + z-index,
 * opacity < 1, transform, filter, isolation, etc. Z-index only works within
 * the same stacking context - this is the root cause of "dropdown behind modal" bugs.
 *
 * Returns a tree of stacking contexts with their resolved z-index order,
 * plus a list of potential conflicts (overlapping elements where visual order
 * doesn't match z-index expectation).
 *
 * @see docs/roadmap/roadmap.md - M13.1 z-index stacking context resolution
 */

import { buildSelector, ATTR } from './selector.js';


/**
 * Check if an element creates a new stacking context.
 * @param {CSSStyleDeclaration} cs - computed styles
 * @returns {string|null} - trigger reason or null
 */
function getStackingTrigger(cs) {
  if (cs.position !== 'static' && cs.zIndex !== 'auto') return `position:${cs.position} z-index:${cs.zIndex}`;
  if (parseFloat(cs.opacity) < 1) return `opacity:${cs.opacity}`;
  if (cs.transform !== 'none') return 'transform';
  if (cs.filter !== 'none' && cs.filter !== '') return 'filter';
  if (/opacity|transform|filter|z-index/.test(cs.willChange || '')) return `will-change:${cs.willChange}`;
  if (cs.isolation === 'isolate') return 'isolation:isolate';
  if (cs.mixBlendMode !== 'normal') return `mix-blend-mode:${cs.mixBlendMode}`;
  if (/layout|paint|strict|content/.test(cs.contain || '')) return `contain:${cs.contain}`;
  if (cs.position === 'fixed') return 'position:fixed';
  if (cs.position === 'sticky') return 'position:sticky';
  return null;
}

/**
 * Collect stacking contexts from the live DOM.
 * @returns {{ contexts: Array, issues: Array }}
 */
export function collectStackingContexts() {
  const contexts = [];
  const issues = [];
  const MAX_ELEMENTS = 2000;
  let count = 0;

  // Walk DOM and find all stacking context creators
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node && count < MAX_ELEMENTS) {
    count++;
    if (node.closest(`[${ATTR}]`)) { node = walker.nextNode(); continue; }
    const cs = window.getComputedStyle(node);
    const trigger = getStackingTrigger(cs);
    if (trigger) {
      const rect = node.getBoundingClientRect();
      // Skip invisible elements
      if (rect.width === 0 && rect.height === 0) { node = walker.nextNode(); continue; }
      contexts.push({
        selector: buildSelector(node),
        trigger,
        zIndex: cs.zIndex === 'auto' ? 'auto' : parseInt(cs.zIndex, 10),
        bbox: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
        element: node,
      });
    }
    node = walker.nextNode();
  }

  // Detect conflicts: sibling stacking contexts that overlap spatially
  // where a lower z-index element visually covers a higher one
  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      const a = contexts[i];
      const b = contexts[j];
      // Only compare siblings in the same parent stacking context
      if (!a.element.parentElement || a.element.parentElement !== b.element.parentElement) continue;
      // Both must have numeric z-index
      if (a.zIndex === 'auto' || b.zIndex === 'auto') continue;
      // Check spatial overlap
      if (!overlaps(a.bbox, b.bbox)) continue;
      // If z-indices differ, the one with lower z-index that appears later in DOM
      // will visually cover the higher one - that's a potential conflict
      if (a.zIndex !== b.zIndex) {
        const higher = a.zIndex > b.zIndex ? a : b;
        const lower = a.zIndex > b.zIndex ? b : a;
        issues.push({
          type: 'z-index-conflict',
          message: `${higher.selector} (z-index:${higher.zIndex}) may be behind ${lower.selector} (z-index:${lower.zIndex}) due to stacking context`,
          higher: { selector: higher.selector, zIndex: higher.zIndex },
          lower: { selector: lower.selector, zIndex: lower.zIndex },
        });
      }
    }
  }

  // Strip element references before returning (not serializable)
  const serializable = contexts.map(({ element: _el, ...rest }) => rest);
  return { contexts: serializable, issues };
}

/** Check if two bboxes [x, y, w, h] overlap. */
function overlaps(a, b) {
  return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] &&
         a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
}
