/**
 * Themed Tooltip Component
 *
 * Attaches to elements with `data-tooltip` inside the sidebar's shadow DOM.
 * Uses a MutationObserver to auto-attach to new elements as they're added.
 * Removes native `title` attributes to prevent double-tooltip.
 *
 * @see docs/ideas/themed-tooltip-component.md
 * @see https://mayank.co/blog/tooltip-using-webcomponents/ - shadow DOM tooltip patterns
 */

import { COLOR, FONT } from './sidebar/styles.js';

const SHOW_DELAY = 300;
const GAP = 6;

/**
 * Create and manage tooltips inside a shadow root.
 * Observes the shadow DOM for new `data-tooltip` elements and attaches listeners.
 * @param {ShadowRoot} shadowRoot
 * @returns {{ destroy: function }}
 */
export function createTooltip(shadowRoot) {
  const tip = document.createElement('div');
  tip.setAttribute('role', 'tooltip');
  Object.assign(tip.style, {
    position: 'fixed', zIndex: '2147483647', pointerEvents: 'none',
    background: COLOR.bgCard, color: COLOR.text, border: `1px solid ${COLOR.border}`,
    borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontFamily: FONT,
    maxWidth: '200px', lineHeight: '1.4', whiteSpace: 'normal',
    opacity: '0', transition: 'opacity 150ms',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });
  shadowRoot.appendChild(tip);

  let showTimer = null;
  let currentAnchor = null;
  const attached = new WeakSet();

  /** Position and show the tooltip near the anchor element. */
  function show(anchor) {
    const text = anchor.getAttribute('data-tooltip');
    if (!text) return;
    currentAnchor = anchor;
    tip.textContent = text;
    tip.style.opacity = '1';

    const rect = anchor.getBoundingClientRect();
    const placement = anchor.getAttribute('data-tooltip-placement') || 'above';
    const left = Math.max(4, Math.min(rect.left + rect.width / 2, window.innerWidth - 104));
    tip.style.left = `${left}px`;
    tip.style.transform = 'translateX(-50%)';

    if (placement === 'below' || rect.top < 50) {
      tip.style.top = `${rect.bottom + GAP}px`;
    } else {
      tip.style.top = `${rect.top - GAP - 28}px`;
    }

    const id = 'vg-tip-' + Date.now();
    tip.id = id;
    anchor.setAttribute('aria-describedby', id);
  }

  /** Hide the tooltip. */
  function hide() {
    clearTimeout(showTimer);
    showTimer = null;
    tip.style.opacity = '0';
    if (currentAnchor) {
      currentAnchor.removeAttribute('aria-describedby');
      currentAnchor = null;
    }
  }

  /**
   * Attach pointerenter/pointerleave + focus/blur listeners to an element.
   * Also removes the native `title` attribute to prevent double-tooltip.
   */
  function attach(el) {
    if (attached.has(el)) return;
    attached.add(el);

    // Remove native title to prevent browser's built-in tooltip
    if (el.hasAttribute('title')) el.removeAttribute('title');

    el.addEventListener('pointerenter', () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => show(el), SHOW_DELAY);
    });
    el.addEventListener('pointerleave', () => hide());
    el.addEventListener('focusin', () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => show(el), SHOW_DELAY);
    });
    el.addEventListener('focusout', () => hide());
  }

  /** Scan for all data-tooltip elements and attach listeners. */
  function scan() {
    for (const el of shadowRoot.querySelectorAll('[data-tooltip]')) {
      attach(el);
    }
  }

  // Initial scan
  scan();

  // Watch for new elements added to the shadow DOM
  const observer = new MutationObserver(() => scan());
  observer.observe(shadowRoot, { childList: true, subtree: true });

  return {
    destroy() {
      observer.disconnect();
      clearTimeout(showTimer);
      tip.remove();
    },
  };
}
