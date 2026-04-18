/**
 * Themed Tooltip Component
 *
 * Singleton tooltip that attaches to any element with a `data-tooltip` attribute
 * inside the sidebar's shadow DOM. Uses event delegation - no per-element setup.
 *
 * Usage:
 *   <button data-tooltip="Send annotations to your AI agent">Send</button>
 *   createTooltip(shadowRoot);
 *
 * @see docs/ideas/themed-tooltip-component.md
 */

import { COLOR, FONT } from './sidebar/styles.js';

const SHOW_DELAY = 300;
const HIDE_DELAY = 0;
const MAX_WIDTH = 200;
const GAP = 6;

/**
 * Attach tooltip behavior to a shadow root via event delegation.
 * Creates a single tooltip div, repositioned per hover/focus.
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
    maxWidth: `${MAX_WIDTH}px`, lineHeight: '1.4', whiteSpace: 'normal',
    opacity: '0', transition: `opacity 150ms`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });
  shadowRoot.appendChild(tip);

  let showTimer = null;
  let currentTarget = null;

  function show(anchor) {
    const text = anchor.getAttribute('data-tooltip');
    if (!text) return;
    tip.textContent = text;
    tip.style.opacity = '1';

    // Position: above by default, flip to below if near top
    const rect = anchor.getBoundingClientRect();
    tip.style.left = `${rect.left + rect.width / 2}px`;
    tip.style.transform = 'translateX(-50%)';

    const placement = anchor.getAttribute('data-tooltip-placement') || 'above';
    if (placement === 'below' || rect.top < 60) {
      tip.style.top = `${rect.bottom + GAP}px`;
    } else {
      tip.style.top = `${rect.top - GAP - 28}px`;
    }

    // Link for a11y
    const id = 'vg-tooltip-' + Date.now();
    tip.id = id;
    anchor.setAttribute('aria-describedby', id);
    currentTarget = anchor;
  }

  function hide() {
    clearTimeout(showTimer);
    tip.style.opacity = '0';
    if (currentTarget) {
      currentTarget.removeAttribute('aria-describedby');
      currentTarget = null;
    }
  }

  function onEnter(e) {
    const anchor = e.target.closest?.('[data-tooltip]');
    if (!anchor) return;
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(anchor), SHOW_DELAY);
  }

  function onLeave(e) {
    const anchor = e.target.closest?.('[data-tooltip]');
    if (!anchor) return;
    hide();
  }

  shadowRoot.addEventListener('mouseenter', onEnter, true);
  shadowRoot.addEventListener('mouseleave', onLeave, true);
  shadowRoot.addEventListener('focusin', onEnter, true);
  shadowRoot.addEventListener('focusout', onLeave, true);

  return {
    destroy() {
      shadowRoot.removeEventListener('mouseenter', onEnter, true);
      shadowRoot.removeEventListener('mouseleave', onLeave, true);
      shadowRoot.removeEventListener('focusin', onEnter, true);
      shadowRoot.removeEventListener('focusout', onLeave, true);
      tip.remove();
    },
  };
}
