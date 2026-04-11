/**
 * Element Flash
 *
 * Brief highlight pulse on elements after selection. Provides visual
 * feedback that an element was successfully selected in annotate mode.
 *
 * Uses CSS animation injected via a style element. The flash overlay
 * is absolutely positioned over the target element and fades out.
 *
 * @see docs/roadmap/roadmap.md - M10.1
 */

const FLASH_DURATION_MS = 400;
const FLASH_CLASS = 'vg-flash-overlay';
let styleInjected = false;

/**
 * Flash a highlight pulse on an element.
 * @param {Element} el - DOM element to flash
 * @param {{ color?: string }} options
 */
export function flashElement(el, options = {}) {
  if (!el) return;
  injectStyle();

  const rect = el.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = FLASH_CLASS;
  overlay.style.cssText = `
    position: fixed; pointer-events: none; z-index: 2147483646;
    top: ${rect.top}px; left: ${rect.left}px;
    width: ${rect.width}px; height: ${rect.height}px;
    background: ${options.color || 'rgba(99, 102, 241, 0.3)'};
    border-radius: 4px;
  `;
  document.body.appendChild(overlay);
  // Force reflow then add animation class
  overlay.offsetHeight; // Force reflow before animation
  overlay.style.animation = `vg-flash ${FLASH_DURATION_MS}ms ease-out forwards`;
  setTimeout(() => overlay.remove(), FLASH_DURATION_MS + 50);
}

/** Inject the flash animation CSS once. */
function injectStyle() {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes vg-flash {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}
