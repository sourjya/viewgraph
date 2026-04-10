/**
 * Visibility Collector
 *
 * Walks the ancestor chain to determine if an element is actually rendered
 * and visible to the user. Catches cases that computed styles on the element
 * alone miss: ancestor opacity: 0, off-screen positioning, clip-path hiding.
 *
 * The DOM traverser already filters display:none and visibility:hidden, so
 * this catches the remaining "invisible but technically in the DOM" cases.
 *
 * @see docs/roadmap/roadmap.md M13.3
 */

/**
 * Check if an element is actually rendered and visible to the user.
 * Walks ancestor chain checking for hiding patterns.
 * @param {Element} el
 * @returns {boolean}
 */
export function checkRendered(el) {
  if (!el || !(el instanceof Element)) return false;

  let current = el;
  while (current && current !== document.documentElement) {
    const cs = window.getComputedStyle(current);
    if (parseFloat(cs.opacity) === 0) return false;
    if (cs.clipPath === 'inset(100%)') return false;

    // Off-screen positioning heuristic
    const rect = current.getBoundingClientRect();
    if (rect.right < -5000 || rect.bottom < -5000) return false;

    current = current.parentElement;
  }
  return true;
}
