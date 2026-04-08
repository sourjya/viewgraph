/**
 * HTML Snapshot Serializer
 *
 * Lightweight DOM serializer that produces a self-contained HTML snapshot
 * for fidelity comparison against ViewGraph JSON captures. Not a full
 * SingleFile replacement - captures enough for element-level comparison.
 *
 * Approach: clone the document, inline key computed styles on visible
 * elements, strip scripts, return outerHTML.
 */

/** Style properties worth inlining for fidelity comparison. */
const INLINE_PROPS = [
  'display', 'visibility', 'position', 'width', 'height',
  'color', 'background-color', 'font-family', 'font-size', 'font-weight',
];

/**
 * Capture an HTML snapshot of the current page.
 * @returns {string} Self-contained HTML string
 */
export function captureSnapshot() {
  const clone = document.documentElement.cloneNode(true);

  // Strip all script tags
  for (const script of clone.querySelectorAll('script')) {
    script.remove();
  }

  // Inline key computed styles on visible elements in the original DOM,
  // then apply to the clone. We read styles from the live DOM (clone
  // has no computed styles since it's detached).
  const liveElements = document.querySelectorAll('body *');
  const cloneElements = clone.querySelectorAll('body *');

  for (let i = 0; i < liveElements.length && i < cloneElements.length; i++) {
    const computed = window.getComputedStyle(liveElements[i]);
    if (computed.display === 'none') continue;
    const styles = INLINE_PROPS
      .map((p) => `${p}:${computed.getPropertyValue(p)}`)
      .join(';');
    cloneElements[i].setAttribute('data-vg-styles', styles);
  }

  // Add meta tag identifying this as a ViewGraph snapshot
  const meta = clone.querySelector('head') || clone;
  const tag = document.createElement('meta');
  tag.setAttribute('name', 'viewgraph-snapshot');
  tag.setAttribute('content', new Date().toISOString());
  meta.prepend(tag);

  return `<!DOCTYPE html>\n${clone.outerHTML}`;
}
