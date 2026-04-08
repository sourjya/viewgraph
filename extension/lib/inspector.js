/**
 * Hover Inspector
 *
 * Interactive element inspection overlay for the ViewGraph extension.
 * Activated from the popup via "Inspect Element" mode. Provides:
 *
 * - Hover overlay: transparent highlight positioned over the hovered element
 * - Rich tooltip: tag, role, testid, aria-label, bbox, depth info
 * - Scroll-wheel DOM walking: scroll up = parent, scroll down = first child
 * - Click to capture: captures the selected element's subtree as ViewGraph JSON
 * - Escape to cancel: cleans up all overlays and exits inspect mode
 *
 * All DOM elements created by the inspector use a `data-vg-inspector`
 * attribute so they can be excluded from captures and cleaned up reliably.
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
  'rgba(66, 133, 244, 0.25)',   // blue
  'rgba(52, 168, 83, 0.25)',    // green
  'rgba(251, 188, 4, 0.25)',    // yellow
  'rgba(234, 67, 53, 0.25)',    // red
  'rgba(171, 71, 188, 0.25)',   // purple
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
let currentEl = null;
let overlayEl = null;
let tooltipEl = null;

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
  // Walk into shadow roots
  while (el.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

/** Build tooltip text for an element. */
export function buildTooltipText(el) {
  const tag = el.tagName.toLowerCase();
  const parts = [tag];

  const role = el.getAttribute('role');
  if (role) parts.push(`role="${role}"`);

  const testid = el.getAttribute('data-testid');
  if (testid) parts.push(`testid="${testid}"`);

  const label = el.getAttribute('aria-label');
  if (label) parts.push(`aria="${label}"`);

  if (el.id) parts.push(`#${el.id}`);

  const rect = el.getBoundingClientRect();
  parts.push(`${Math.round(rect.width)}x${Math.round(rect.height)}`);
  parts.push(`depth:${getDepth(el)}`);

  return parts.join('  ');
}

// ---------------------------------------------------------------------------
// Overlay + Tooltip creation
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
    background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '4px 8px',
    borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace',
    whiteSpace: 'nowrap', maxWidth: '500px', overflow: 'hidden',
    textOverflow: 'ellipsis', transition: 'all 0.08s ease-out',
  });
  document.documentElement.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Highlight logic
// ---------------------------------------------------------------------------

function highlight(el) {
  if (!el || el.hasAttribute(ATTR)) return;
  currentEl = el;
  const rect = el.getBoundingClientRect();
  const depth = getDepth(el);
  const colorIdx = depth % DEPTH_COLORS.length;

  // Position overlay
  Object.assign(overlayEl.style, {
    top: `${rect.top}px`, left: `${rect.left}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
    background: DEPTH_COLORS[colorIdx],
    borderColor: BORDER_COLORS[colorIdx],
    display: 'block',
  });

  // Position tooltip above the element, or below if near top
  tooltipEl.textContent = buildTooltipText(el);
  const tooltipY = rect.top > 30 ? rect.top - 28 : rect.bottom + 4;
  Object.assign(tooltipEl.style, {
    top: `${tooltipY}px`, left: `${rect.left}px`, display: 'block',
  });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onMouseMove(e) {
  const el = deepElementFromPoint(e.clientX, e.clientY);
  if (el && el !== currentEl) highlight(el);
}

/** Scroll-wheel DOM walking: up = parent, down = first visible child. */
function onWheel(e) {
  if (!currentEl) return;
  e.preventDefault();
  e.stopPropagation();

  let next;
  if (e.deltaY < 0) {
    // Scroll up = parent
    next = currentEl.parentElement;
    if (!next || next === document.documentElement) return;
  } else {
    // Scroll down = first visible child element
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
  e.preventDefault();
  e.stopPropagation();
  captureSubtree(currentEl);
}

// ---------------------------------------------------------------------------
// Subtree capture
// ---------------------------------------------------------------------------

/**
 * Capture the selected element's subtree as ViewGraph JSON and send
 * it to the background script for push to the MCP server.
 */
function captureSubtree(rootEl) {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const { elements, relations } = traverseDOM(rootEl);
  const scored = scoreAll(elements, viewport);
  const capture = serialize(scored, relations);
  // Tag as subtree capture
  capture.metadata.captureMode = 'subtree-inspect';
  capture.metadata.inspectRoot = {
    tag: rootEl.tagName.toLowerCase(),
    testid: rootEl.getAttribute('data-testid') || null,
    selector: rootEl.id ? `#${rootEl.id}` : rootEl.tagName.toLowerCase(),
  };

  chrome.runtime.sendMessage({ type: 'inspect-capture', capture });
  stop();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Start inspect mode. */
export function start() {
  if (active) return;
  active = true;
  overlayEl = createOverlay();
  tooltipEl = createTooltip();

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', onClick, true);
}

/** Stop inspect mode and clean up. */
export function stop() {
  if (!active) return;
  active = false;
  currentEl = null;

  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('wheel', onWheel, { capture: true, passive: false });
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('click', onClick, true);

  // Remove all inspector DOM elements
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.remove());
  overlayEl = null;
  tooltipEl = null;
}

/** Whether inspect mode is currently active. */
export function isActive() {
  return active;
}
