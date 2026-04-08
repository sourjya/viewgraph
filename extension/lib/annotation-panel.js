/**
 * Annotation Panel
 *
 * Floating comment input that appears when a new region is selected
 * or when an existing annotation is clicked in the sidebar. Anchored
 * near the annotation's region.
 *
 * @see lib/review.js - annotation state management
 */

import { updateComment, removeAnnotation } from './annotate.js';

const ATTR = 'data-vg-annotate';
let panelEl = null;
let currentId = null;
let onCommentChange = null;
let outsideClickHandler = null;

/**
 * Show the annotation panel for a given annotation.
 * @param {{ id: number, region: object, comment: string }} annotation
 * @param {{ onChange?: Function }} callbacks
 */
export function show(annotation, callbacks = {}) {
  hide();
  currentId = annotation.id;
  onCommentChange = callbacks.onChange || null;

  panelEl = document.createElement('div');
  panelEl.setAttribute(ATTR, 'panel');
  Object.assign(panelEl.style, {
    position: 'absolute', zIndex: '2147483647',
    background: '#1e1e2e', border: '1px solid #333', borderRadius: '8px',
    padding: '10px', width: '240px', fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  });

  // Header: annotation number + close button + delete button
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '6px',
  });

  const title = document.createElement('span');
  title.textContent = `#${annotation.id}`;
  Object.assign(title.style, { color: '#a5b4fc', fontSize: '12px', fontWeight: '600', flex: '1' });

  const deleteBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    'Delete annotation',
  );
  deleteBtn.addEventListener('click', () => { removeAnnotation(annotation.id); hide(); });

  const closeBtn = makeHeaderBtn(
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    'Close panel',
  );
  closeBtn.addEventListener('click', () => hide());

  header.append(title, deleteBtn, closeBtn);

  // Textarea for comment
  const textarea = document.createElement('textarea');
  textarea.setAttribute(ATTR, 'input');
  textarea.value = annotation.comment;
  textarea.placeholder = 'Add a comment...';
  Object.assign(textarea.style, {
    width: '100%', minHeight: '60px', padding: '6px 8px',
    background: '#16161e', border: '1px solid #333', borderRadius: '4px',
    color: '#e0e0e0', fontSize: '12px', fontFamily: 'system-ui, sans-serif',
    resize: 'vertical', outline: 'none',
  });
  textarea.addEventListener('input', () => {
    updateComment(annotation.id, textarea.value);
    if (onCommentChange) onCommentChange(annotation.id, textarea.value);
  });
  textarea.addEventListener('focus', () => { textarea.style.borderColor = '#6366f1'; });
  textarea.addEventListener('blur', () => { textarea.style.borderColor = '#333'; });

  panelEl.append(header, textarea);

  // Position near the annotation region, avoiding sidebar and screen edges
  const panelWidth = 240;
  const sidebarWidth = 320;
  const vw = window.innerWidth;
  const rightEdge = annotation.region.x + annotation.region.width + 12 + panelWidth;
  let x, y;
  if (rightEdge > vw - sidebarWidth) {
    // Place to the left of the marker
    x = Math.max(8, annotation.region.x - panelWidth - 12);
  } else {
    x = annotation.region.x + annotation.region.width + 12;
  }
  y = annotation.region.y;
  Object.assign(panelEl.style, { left: `${x}px`, top: `${y}px` });

  document.documentElement.appendChild(panelEl);
  textarea.focus();

  // Click outside to dismiss (delayed to avoid immediate trigger)
  setTimeout(() => {
    outsideClickHandler = (e) => {
      if (panelEl && !panelEl.contains(e.target)) hide();
    };
    document.addEventListener('mousedown', outsideClickHandler);
  }, 100);
}

/** Small header icon button. */
function makeHeaderBtn(svgHtml, title) {
  const btn = document.createElement('button');
  btn.setAttribute(ATTR, 'btn');
  btn.innerHTML = svgHtml;
  btn.title = title;
  Object.assign(btn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '2px', borderRadius: '3px', display: 'flex',
  });
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
  return btn;
}

/** Hide the annotation panel. */
export function hide() {
  if (panelEl) { panelEl.remove(); panelEl = null; }
  if (outsideClickHandler) {
    document.removeEventListener('mousedown', outsideClickHandler);
    outsideClickHandler = null;
  }
  currentId = null;
  onCommentChange = null;
}

/** Get the currently shown annotation id, or null. */
export function currentAnnotationId() {
  return currentId;
}
