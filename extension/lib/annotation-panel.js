/**
 * Annotation Panel
 *
 * Floating comment input that appears when a new region is selected
 * or when an existing annotation is clicked in the sidebar. Anchored
 * near the annotation's region.
 *
 * @see lib/review.js - annotation state management
 */

import { updateComment, removeAnnotation } from './review.js';

const ATTR = 'data-vg-review';
let panelEl = null;
let currentId = null;

/**
 * Show the annotation panel for a given annotation.
 * @param {{ id: number, region: object, comment: string }} annotation
 */
export function show(annotation) {
  hide();
  currentId = annotation.id;

  panelEl = document.createElement('div');
  panelEl.setAttribute(ATTR, 'panel');
  Object.assign(panelEl.style, {
    position: 'absolute', zIndex: '2147483647',
    background: '#1e1e2e', border: '1px solid #333', borderRadius: '8px',
    padding: '10px', width: '240px', fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  });

  // Header: annotation number + delete button
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '8px',
  });

  const title = document.createElement('span');
  title.textContent = `#${annotation.id}`;
  Object.assign(title.style, { color: '#a5b4fc', fontSize: '12px', fontWeight: '600' });

  const deleteBtn = document.createElement('button');
  deleteBtn.setAttribute(ATTR, 'btn');
  deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
  Object.assign(deleteBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px',
    borderRadius: '3px', display: 'flex',
  });
  deleteBtn.title = 'Delete annotation';
  deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = 'rgba(239,68,68,0.2)'; });
  deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.background = 'transparent'; });
  deleteBtn.addEventListener('click', () => { removeAnnotation(annotation.id); hide(); });

  header.append(title, deleteBtn);

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
  textarea.addEventListener('input', () => { updateComment(annotation.id, textarea.value); });
  textarea.addEventListener('focus', () => { textarea.style.borderColor = '#6366f1'; });
  textarea.addEventListener('blur', () => { textarea.style.borderColor = '#333'; });

  panelEl.append(header, textarea);

  // Position near the annotation region
  const x = annotation.region.x + annotation.region.width + 12;
  const y = annotation.region.y;
  Object.assign(panelEl.style, { left: `${x}px`, top: `${y}px` });

  document.documentElement.appendChild(panelEl);
  textarea.focus();
}

/** Hide the annotation panel. */
export function hide() {
  if (panelEl) { panelEl.remove(); panelEl = null; }
  currentId = null;
}

/** Get the currently shown annotation id, or null. */
export function currentAnnotationId() {
  return currentId;
}
