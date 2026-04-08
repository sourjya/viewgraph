/**
 * HTML Snapshot Serializer
 *
 * Lightweight DOM serializer that produces a self-contained HTML snapshot
 * for fidelity comparison against ViewGraph JSON captures. Not a full
 * SingleFile replacement - captures enough for element-level comparison.
 *
 * Handles: SPA rendered DOM (runs after render), shadow DOM (serialized
 * as data-vg-shadow attributes for server-side parsing).
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

  // Inline key computed styles on visible elements. We read from the
  // live DOM since the detached clone has no computed styles.
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

  // Serialize shadow DOM content as data attributes so the fidelity
  // comparator can count those elements. cloneNode does not clone
  // shadow roots, so we flatten them into the light DOM clone.
  serializeShadowRoots(document.body, clone.querySelector('body') || clone);

  // Add meta tag identifying this as a ViewGraph snapshot
  const meta = clone.querySelector('head') || clone;
  const tag = document.createElement('meta');
  tag.setAttribute('name', 'viewgraph-snapshot');
  tag.setAttribute('content', new Date().toISOString());
  meta.prepend(tag);

  return `<!DOCTYPE html>\n${clone.outerHTML}`;
}

/**
 * Walk the live DOM looking for shadow roots. For each one, serialize
 * its innerHTML into a data-vg-shadow attribute on the matching clone
 * element so the server-side parser can count those elements.
 */
function serializeShadowRoots(liveEl, cloneEl) {
  if (liveEl.shadowRoot) {
    cloneEl.setAttribute('data-vg-shadow', liveEl.shadowRoot.innerHTML);
  }
  const liveChildren = [...liveEl.children];
  const cloneChildren = [...cloneEl.children];
  for (let i = 0; i < liveChildren.length && i < cloneChildren.length; i++) {
    serializeShadowRoots(liveChildren[i], cloneChildren[i]);
  }
}
