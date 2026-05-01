/**
 * Sidebar SVG Icon Factory
 *
 * Creates SVG icon elements via DOM API (createElementNS) instead of
 * innerHTML. Eliminates XSS surface and satisfies Firefox store review
 * requirements for no innerHTML with markup.
 *
 * Each function returns a fresh SVGElement. Call site appends it to the DOM.
 * Icons accept optional size/color overrides for reuse at different scales.
 *
 * @see docs/architecture/modularity-audit.md - innerHTML cleanup
 */

const NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG root element with standard attributes.
 * @param {number} size - Width and height in px
 * @param {object} [opts] - Optional overrides: stroke, strokeWidth, fill
 * @returns {SVGElement}
 */
function svg(size, opts = {}) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', opts.fill || 'none');
  el.setAttribute('stroke', opts.stroke || 'currentColor');
  el.setAttribute('stroke-width', String(opts.strokeWidth || 2));
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  return el;
}

/** Create an SVG child element (path, circle, polyline, etc.). */
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// ──────────────────────────────────────────────
// Icon factories - each returns a fresh SVGElement
// ──────────────────────────────────────────────

/** Checkmark polyline. Used for resolved, copied, sent confirmations. */
export function checkIcon(size = 12, color = 'var(--vg-color-success, #4ade80)') {
  const s = svg(size, { stroke: color, strokeWidth: 2.5 });
  s.appendChild(el('polyline', { points: '20 6 9 17 4 12' }));
  return s;
}

/** X / close icon. Used for close buttons and delete. */
export function closeIcon(size = 18, color = 'var(--vg-color-text-muted, #666)' /* COLOR.muted */) {
  const s = svg(size, { stroke: color });
  s.appendChild(el('path', { d: 'M18 6L6 18M6 6l12 12' }));
  return s;
}

/** Chevron left. Used for back/collapse buttons. */
export function chevronLeftIcon(size = 18, color = 'var(--vg-color-accent, #a5b4fc)') {
  const s = svg(size, { stroke: color });
  s.appendChild(el('polyline', { points: '15 18 9 12 15 6' }));
  return s;
}

/** Chevron right. Used for collapse/expand. */
export function chevronRightIcon(size = 18, color = 'var(--vg-color-text-muted, #666)' /* COLOR.muted */) {
  const s = svg(size, { stroke: color });
  s.appendChild(el('polyline', { points: '9 18 15 12 9 6' }));
  return s;
}

/** Bell / notification icon. */
export function bellIcon(size = 18) {
  const s = svg(size);
  s.appendChild(el('path', { d: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' }));
  s.appendChild(el('path', { d: 'M13.73 21a2 2 0 01-3.46 0' }));
  return s;
}

/** Send / paper plane icon. */
export function sendIcon(size = 14) {
  const s = svg(size);
  s.appendChild(el('path', { d: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' }));
  return s;
}

/** Copy / clipboard icon. */
export function copyIcon(size = 12) {
  const s = svg(size);
  s.appendChild(el('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2' }));
  s.appendChild(el('path', { d: 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' }));
  return s;
}

/** Document / markdown icon. */
export function docIcon(size = 14) {
  const s = svg(size);
  s.appendChild(el('path', { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }));
  s.appendChild(el('polyline', { points: '14 2 14 8 20 8' }));
  s.appendChild(el('line', { x1: '16', y1: '13', x2: '8', y2: '13' }));
  s.appendChild(el('line', { x1: '16', y1: '17', x2: '8', y2: '17' }));
  return s;
}

/** Download icon. */
export function downloadIcon(size = 14) {
  const s = svg(size);
  s.appendChild(el('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }));
  s.appendChild(el('polyline', { points: '7 10 12 15 17 10' }));
  s.appendChild(el('line', { x1: '12', y1: '15', x2: '12', y2: '3' }));
  return s;
}

/** Trash / delete icon. */
export function trashIcon(size = 12, color = 'var(--vg-color-text-muted, #666)' /* COLOR.muted */) {
  const s = svg(size, { stroke: color });
  s.appendChild(el('polyline', { points: '3 6 5 6 21 6' }));
  s.appendChild(el('path', { d: 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' }));
  return s;
}

/** Camera / capture icon. */
export function cameraIcon(size = 16) {
  const s = svg(size);
  s.appendChild(el('path', { d: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z' }));
  s.appendChild(el('circle', { cx: '12', cy: '13', r: '4' }));
  return s;
}

/** Circle (empty) icon. Used for unresolved annotation marker. */
export function circleIcon(size = 12, color = 'var(--vg-color-text-muted, #666)' /* COLOR.muted */) {
  const s = svg(size, { stroke: color });
  s.appendChild(el('circle', { cx: '12', cy: '12', r: '10' }));
  return s;
}

/** Note / sparkle icon. Used for "add as note" button. */
export function noteIcon(size = 14) {
  const s = svg(size);
  s.appendChild(el('path', { d: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5' }));
  s.appendChild(el('line', { x1: '15', y1: '9', x2: '15.01', y2: '9' }));
  return s;
}

/** Crosshair / target icon. Used for element mode. */
export function crosshairIcon(size = 12, color = 'var(--vg-color-info-light, #93c5fd)') {
  const s = svg(size, { stroke: color });
  s.appendChild(el('circle', { cx: '12', cy: '12', r: '10' }));
  s.appendChild(el('circle', { cx: '12', cy: '12', r: '3' }));
  s.appendChild(el('path', { d: 'M12 2v4M12 18v4M2 12h4M18 12h4' }));
  return s;
}

/** Tag icon. Used for region mode. */
export function tagIcon(size = 12, color = 'var(--vg-color-text-dim, #6b7280)') {
  const s = svg(size, { stroke: color });
  s.appendChild(el('path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z' }));
  s.appendChild(el('circle', { cx: '7', cy: '7', r: '1', fill: color }));
  return s;
}

/** Settings / gear icon. */
export function gearIcon(size = 12) {
  const s = svg(size);
  s.appendChild(el('circle', { cx: '12', cy: '12', r: '3' }));
  s.appendChild(el('path', { d: 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' }));
  return s;
}

/**
 * Chat bubble with count badge. Used for collapsed strip annotation count.
 * @param {number} count - Number to display inside bubble
 * @param {string} fill - Fill color for the bubble
 * @param {string} stroke - Stroke color for the bubble
 * @returns {SVGElement}
 */
export function chatBubbleIcon(count, fill, stroke) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', '32');
  s.setAttribute('height', '32');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.appendChild(el('path', {
    d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
    fill, stroke, 'stroke-width': '1.2',
  }));
  const text = document.createElementNS(NS, 'text');
  text.setAttribute('x', '12');
  text.setAttribute('y', '14');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', 'var(--vg-color-white, #fff)');
  text.setAttribute('font-family', 'system-ui,sans-serif');
  text.setAttribute('font-size', '10');
  text.setAttribute('font-weight', '700');
  text.textContent = String(count);
  s.appendChild(text);
  return s;
}

/**
 * Shield icon for trust indicator.
 * @param {number} size
 * @param {string} color
 * @param {'check'|'x'|'none'} inner - check for trusted, x for untrusted
 */
export function shieldIcon(size = 14, color = 'var(--vg-color-success, #4ade80)', inner = 'none') {
  const s = svg(size, { stroke: color, fill: 'none' });
  s.appendChild(el('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }));
  if (inner === 'check') {
    s.appendChild(el('polyline', { points: '9 12 11 14 15 10', 'stroke-width': '2.5' }));
  } else if (inner === 'x') {
    s.appendChild(el('path', { d: 'M10 10l4 4M14 10l-4 4', 'stroke-width': '2.5' }));
  }
  return s;
}

/**
 * Safely set SVG content on an element. Uses innerHTML because DOMParser
 * with image/svg+xml is unreliable in Chrome extension content script
 * and shadow DOM contexts. All SVG strings in this codebase are hardcoded
 * constants - never user data.
 *
 * This is the SINGLE place to change if a better SVG injection method
 * becomes available.
 *
 * @param {Element} el - Target element
 * @param {string} svgHtml - SVG markup string (hardcoded, not user data)
 */
export function setSvg(el, svgHtml) {
  el.innerHTML = svgHtml;
}

/**
 * Create an SVG element from a string. Returns the SVG element.
 * @param {string} svgString - SVG markup
 * @returns {Element}
 */
export function svgFromString(svgString) {
  const wrapper = document.createElement('span');
  wrapper.style.display = 'contents';
  wrapper.innerHTML = svgString;
  return wrapper.firstElementChild || wrapper;
}
