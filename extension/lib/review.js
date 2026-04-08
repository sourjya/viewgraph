/**
 * Review Mode
 *
 * Enables region-based annotation on any web page. The user enters
 * review mode from the popup, then shift+drags to select rectangular
 * regions. Each region becomes a numbered annotation with a comment.
 *
 * Architecture:
 * - Annotations stored in-memory as an array of { id, region, comment, nids }
 * - Each annotation gets a numbered overlay marker on the page
 * - The annotation panel (separate module) handles comment input
 * - The sidebar (separate module) lists all annotations
 * - On send, everything is bundled with a full page capture
 *
 * All review DOM elements use `data-vg-review` for cleanup.
 *
 * @see docs/roadmap/roadmap.md - Milestone 6
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ATTR = 'data-vg-review';

const MARKER_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let active = false;
let annotations = [];
let nextId = 1;
let dragStart = null;
let selectionBox = null;

/** Callbacks set by the wiring layer to connect panel/sidebar. */
let onAnnotationAdded = null;
let onAnnotationRemoved = null;

// ---------------------------------------------------------------------------
// Region selection (shift+drag)
// ---------------------------------------------------------------------------

function onMouseDown(e) {
  if (!e.shiftKey) return;
  e.preventDefault();
  e.stopPropagation();
  dragStart = { x: e.clientX, y: e.clientY };
  selectionBox = document.createElement('div');
  selectionBox.setAttribute(ATTR, 'selection');
  Object.assign(selectionBox.style, {
    position: 'fixed', border: '2px dashed #6366f1', background: 'rgba(99,102,241,0.08)',
    borderRadius: '3px', zIndex: '2147483645', pointerEvents: 'none',
  });
  document.documentElement.appendChild(selectionBox);
}

function onMouseMove(e) {
  if (!dragStart || !selectionBox) return;
  e.preventDefault();
  e.stopPropagation();
  const x = Math.min(dragStart.x, e.clientX);
  const y = Math.min(dragStart.y, e.clientY);
  const w = Math.abs(e.clientX - dragStart.x);
  const h = Math.abs(e.clientY - dragStart.y);
  Object.assign(selectionBox.style, {
    left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`,
  });
}

function onMouseUp(e) {
  if (!dragStart || !selectionBox) return;
  const rect = selectionBox.getBoundingClientRect();
  selectionBox.remove();
  selectionBox = null;
  dragStart = null;

  // Ignore tiny drags (accidental clicks)
  if (rect.width < 10 || rect.height < 10) return;

  // Convert to document coordinates
  const region = {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };

  const nids = findIntersectingNodes(rect);
  const id = nextId++;
  const annotation = { id, region, comment: '', nids };
  annotations.push(annotation);
  createMarker(annotation, rect);
  if (onAnnotationAdded) onAnnotationAdded(annotation);
}

// ---------------------------------------------------------------------------
// Node intersection - find elements overlapping the selection by >= 50%
// ---------------------------------------------------------------------------

/**
 * Find all visible elements whose bounding box overlaps the selection
 * region by at least 50% of the element's area.
 * @param {DOMRect} selRect - Selection rectangle (viewport coords)
 * @returns {Array<number>} Array of nid-like indices (element order)
 */
export function findIntersectingNodes(selRect) {
  const results = [];
  const elements = document.body.querySelectorAll('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.hasAttribute(ATTR)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const overlapX = Math.max(0, Math.min(r.right, selRect.right) - Math.max(r.left, selRect.left));
    const overlapY = Math.max(0, Math.min(r.bottom, selRect.bottom) - Math.max(r.top, selRect.top));
    const overlapArea = overlapX * overlapY;
    const elArea = r.width * r.height;

    if (overlapArea >= elArea * 0.5) results.push(i + 1);
  }
  return results;
}

/**
 * Find the lowest common ancestor of elements matching the given nids.
 * Returns a compact selector segment for the ancestor.
 */
export function findCommonAncestor(selRect) {
  const elements = document.body.querySelectorAll('*');
  const matched = [];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.hasAttribute(ATTR)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const overlapX = Math.max(0, Math.min(r.right, selRect.right) - Math.max(r.left, selRect.left));
    const overlapY = Math.max(0, Math.min(r.bottom, selRect.bottom) - Math.max(r.top, selRect.top));
    if (overlapX * overlapY >= r.width * r.height * 0.5) matched.push(el);
  }
  if (matched.length === 0) return null;
  if (matched.length === 1) return selectorSegment(matched[0]);

  // Walk up from first element, find deepest ancestor that contains all
  let ancestor = matched[0];
  while (ancestor && ancestor !== document.body) {
    if (matched.every((el) => ancestor.contains(el))) return selectorSegment(ancestor);
    ancestor = ancestor.parentElement;
  }
  return null;
}

/** Build a compact selector segment for one element. */
function selectorSegment(el) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const classes = [...el.classList].filter((c) => !c.startsWith('_') && c.length < 25).slice(0, 2);
  return classes.length ? `${tag}.${classes.join('.')}` : tag;
}

// ---------------------------------------------------------------------------
// Numbered markers
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

  // Number badge
  const badge = document.createElement('div');
  badge.setAttribute(ATTR, 'badge');
  badge.textContent = id;
  Object.assign(badge.style, {
    position: 'absolute', top: '-10px', left: '-10px',
    width: '20px', height: '20px', borderRadius: '50%',
    background: color, color: '#fff', fontSize: '11px', fontWeight: '600',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  });

  marker.appendChild(badge);

  // Ancestor label - shows the common parent element of the selection
  const ancestorName = selRect ? findCommonAncestor(selRect) : null;
  if (ancestorName) {
    const label = document.createElement('div');
    label.setAttribute(ATTR, 'label');
    label.textContent = ancestorName;
    Object.assign(label.style, {
      position: 'absolute', bottom: '-18px', left: '0',
      background: color, color: '#fff', fontSize: '10px', fontWeight: '500',
      padding: '1px 6px', borderRadius: '3px', whiteSpace: 'nowrap',
      fontFamily: 'SF Mono, Cascadia Code, monospace',
      opacity: '0.9',
    });
    marker.appendChild(label);
  }

  document.documentElement.appendChild(marker);
}

function removeMarker(id) {
  const marker = document.querySelector(`[${ATTR}="marker-${id}"]`);
  if (marker) marker.remove();
}

// ---------------------------------------------------------------------------
// Annotation CRUD
// ---------------------------------------------------------------------------

/**
 * Update the comment for an annotation.
 * @param {number} id
 * @param {string} comment
 */
export function updateComment(id, comment) {
  const ann = annotations.find((a) => a.id === id);
  if (ann) ann.comment = comment;
}

/**
 * Remove an annotation by id.
 * @param {number} id
 */
export function removeAnnotation(id) {
  annotations = annotations.filter((a) => a.id !== id);
  removeMarker(id);
  if (onAnnotationRemoved) onAnnotationRemoved(id);
}

/** Get all annotations (read-only copy). */
export function getAnnotations() {
  return [...annotations];
}

/** Clear all annotations and markers. */
export function clearAnnotations() {
  annotations = [];
  nextId = 1;
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.remove());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start review mode.
 * @param {{ onAdd?: Function, onRemove?: Function }} callbacks
 */
export function start(callbacks = {}) {
  if (active) return;
  active = true;
  onAnnotationAdded = callbacks.onAdd || null;
  onAnnotationRemoved = callbacks.onRemove || null;

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('keydown', onReviewKeyDown, true);
}

function onReviewKeyDown(e) {
  if (e.key === 'Escape') stop();
}

/** Stop review mode and clean up all overlays. */
export function stop() {
  if (!active) return;
  active = false;
  onAnnotationAdded = null;
  onAnnotationRemoved = null;

  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('keydown', onReviewKeyDown, true);

  clearAnnotations();
}

export function isActive() {
  return active;
}
