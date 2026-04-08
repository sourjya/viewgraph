/**
 * Annotation Sidebar
 *
 * Collapsible list of all annotations, docked to the right edge of
 * the viewport. Each entry shows the annotation number, a comment
 * preview, and click-to-scroll behavior.
 *
 * @see lib/review.js - annotation state management
 * @see lib/annotation-panel.js - comment editing
 */

import { show as showPanel } from './annotation-panel.js';
import { getAnnotations, removeAnnotation } from './review.js';

const ATTR = 'data-vg-review';
let sidebarEl = null;
let collapsed = false;

/** Create and mount the sidebar. */
export function create() {
  if (sidebarEl) return;

  sidebarEl = document.createElement('div');
  sidebarEl.setAttribute(ATTR, 'sidebar');
  Object.assign(sidebarEl.style, {
    position: 'fixed', top: '60px', right: '0', zIndex: '2147483646',
    width: '200px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
    background: '#1e1e2e', borderLeft: '1px solid #333', borderRadius: '8px 0 0 8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '11px',
    boxShadow: '-2px 0 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
  });

  // Toggle button
  const toggle = document.createElement('button');
  toggle.setAttribute(ATTR, 'toggle');
  toggle.textContent = 'Annotations';
  Object.assign(toggle.style, {
    width: '100%', padding: '8px 10px', border: 'none', borderBottom: '1px solid #333',
    background: 'transparent', color: '#a5b4fc', fontSize: '11px', fontWeight: '600',
    cursor: 'pointer', textAlign: 'left',
  });
  toggle.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebarEl.style.transform = collapsed ? 'translateX(170px)' : 'translateX(0)';
  });

  const list = document.createElement('div');
  list.setAttribute(ATTR, 'list');

  sidebarEl.append(toggle, list);
  document.documentElement.appendChild(sidebarEl);
  refresh();
}

/** Refresh the sidebar list from current annotations. */
export function refresh() {
  if (!sidebarEl) return;
  const list = sidebarEl.querySelector(`[${ATTR}="list"]`);
  if (!list) return;
  list.innerHTML = '';

  const anns = getAnnotations();
  if (anns.length === 0) {
    const hint = document.createElement('div');
    hint.setAttribute(ATTR, 'hint');
    hint.textContent = 'Shift + drag to select a region';
    Object.assign(hint.style, {
      padding: '12px 10px', color: '#666', fontSize: '11px',
      textAlign: 'center', fontStyle: 'italic',
    });
    list.appendChild(hint);
    return;
  }

  for (const ann of anns) {
    const entry = document.createElement('div');
    entry.setAttribute(ATTR, 'entry');
    Object.assign(entry.style, {
      padding: '6px 10px', borderBottom: '1px solid #2a2a3a',
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', transition: 'background 0.1s',
    });
    entry.addEventListener('mouseenter', () => { entry.style.background = '#22223a'; });
    entry.addEventListener('mouseleave', () => { entry.style.background = 'transparent'; });

    const label = document.createElement('span');
    label.textContent = `#${ann.id} ${ann.comment ? ann.comment.slice(0, 25) : '(no comment)'}`;
    Object.assign(label.style, { color: '#c8c8d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1' });

    // Click to scroll and show panel
    label.addEventListener('click', () => {
      window.scrollTo({ top: ann.region.y - 100, behavior: 'smooth' });
      showPanel(ann);
    });

    // Delete button
    const del = document.createElement('button');
    del.setAttribute(ATTR, 'btn');
    del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    Object.assign(del.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    del.addEventListener('click', (e) => { e.stopPropagation(); removeAnnotation(ann.id); refresh(); });

    entry.append(label, del);
    list.appendChild(entry);
  }
}

/** Remove the sidebar from the DOM. */
export function destroy() {
  if (sidebarEl) { sidebarEl.remove(); sidebarEl = null; }
  collapsed = false;
}
