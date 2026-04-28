/**
 * Scroll Container Collector
 *
 * Identifies scrollable elements on the page - elements with overflow:auto/scroll
 * where scrollHeight > clientHeight (or scrollWidth > clientWidth). Detects nested
 * scroll containers which are the root cause of "wrong thing scrolls" bugs.
 *
 * Returns a flat list of scroll containers with their scroll position, total
 * scrollable area, and nesting depth, plus issues for nested containers.
 *
 * @see docs/roadmap/roadmap.md - M13.4 scroll containers
 */

import { buildSelector } from '../selector.js';
import { walkDOM } from './collector-utils.js';


/**
 * Check if an element is a scroll container.
 * @param {Element} el
 * @returns {boolean}
 */
function isScrollContainer(el) {
  const cs = window.getComputedStyle(el);
  // Check both computed style and inline style (jsdom doesn't compute inline)
  const overflowY = cs.overflowY || el.style.overflowY || el.style.overflow;
  const overflowX = cs.overflowX || el.style.overflowX || el.style.overflow;
  const scrollable = (v) => v === 'auto' || v === 'scroll';
  if (!scrollable(overflowY) && !scrollable(overflowX)) return false;
  return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
}

/**
 * Collect scroll containers from the live DOM.
 * @returns {{ containers: Array, issues: Array }}
 */
export function collectScrollContainers() {
  const containers = [];
  const issues = [];

  for (const node of walkDOM({ max: 2000 })) {
    if (isScrollContainer(node)) {
      // Calculate nesting depth (how many scroll container ancestors)
      let depth = 0;
      let parent = node.parentElement;
      while (parent && parent !== document.body) {
        if (isScrollContainer(parent)) depth++;
        parent = parent.parentElement;
      }

      containers.push({
        selector: buildSelector(node),
        tag: node.tagName.toLowerCase(),
        scrollTop: Math.round(node.scrollTop),
        scrollLeft: Math.round(node.scrollLeft),
        scrollHeight: node.scrollHeight,
        scrollWidth: node.scrollWidth,
        clientHeight: node.clientHeight,
        clientWidth: node.clientWidth,
        depth,
      });
    }
  }

  // Detect nested scroll containers (depth > 0)
  const nested = containers.filter((c) => c.depth > 0);
  if (nested.length > 0) {
    issues.push({
      type: 'nested-scroll',
      message: `${nested.length} nested scroll container(s) - may cause unexpected scroll behavior`,
      containers: nested.map((c) => c.selector),
    });
  }

  return { containers, issues };
}
