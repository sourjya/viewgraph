/**
 * Unified Annotate Mode
 *
 * Single interaction mode combining element inspection and region annotation.
 * Two gestures, one workflow:
 *   - Click an element: freeze + open comment panel with element context
 *   - Shift+drag: select region + open comment panel with region context
 *
 * Both feed into the same annotation list. Replaces the separate inspector
 * and review modules per ADR-006.
 *
 * @see docs/decisions/ADR-006-merge-inspect-review.md
 * @see lib/annotation-panel.js - comment editing
 * @see lib/annotation-sidebar.js - annotation list
 */

import { traverseDOM } from './traverser.js';
import { scoreAll } from './salience.js';
import { serialize } from './serializer.js';
import { flashElement } from './element-flash.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Attribute used on all annotate-mode DOM elements for cleanup/exclusion. */
export const ATTR = 'data-vg-annotate';

/** Overlay colors by nesting depth for hover highlight. */
const DEPTH_COLORS = [
  'rgba(66, 133, 244, 0.25)', 'rgba(52, 168, 83, 0.25)',
  'rgba(251, 188, 4, 0.25)', 'rgba(234, 67, 53, 0.25)',
  'rgba(171, 71, 188, 0.25)',
];
const BORDER_COLORS = [
  'rgba(66, 133, 244, 0.8)', 'rgba(52, 168, 83, 0.8)',
  'rgba(251, 188, 4, 0.8)', 'rgba(234, 67, 53, 0.8)',
  'rgba(171, 71, 188, 0.8)',
];

/** Marker border colors for annotations. */
export const MARKER_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Capture mode constants - element and region are toggle modes, page is one-shot. */
export const CAPTURE_MODES = { ELEMENT: 'element', REGION: 'region', PAGE: 'page' };

let active = false;
let frozen = false;
let currentEl = null;
let overlayEl = null;
let tooltipEl = null;
let actionBarEl = null;
let captureMode = null;

// Drag selection state
let dragStart = null;
let selectionBox = null;

// Annotation state
let annotations = [];
let nextId = 1;
let nextPageNoteId = 1;

/** Callbacks set by the wiring layer to connect panel/sidebar. */
let onAnnotationAdded = null;
let onAnnotationRemoved = null;

// ---------------------------------------------------------------------------
// DOM helpers (from inspector)
// ---------------------------------------------------------------------------

function getDepth(el) {
  let depth = 0;
  let node = el;
  while (node && node !== document.body) { depth++; node = node.parentElement; }
  return depth;
}

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

/** Compact selector segment: tag#id or tag.class1.class2 */
export function selectorSegment(el) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const classes = [...el.classList].filter((c) => !c.startsWith('_') && c.length < 25).slice(0, 2);
  return classes.length ? `${tag}.${classes.join('.')}` : tag;
}

/** CSS breadcrumb from element up to body. */
export function buildBreadcrumb(el) {
  const segments = [];
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    segments.unshift(selectorSegment(node));
    node = node.parentElement;
  }
  return segments.join(' > ');
}

const IMPLICIT_ROLES = {
  a: 'link', button: 'button', h1: 'heading', h2: 'heading', h3: 'heading',
  h4: 'heading', h5: 'heading', h6: 'heading', img: 'img', input: 'textbox',
  nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo',
  aside: 'complementary', form: 'form', select: 'combobox', textarea: 'textbox',
  table: 'table', ul: 'list', ol: 'list', li: 'listitem', dialog: 'dialog',
  details: 'group', summary: 'button', progress: 'progressbar', meter: 'meter',
};

export function getRole(el) {
  const explicit = el.getAttribute('role');
  if (explicit) return { role: explicit, source: 'explicit' };
  const implicit = IMPLICIT_ROLES[el.tagName.toLowerCase()] || null;
  return implicit ? { role: implicit, source: 'implicit' } : { role: null, source: null };
}

export function buildMetaLine(el) {
  const parts = [];
  const testid = el.getAttribute('data-testid');
  parts.push(testid ? `testid: ${testid}` : 'testid: none');
  const { role, source } = getRole(el);
  if (role && source === 'implicit') parts.push(`role: ${role} (implicit)`);
  else parts.push(role ? `role: ${role}` : 'role: none');
  const label = el.getAttribute('aria-label');
  if (label) parts.push(`aria: ${label}`);
  const rect = el.getBoundingClientRect();
  parts.push(`${Math.round(rect.width)}x${Math.round(rect.height)}`);
  return parts.join('  |  ');
}

/**
 * Build an accessibility info line for the tooltip.
 * Shows role, computed accessible name, and relevant states.
 * Returns null if no meaningful a11y info is available.
 */
export function buildA11yLine(el) {
  const { role } = getRole(el);
  if (!role) return null;
  const parts = [`role: ${role}`];
  // Computed accessible name: aria-label > aria-labelledby > alt > title > text content
  const name = el.getAttribute('aria-label')
    || el.getAttribute('alt')
    || el.getAttribute('title')
    || (el.labels?.[0]?.textContent?.trim())
    || (el.textContent?.trim().slice(0, 40));
  if (name) parts.push(`name: "${name}"`);
  // States
  const states = [];
  if (el.tabIndex >= 0) states.push('focusable');
  if (el.disabled) states.push('disabled');
  if (el.required) states.push('required');
  if (el.getAttribute('aria-expanded')) states.push(el.getAttribute('aria-expanded') === 'true' ? 'expanded' : 'collapsed');
  if (el.getAttribute('aria-checked') === 'true') states.push('checked');
  if (el.getAttribute('aria-selected') === 'true') states.push('selected');
  if (states.length) parts.push(states.join(', '));
  return parts.join('  |  ');
}

export function bestSelector(el) {
  const testid = el.getAttribute('data-testid');
  if (testid) return `[data-testid="${testid}"]`;
  if (el.id) return `#${el.id}`;
  const parts = [];
  let node = el;
  while (node && node !== document.body) {
    const tag = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (!parent) { parts.unshift(tag); break; }
    const siblings = [...parent.children].filter((c) => c.tagName === node.tagName);
    if (siblings.length === 1) parts.unshift(tag);
    else parts.unshift(`${tag}:nth-child(${[...parent.children].indexOf(node) + 1})`);
    node = parent;
  }
  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// Hover overlay + tooltip
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

function highlight(el) {
  if (!el) return;
  // Skip our own UI elements and their children
  let node = el;
  while (node && node !== document.documentElement) {
    if (node.hasAttribute && node.hasAttribute(ATTR)) return;
    node = node.parentElement;
  }
  // Skip body/html and full-viewport wrappers
  const tag = el.tagName.toLowerCase();
  if (tag === 'html' || tag === 'body') return;
  const r = el.getBoundingClientRect();
  if (r.width >= window.innerWidth * 0.95 && r.height >= window.innerHeight * 0.95) return;
  currentEl = el;
  const rect = el.getBoundingClientRect();
  const depth = getDepth(el);
  const ci = depth % DEPTH_COLORS.length;
  Object.assign(overlayEl.style, {
    top: `${rect.top}px`, left: `${rect.left}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
    background: DEPTH_COLORS[ci], borderColor: BORDER_COLORS[ci], display: 'block',
  });
  updateTooltip(el, rect);
}

function updateTooltip(el, rect) {
  const breadcrumb = buildBreadcrumb(el);
  const meta = buildMetaLine(el);
  tooltipEl.innerHTML = '';

  const line1 = document.createElement('div');
  Object.assign(line1.style, { display: 'flex', alignItems: 'center', gap: '5px' });
  const icon1 = document.createElement('span');
  icon1.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
  Object.assign(icon1.style, { flexShrink: '0', display: 'flex' });
  const segments = breadcrumb.split(' > ');
  const text1 = document.createElement('span');
  Object.assign(text1.style, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left', flex: '1', minWidth: '0' });
  if (segments.length > 1) {
    const anc = document.createElement('span');
    anc.textContent = segments.slice(0, -1).join(' > ') + ' > ';
    Object.assign(anc.style, { color: '#93c5fd' });
    const tgt = document.createElement('span');
    tgt.textContent = segments[segments.length - 1];
    Object.assign(tgt.style, { color: '#e0e7ff', fontWeight: '600' });
    text1.append(anc, tgt);
  } else {
    text1.textContent = breadcrumb;
    Object.assign(text1.style, { color: '#e0e7ff', fontWeight: '600' });
  }
  line1.append(icon1, text1);

  const line2 = document.createElement('div');
  Object.assign(line2.style, { display: 'flex', alignItems: 'center', gap: '5px' });
  const icon2 = document.createElement('span');
  icon2.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1" fill="#6b7280"/></svg>';
  Object.assign(icon2.style, { flexShrink: '0', display: 'flex' });
  const text2 = document.createElement('span');
  text2.textContent = meta;
  Object.assign(text2.style, { color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px' });
  line2.append(icon2, text2);

  tooltipEl.append(line1, line2);

  // Fixed 2-line tooltip. Detail (a11y, isRendered, console) shows on
  // sidebar entry hover instead - see annotation-sidebar.js createEntry().
  const tooltipY = rect.top > 50 ? rect.top - 46 : rect.bottom + 6;
  Object.assign(tooltipEl.style, { top: `${tooltipY}px`, left: `${rect.left}px`, display: 'block' });
}

export function hideHoverUI() {
  if (overlayEl) overlayEl.style.display = 'none';
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ---------------------------------------------------------------------------
// Click-freeze: creates annotation from single element
// ---------------------------------------------------------------------------

function freeze() {
  if (!currentEl) return;

  // Skip body, html, and full-viewport wrapper elements
  const tag = currentEl.tagName.toLowerCase();
  if (tag === 'html' || tag === 'body') return;
  const rect = currentEl.getBoundingClientRect();
  if (rect.width >= window.innerWidth * 0.95 && rect.height >= window.innerHeight * 0.95) return;

  const region = {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
  const ancestor = selectorSegment(currentEl);
  const fullSelector = bestSelector(currentEl);

  // Dedup: reopen existing annotation if same element clicked again.
  // Primary: match by full selector (available for in-session annotations).
  // Fallback: match by ancestor + exact region (works for loaded annotations too).
  const existing = annotations.find((a) =>
    (a.element && a.element.selector === fullSelector
      && a.region.x === region.x && a.region.y === region.y
      && a.region.width === region.width && a.region.height === region.height)
    || (a.ancestor === ancestor
      && a.region.x === region.x && a.region.y === region.y
      && a.region.width === region.width && a.region.height === region.height));
  if (existing) {
    frozen = true;
    hideHoverUI();
    if (onAnnotationAdded) onAnnotationAdded(existing);
    return;
  }

  frozen = true;
  hideHoverUI();
  const id = nextId++;
  const cs = window.getComputedStyle(currentEl);
  const element = {
    tag: currentEl.tagName.toLowerCase(),
    selector: bestSelector(currentEl),
    text: (currentEl.textContent || '').trim().slice(0, 80) || null,
    placeholder: currentEl.getAttribute('placeholder') || null,
    type: currentEl.getAttribute('type') || null,
    fontSize: cs.fontSize,
    fontFamily: cs.fontFamily.split(',')[0].trim(),
    color: cs.color,
    bg: cs.backgroundColor,
  };
  const annotation = { id, uuid: crypto.randomUUID(), type: 'element', region, comment: '', severity: '', category: '', nids: [], ancestor, element, timestamp: new Date().toISOString() };
  annotations.push(annotation);
  createMarker(annotation, rect);
  flashElement(el);
  save();
  if (onAnnotationAdded) onAnnotationAdded(annotation);
}

function unfreeze() {
  frozen = false;
  if (actionBarEl) { actionBarEl.remove(); actionBarEl = null; }
}

// ---------------------------------------------------------------------------
// Copy selector utility
// ---------------------------------------------------------------------------

export function copySelector(btn, el) {
  if (!el) return;
  const selector = bestSelector(el);
  const doCopy = navigator.clipboard
    ? navigator.clipboard.writeText(selector).catch(() => fallbackCopy(selector))
    : Promise.resolve(fallbackCopy(selector));
  doCopy.then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  });
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  Object.assign(ta.style, { position: 'fixed', left: '-9999px' });
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

// ---------------------------------------------------------------------------
// Region selection (shift+drag) - creates annotation from region
// ---------------------------------------------------------------------------

function onMouseDown(e) {
  // Region drag: shift+drag always works, plain drag in region mode
  const startDrag = e.shiftKey || captureMode === CAPTURE_MODES.REGION;
  if (startDrag) {
    e.preventDefault();
    e.stopPropagation();
    if (frozen) unfreeze();
    hideHoverUI();
    dragStart = {
      x: Math.max(0, Math.min(e.clientX, window.innerWidth)),
      y: Math.max(0, Math.min(e.clientY, window.innerHeight)),
    };
    selectionBox = document.createElement('div');
    selectionBox.setAttribute(ATTR, 'selection');
    Object.assign(selectionBox.style, {
      position: 'fixed', border: '2px dashed #6366f1', background: 'rgba(99,102,241,0.08)',
      borderRadius: '3px', zIndex: '2147483645', pointerEvents: 'none',
    });
    document.documentElement.appendChild(selectionBox);
  }
}

function onMouseMove(e) {
  // Hide hover UI when mouse is over ViewGraph's own UI (sidebar, panel, etc.)
  let node = e.target;
  while (node && node !== document.documentElement) {
    if (node.hasAttribute && node.hasAttribute(ATTR)) { hideHoverUI(); return; }
    node = node.parentElement;
  }

  // Drag selection in progress
  if (dragStart && selectionBox) {
    e.preventDefault();
    e.stopPropagation();
    // Clamp to viewport bounds
    const cx = Math.max(0, Math.min(e.clientX, window.innerWidth));
    const cy = Math.max(0, Math.min(e.clientY, window.innerHeight));
    const x = Math.min(dragStart.x, cx);
    const y = Math.min(dragStart.y, cy);
    Object.assign(selectionBox.style, {
      left: `${x}px`, top: `${y}px`,
      width: `${Math.abs(cx - dragStart.x)}px`,
      height: `${Math.abs(cy - dragStart.y)}px`,
    });
    return;
  }
  // Normal hover (not frozen, not dragging)
  if (!frozen) {
    const el = deepElementFromPoint(e.clientX, e.clientY);
    if (el && el !== currentEl) highlight(el);
  }
}

function onMouseUp(e) {
  if (!dragStart || !selectionBox) return;
  const rect = selectionBox.getBoundingClientRect();
  selectionBox.remove();
  selectionBox = null;
  dragStart = null;

  if (rect.width < 10 || rect.height < 10) return;

  const region = {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
  const nids = findIntersectingNodes(rect);
  const ancestor = findCommonAncestor(rect) || null;
  const id = nextId++;
  const annotation = { id, uuid: crypto.randomUUID(), type: 'region', region, comment: '', severity: '', category: '', nids, ancestor, timestamp: new Date().toISOString() };
  annotations.push(annotation);
  createMarker(annotation, rect);
  flashElements(rect);
  save();
  if (onAnnotationAdded) onAnnotationAdded(annotation);
}

function onClick(e) {
  if (dragStart) return;
  if (!currentEl) return;
  // Ignore clicks on our own UI elements
  let node = e.target;
  while (node && node !== document.documentElement) {
    if (node.hasAttribute && node.hasAttribute(ATTR)) return;
    node = node.parentElement;
  }
  e.preventDefault();
  e.stopPropagation();
  if (frozen) { unfreeze(); } else { freeze(); }
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

// ---------------------------------------------------------------------------
// Node intersection + common ancestor (from review)
// ---------------------------------------------------------------------------

export function findIntersectingNodes(selRect) {
  const results = [];
  const elements = document.body.querySelectorAll('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.hasAttribute(ATTR)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const ox = Math.max(0, Math.min(r.right, selRect.right) - Math.max(r.left, selRect.left));
    const oy = Math.max(0, Math.min(r.bottom, selRect.bottom) - Math.max(r.top, selRect.top));
    if (ox * oy >= r.width * r.height * 0.5) results.push(i + 1);
  }
  return results;
}

export function findCommonAncestor(selRect) {
  const elements = document.body.querySelectorAll('*');
  const matched = [];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.hasAttribute(ATTR)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const ox = Math.max(0, Math.min(r.right, selRect.right) - Math.max(r.left, selRect.left));
    const oy = Math.max(0, Math.min(r.bottom, selRect.bottom) - Math.max(r.top, selRect.top));
    if (ox * oy >= r.width * r.height * 0.5) matched.push(el);
  }
  if (matched.length === 0) return null;
  if (matched.length === 1) return selectorSegment(matched[0]);
  let anc = matched[0];
  while (anc && anc !== document.body) {
    if (matched.every((el) => anc.contains(el))) return selectorSegment(anc);
    anc = anc.parentElement;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Markers + flash
// ---------------------------------------------------------------------------

function createMarker(annotation, selRect) {
  const { id, region } = annotation;
  const color = MARKER_COLORS[(id - 1) % MARKER_COLORS.length];
  const marker = document.createElement('div');
  marker.setAttribute(ATTR, `marker-${id}`);
  Object.assign(marker.style, {
    position: 'absolute', border: `2px solid ${color}`, background: `${color}11`,
    borderRadius: '3px', zIndex: '2147483644', pointerEvents: 'none',
    left: `${region.x}px`, top: `${region.y}px`,
    width: `${region.width}px`, height: `${region.height}px`,
  });
  const badge = document.createElement('div');
  badge.setAttribute(ATTR, 'badge');
  badge.textContent = id;
  Object.assign(badge.style, {
    position: 'absolute', top: '-10px', left: '-10px',
    width: '20px', height: '20px', borderRadius: '50%',
    background: color, color: '#fff', fontSize: '11px', fontWeight: '600',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    pointerEvents: 'auto', cursor: 'pointer',
  });
  // Click badge to reopen this annotation's panel directly (avoids dedup mismatch)
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    frozen = true;
    hideHoverUI();
    if (onAnnotationAdded) onAnnotationAdded(annotation);
  });
  marker.appendChild(badge);

  const ancestorName = annotation.ancestor || (selRect ? findCommonAncestor(selRect) : null);
  if (ancestorName) {
    const label = document.createElement('div');
    label.setAttribute(ATTR, 'label');
    label.textContent = ancestorName;
    Object.assign(label.style, {
      position: 'absolute', bottom: '-18px', left: '0',
      background: color, color: '#fff', fontSize: '10px', fontWeight: '500',
      padding: '1px 6px', borderRadius: '3px', whiteSpace: 'nowrap',
      fontFamily: 'SF Mono, Cascadia Code, monospace', opacity: '0.9',
    });
    marker.appendChild(label);
  }
  document.documentElement.appendChild(marker);
}

function removeMarker(id) {
  // Check both new and legacy attrs for transition safety
  const el = document.querySelector(`[${ATTR}="marker-${id}"]`)
    || document.querySelector(`[data-vg-review="marker-${id}"]`);
  if (el) el.remove();
}

function flashElements(selRect) {
  const elements = document.body.querySelectorAll('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.hasAttribute(ATTR)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const ox = Math.max(0, Math.min(r.right, selRect.right) - Math.max(r.left, selRect.left));
    const oy = Math.max(0, Math.min(r.bottom, selRect.bottom) - Math.max(r.top, selRect.top));
    if (ox * oy < r.width * r.height * 0.5) continue;
    const prev = el.style.outline;
    el.style.outline = '2px solid rgba(99,102,241,0.6)';
    setTimeout(() => { el.style.outline = prev; }, 500);
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function storageKey() {
  return `vg-annotations:${location.origin}${location.pathname}`;
}

export async function save() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  const key = storageKey();
  const data = annotations.map(({ id, uuid, type, region, comment, severity, category, nids, ancestor, element, resolved, resolution, timestamp }) =>
    ({ id, uuid, type, region, comment, severity, category, nids, ancestor, element, timestamp, ...(resolved ? { resolved, resolution } : {}) }));
  await chrome.storage.local.set({ [key]: { annotations: data, nextId, nextPageNoteId } });
}

export async function load() {
  if (typeof chrome === 'undefined' || !chrome.storage) return false;
  const key = storageKey();
  const result = await chrome.storage.local.get(key);
  const stored = result[key];
  if (!stored || !stored.annotations || stored.annotations.length === 0) return false;
  annotations = stored.annotations;
  nextId = stored.nextId || annotations.length + 1;
  nextPageNoteId = stored.nextPageNoteId || annotations.filter((a) => a.type === 'page-note').length + 1;
  for (const ann of annotations) { if (!ann.resolved) createMarker(ann, null); }
  return true;
}

// ---------------------------------------------------------------------------
// Annotation CRUD
// ---------------------------------------------------------------------------

export function updateComment(id, comment) {
  const ann = annotations.find((a) => a.id === id);
  if (ann) { ann.comment = comment; save(); }
}

/** Update the severity of an annotation. */
export function updateSeverity(id, severity) {
  const ann = annotations.find((a) => a.id === id);
  if (ann) { ann.severity = severity; save(); }
}

/** Update the category of an annotation. */
export function updateCategory(id, category) {
  const ann = annotations.find((a) => a.id === id);
  if (ann) { ann.category = category; save(); }
}

/** One-way resolve - resolved items cannot be unresolve. Removes on-page marker. */
export function resolveAnnotation(id) {
  const ann = annotations.find((a) => a.id === id);
  if (!ann || ann.resolved) return null;
  ann.resolved = true;
  removeMarker(id);
  save();
  return true;
}

/** @deprecated Use resolveAnnotation. Kept for test compat during transition. */
export function toggleResolved(id) { return resolveAnnotation(id); }

export function removeAnnotation(id) {
  annotations = annotations.filter((a) => a.id !== id);
  removeMarker(id);
  save();
  if (onAnnotationRemoved) onAnnotationRemoved(id);
}

export function getAnnotations() { return [...annotations]; }

/**
 * Add a page-level note with no element reference.
 * Returns the new annotation for the caller to open a panel on.
 */
export function addPageNote() {
  const pn = nextPageNoteId++;
  const annotation = {
    id: `P${pn}`, uuid: crypto.randomUUID(), type: 'page-note',
    region: { x: 0, y: 0, width: 0, height: 0 },
    comment: '', severity: '', category: '', nids: [], ancestor: null,
    timestamp: new Date().toISOString(),
  };
  annotations.push(annotation);
  save();
  return annotation;
}

export function clearAnnotations() {
  annotations = [];
  nextId = 1;
  nextPageNoteId = 1;
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.remove());
}

export function hideMarkers() {
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.remove());
}

/** Get the currently frozen element (for copy selector). */
export function getFrozenElement() { return frozen ? currentEl : null; }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function start(callbacks = {}) {
  if (active) return;
  active = true;
  frozen = false;
  onAnnotationAdded = callbacks.onAdd || null;
  onAnnotationRemoved = callbacks.onRemove || null;

  // Clean up any leftover elements from old review/inspector modes
  document.querySelectorAll('[data-vg-review]').forEach((el) => el.remove());
  document.querySelectorAll('[data-vg-inspector]').forEach((el) => el.remove());

  overlayEl = createOverlay();
  tooltipEl = createTooltip();

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('keydown', onKeyDown, true);
}

/** Pause interaction (sidebar collapsed) - removes listeners but keeps annotations. */
export function pause() {
  if (!active) return;
  frozen = false;
  hideHoverUI();
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('wheel', onWheel, { capture: true, passive: false });
}

/** Resume interaction (sidebar expanded) - re-adds listeners. */
export function resume() {
  if (!active) return;
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
}

export function stop() {
  if (!active) return;
  active = false;
  frozen = false;
  currentEl = null;
  captureMode = null;
  onAnnotationAdded = null;
  onAnnotationRemoved = null;

  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('wheel', onWheel, { capture: true, passive: false });
  document.removeEventListener('keydown', onKeyDown, true);

  clearAnnotations();
  overlayEl = null;
  tooltipEl = null;
  if (actionBarEl) { actionBarEl.remove(); actionBarEl = null; }
}

export function isActive() { return active; }

/** Get current capture mode (element, region, or null). */
export function getCaptureMode() { return captureMode; }

/**
 * Set capture mode. Element/region are toggles (same mode twice = off).
 * Page is one-shot: fires addPageNote immediately and resets to null.
 * Invalid values are ignored. No-op if not active.
 */
export function setCaptureMode(mode) {
  if (!active) return;
  if (mode === CAPTURE_MODES.PAGE) {
    addPageNote();
    captureMode = null;
    return;
  }
  const valid = [CAPTURE_MODES.ELEMENT, CAPTURE_MODES.REGION, null];
  if (!valid.includes(mode)) return;
  captureMode = captureMode === mode ? null : mode;
}

// ---------------------------------------------------------------------------
// Marker spotlight - dims all markers except the focused one
// ---------------------------------------------------------------------------

/** Dim all markers except the one for the given annotation id. Pass null to restore all. */
export function spotlightMarker(id) {
  const markers = document.querySelectorAll(`[${ATTR}^="marker-"]`);
  for (const m of markers) {
    const markerId = m.getAttribute(ATTR);
    if (id === null) {
      m.style.opacity = '';
    } else {
      m.style.opacity = markerId === `marker-${id}` ? '1' : '0.15';
    }
  }
}
