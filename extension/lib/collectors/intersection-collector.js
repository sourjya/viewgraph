/**
 * Intersection State Collector
 *
 * Checks which key elements are currently visible in the viewport using
 * `getBoundingClientRect()`. Identifies elements that are off-screen,
 * partially visible, or fully visible. Helps debug lazy-load failures
 * and infinite scroll issues.
 *
 * Does NOT inject an IntersectionObserver (too invasive for a capture).
 * Instead uses synchronous rect checks which are reliable and fast.
 *
 * @see docs/roadmap/roadmap.md - M13.8
 */

import { buildSelector, ATTR } from '../selector.js';


/**
 * Collect viewport intersection state for interactive and landmark elements.
 * @returns {{ visible: number, partial: number, offscreen: number, elements: Array }}
 */
export function collectIntersectionState() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let visible = 0;
  let partial = 0;
  let offscreen = 0;
  const elements = [];

  // Check interactive elements and landmarks
  const selector = 'button, a[href], input, select, textarea, [role="button"], img, h1, h2, h3, [data-testid]';
  const els = document.querySelectorAll(selector);

  for (const el of els) {
    if (el.closest(`[${ATTR}]`)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const state = getVisibility(rect, vw, vh);
    if (state === 'visible') visible++;
    else if (state === 'partial') partial++;
    else offscreen++;

    // Only include non-visible elements in detail (visible is the default)
    if (state !== 'visible') {
      elements.push({
        selector: buildSelector(el),
        tag: el.tagName.toLowerCase(),
        state,
        rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
      });
    }
  }

  return {
    visible, partial, offscreen,
    elements: elements.slice(0, 30),
  };
}

/** Determine visibility state from bounding rect. */
function getVisibility(rect, vw, vh) {
  if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) return 'offscreen';
  if (rect.top >= 0 && rect.bottom <= vh && rect.left >= 0 && rect.right <= vw) return 'visible';
  return 'partial';
}
