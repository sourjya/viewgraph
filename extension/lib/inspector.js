/**
 * Hover Inspector
 *
 * Interactive element inspection overlay for the ViewGraph extension.
 * Activated from the popup via "Inspect Element" mode.
 *
 * UX flow:
 * 1. Hover: overlay highlights element, tooltip shows CSS breadcrumb + metadata
 * 2. Scroll-wheel: navigate DOM tree (up = parent, down = first child)
 * 3. Click: freeze selection, show action bar (Capture / Copy Selector / Cancel)
 * 4. Escape: cancel and clean up at any point
 *
 * All inspector DOM elements use `data-vg-inspector` for cleanup and
 * exclusion from captures.
 *
 * @see docs/roadmap/roadmap.md - Milestone 5
 */

import { traverseDOM } from './traverser.js';
import { scoreAll } from './salience.js';
import { serialize } from './serializer.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ATTR = 'data-vg-inspector';

/** Overlay colors by nesting depth (cycles after 5). */
const DEPTH_COLORS = [
  'rgba(66, 133, 244, 0.25)',
  'rgba(52, 168, 83, 0.25)',
  'rgba(251, 188, 4, 0.25)',
  'rgba(234, 67, 53, 0.25)',
  'rgba(171, 71, 188, 0.25)',
];

const BORDER_COLORS = [
  'rgba(66, 133, 244, 0.8)',
  'rgba(52, 168, 83, 0.8)',
  'rgba(251, 188, 4, 0.8)',
  'rgba(234, 67, 53, 0.8)',
  'rgba(171, 71, 188, 0.8)',
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let active = false;
let frozen = false;  // true after click, shows action bar
let currentEl = null;
let overlayEl = null;
let tooltipEl = null;
let actionBarEl = null;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/** Calculate nesting depth from document.body. */
function getDepth(el) {
  let depth = 0;
  let node = el;
  while (node && node !== document.body) {
    depth++;
    node = node.parentElement;
  }
  return depth;
}

/** Get the element under the cursor, piercing open shadow roots. */
function deepElementFromPoint(x, y) {
  let el = document.elementFromPoint(x, y);
  if (!el) return null;
  while (el.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

/**
 * Build a compact CSS selector segment for one element.
 * Shows tag + significant classes (max 2) or id.
 */
function selectorSegment(el) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const classes = [...el.classList].filter((c) => !c.startsWith('_') && c.length < 25).slice(0, 2);
  return classes.length ? `${tag}.${classes.join('.')}` : tag;
}

/**
 * Build a CSS breadcrumb path from the element up to body.
 * Returns something like: div.card-group > div.card.p-4 > div.card-body
 * Truncates from the left if too long.
 */
export function buildBreadcrumb(el) {
  const segments = [];
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    segments.unshift(selectorSegment(node));
    node = node.parentElement;
  }
  return segments.join(' > ');
}

/** Implicit ARIA roles for common HTML elements. Browsers compute these
 *  but el.getAttribute('role') only returns explicit roles. */
const IMPLICIT_ROLES = {
  a: 'link', button: 'button', h1: 'heading', h2: 'heading', h3: 'heading',
  h4: 'heading', h5: 'heading', h6: 'heading', img: 'img', input: 'textbox',
  nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo',
  aside: 'complementary', form: 'form', select: 'combobox', textarea: 'textbox',
  table: 'table', ul: 'list', ol: 'list', li: 'listitem', dialog: 'dialog',
  details: 'group', summary: 'button', progress: 'progressbar', meter: 'meter',
};

/** Get the ARIA role: explicit attribute > computedRole API > implicit lookup. */
export function getRole(el) {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit;
  if (el.computedRole) return el.computedRole;
  return IMPLICIT_ROLES[el.tagName.toLowerCase()] || null;
}

/**
 * Build the metadata line: testid, role, aria-label, dimensions.
 * Only includes attributes that exist.
 */
export function buildMetaLine(el) {
  const parts = [];
  const testid = el.getAttribute('data-testid');
  parts.push(testid ? `testid: ${testid}` : 'testid: none');
  const role = getRole(el);
  parts.push(role ? `role: ${role}` : 'role: none');
  const label = el.getAttribute('aria-label');
  if (label) parts.push(`aria: ${label}`);
  const rect = el.getBoundingClientRect();
  parts.push(`${Math.round(rect.width)}x${Math.round(rect.height)}`);
  return parts.join('  |  ');
}

/**
 * Get the best selector for copying: testid > id > css path.
 */
export function bestSelector(el) {
  const testid = el.getAttribute('data-testid');
  if (testid) return `[data-testid="${testid}"]`;
  if (el.id) return `#${el.id}`;
  // Build a structural CSS selector
  const parts = [];
  let node = el;
  while (node && node !== document.body) {
    const tag = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (!parent) { parts.unshift(tag); break; }
    const siblings = [...parent.children].filter((c) => c.tagName === node.tagName);
    if (siblings.length === 1) {
      parts.unshift(tag);
    } else {
      parts.unshift(`${tag}:nth-child(${[...parent.children].indexOf(node) + 1})`);
    }
    node = parent;
  }
  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// Overlay + Tooltip + Action Bar creation
// ---------------------------------------------------------------------------

function createOverlay() {
  const el = document.createElement('div');
  el.setAttribute(ATTR, 'overlay');
  Object.assign(el.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '2147483646',
    border: '2px solid', borderRadius: '2px', transition: 'all 0.08s ease-out',
  });
  document.documentElement.appendChild(el);
  return el;
}

function createTooltip() {
  const el = document.createElement('div');
  el.setAttribute(ATTR, 'tooltip');
  Object.assign(el.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
    background: 'rgba(0,0,0,0.88)', color: '#fff', padding: '5px 10px',
    borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace',
    lineHeight: '1.5', maxWidth: '600px', overflow: 'hidden',
    transition: 'all 0.08s ease-out',
  });
  document.documentElement.appendChild(el);
  return el;
}

/** Create the action bar that appears on click-to-freeze. */
function createActionBar() {
  const bar = document.createElement('div');
  bar.setAttribute(ATTR, 'actionbar');
  Object.assign(bar.style, {
    position: 'fixed', zIndex: '2147483647',
    display: 'flex', gap: '2px', padding: '3px',
    background: 'rgba(55,48,90,0.95)', borderRadius: '6px',
  });

  const btnBase = {
    border: 'none', borderRadius: '4px', padding: '5px',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', width: '28px', height: '28px',
    background: 'transparent', transition: 'background 0.12s',
  };

  // Capture subtree - camera icon
  const captureBtn = makeIconBtn(
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    'Capture subtree', btnBase,
  );
  captureBtn.addEventListener('click', (e) => { e.stopPropagation(); captureSubtree(currentEl); });

  // Copy selector - clipboard icon
  const copyBtn = makeIconBtn(
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
    'Copy selector', btnBase,
  );
  copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copySelector(copyBtn); });

  // Cancel
  const cancelBtn = makeIconBtn(
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    'Cancel', btnBase,
  );
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); unfreeze(); });

  bar.append(captureBtn, copyBtn, cancelBtn);
  document.documentElement.appendChild(bar);
  return bar;
}

/** Create an icon button with hover effect and title tooltip. */
function makeIconBtn(svgHtml, title, baseStyle) {
  const btn = document.createElement('button');
  btn.setAttribute(ATTR, 'btn');
  btn.title = title;
  btn.innerHTML = svgHtml;
  Object.assign(btn.style, baseStyle);
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
  return btn;
}

// ---------------------------------------------------------------------------
// Highlight + Tooltip update
// ---------------------------------------------------------------------------

function highlight(el) {
  if (!el || el.hasAttribute(ATTR)) return;
  currentEl = el;
  const rect = el.getBoundingClientRect();
  const depth = getDepth(el);
  const colorIdx = depth % DEPTH_COLORS.length;

  Object.assign(overlayEl.style, {
    top: `${rect.top}px`, left: `${rect.left}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
    background: DEPTH_COLORS[colorIdx],
    borderColor: BORDER_COLORS[colorIdx],
    display: 'block',
  });

  updateTooltip(el, rect);
}

/** Update tooltip with breadcrumb path + metadata line. */
function updateTooltip(el, rect) {
  const breadcrumb = buildBreadcrumb(el);
  const meta = buildMetaLine(el);

  tooltipEl.innerHTML = '';

  // Row 1: crosshair icon + breadcrumb (clips from left via rtl on text span)
  // Last segment (target element) is bold white for emphasis
  const line1 = document.createElement('div');
  line1.setAttribute(ATTR, 'line');
  Object.assign(line1.style, { display: 'flex', alignItems: 'center', gap: '5px' });

  const icon1 = document.createElement('span');
  icon1.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
  Object.assign(icon1.style, { flexShrink: '0', display: 'flex' });

  const segments = breadcrumb.split(' > ');
  const text1 = document.createElement('span');
  Object.assign(text1.style, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left', flex: '1', minWidth: '0' });
  if (segments.length > 1) {
    const ancestors = document.createElement('span');
    ancestors.textContent = segments.slice(0, -1).join(' > ') + ' > ';
    Object.assign(ancestors.style, { color: '#93c5fd' });
    const target = document.createElement('span');
    target.textContent = segments[segments.length - 1];
    Object.assign(target.style, { color: '#e0e7ff', fontWeight: '600' });
    text1.append(ancestors, target);
  } else {
    text1.textContent = breadcrumb;
    Object.assign(text1.style, { color: '#e0e7ff', fontWeight: '600' });
  }

  line1.append(icon1, text1);

  // Row 2: tag icon + metadata
  const line2 = document.createElement('div');
  line2.setAttribute(ATTR, 'line');
  Object.assign(line2.style, { display: 'flex', alignItems: 'center', gap: '5px' });

  const icon2 = document.createElement('span');
  icon2.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1" fill="#6b7280"/></svg>';
  Object.assign(icon2.style, { flexShrink: '0', display: 'flex' });

  const text2 = document.createElement('span');
  text2.textContent = meta;
  Object.assign(text2.style, { color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px' });

  line2.append(icon2, text2);

  tooltipEl.append(line1, line2);

  const tooltipY = rect.top > 50 ? rect.top - 46 : rect.bottom + 6;
  Object.assign(tooltipEl.style, {
    top: `${tooltipY}px`, left: `${rect.left}px`, display: 'block',
  });
}

// ---------------------------------------------------------------------------
// Freeze / Unfreeze (click-to-freeze with action bar)
// ---------------------------------------------------------------------------

function freeze() {
  if (!currentEl) return;
  frozen = true;

  // Show action bar below the tooltip
  actionBarEl = createActionBar();
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const barY = tooltipRect.bottom + 4;
  const barX = Math.max(4, tooltipRect.left);
  Object.assign(actionBarEl.style, { top: `${barY}px`, left: `${barX}px` });
}

function unfreeze() {
  frozen = false;
  if (actionBarEl) { actionBarEl.remove(); actionBarEl = null; }
}

// ---------------------------------------------------------------------------
// Copy selector with tick confirmation
// ---------------------------------------------------------------------------

function copySelector(btn) {
  if (!currentEl) return;
  const selector = bestSelector(currentEl);
  navigator.clipboard.writeText(selector).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  });
}

// ---------------------------------------------------------------------------
// Subtree capture
// ---------------------------------------------------------------------------

function captureSubtree(rootEl) {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const { elements, relations } = traverseDOM(rootEl);
  const scored = scoreAll(elements, viewport);
  const capture = serialize(scored, relations);
  capture.metadata.captureMode = 'subtree-inspect';
  capture.metadata.inspectRoot = {
    tag: rootEl.tagName.toLowerCase(),
    testid: rootEl.getAttribute('data-testid') || null,
    selector: bestSelector(rootEl),
  };
  chrome.runtime.sendMessage({ type: 'inspect-capture', capture });
  stop();
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onMouseMove(e) {
  if (frozen) return;  // Don't move highlight while action bar is showing
  const el = deepElementFromPoint(e.clientX, e.clientY);
  if (el && el !== currentEl) highlight(el);
}

function onWheel(e) {
  if (!currentEl || frozen) return;
  e.preventDefault();
  e.stopPropagation();

  let next;
  if (e.deltaY < 0) {
    next = currentEl.parentElement;
    if (!next || next === document.documentElement) return;
  } else {
    next = [...currentEl.children].find(
      (c) => !c.hasAttribute(ATTR) && c.offsetWidth > 0 && c.offsetHeight > 0,
    );
    if (!next) return;
  }
  highlight(next);
}

function onKeyDown(e) {
  if (e.key === 'Escape') stop();
}

function onClick(e) {
  if (!currentEl) return;
  // Ignore clicks on action bar buttons (they have their own handlers)
  if (e.target.hasAttribute(ATTR)) return;
  e.preventDefault();
  e.stopPropagation();
  if (frozen) { unfreeze(); } else { freeze(); }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function start() {
  if (active) return;
  active = true;
  frozen = false;
  overlayEl = createOverlay();
  tooltipEl = createTooltip();

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', onClick, true);
}

export function stop() {
  if (!active) return;
  active = false;
  frozen = false;
  currentEl = null;

  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('wheel', onWheel, { capture: true, passive: false });
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('click', onClick, true);

  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.remove());
  overlayEl = null;
  tooltipEl = null;
  actionBarEl = null;
}

export function isActive() {
  return active;
}
