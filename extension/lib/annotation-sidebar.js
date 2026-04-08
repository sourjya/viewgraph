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
import { getAnnotations, removeAnnotation, toggleResolved } from './review.js';

const ATTR = 'data-vg-review';
let sidebarEl = null;
let badgeEl = null;
let collapsed = false;

/** Create and mount the sidebar. */
export function create() {
  if (sidebarEl) return;

  sidebarEl = document.createElement('div');
  sidebarEl.setAttribute(ATTR, 'sidebar');
  Object.assign(sidebarEl.style, {
    position: 'fixed', top: '60px', right: '0', zIndex: '2147483646',
    width: '300px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
    background: '#1e1e2e', borderLeft: '1px solid #333', borderRadius: '8px 0 0 8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '13px',
    boxShadow: '-2px 0 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
  });

  // Header row: toggle label + collapse chevron + close button
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', borderBottom: '1px solid #333',
  });

  const toggle = document.createElement('button');
  toggle.setAttribute(ATTR, 'toggle');
  toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Review Notes';
  Object.assign(toggle.style, {
    flex: '1', padding: '10px', border: 'none',
    background: 'transparent', color: '#a5b4fc', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', textAlign: 'left',
  });
  toggle.addEventListener('click', () => toggleCollapse());

  // Collapse chevron
  const collapseBtn = document.createElement('button');
  collapseBtn.setAttribute(ATTR, 'btn');
  collapseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  collapseBtn.title = 'Collapse panel';
  Object.assign(collapseBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '6px', display: 'flex', alignItems: 'center',
  });
  collapseBtn.addEventListener('click', () => toggleCollapse());

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute(ATTR, 'close');
  closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  Object.assign(closeBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '6px', display: 'flex', alignItems: 'center',
  });
  closeBtn.title = 'Close review mode';
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.05)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
  closeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'dismiss-review' });
    destroy();
  });

  header.append(toggle, collapseBtn, closeBtn);

  const list = document.createElement('div');
  list.setAttribute(ATTR, 'list');

  // Send button - bundles annotations + capture and pushes to MCP server
  const sendBtn = document.createElement('button');
  sendBtn.setAttribute(ATTR, 'send');
  sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Send to Kiro';
  Object.assign(sendBtn.style, {
    width: 'calc(100% - 16px)', margin: '8px', padding: '7px 10px',
    border: 'none', borderRadius: '6px', background: '#6366f1', color: '#fff',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif', transition: 'background 0.12s',
  });
  sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = '#5558e6'; });
  sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = '#6366f1'; });
  sendBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'send-review' });
    sendBtn.textContent = 'Sent!';
    sendBtn.style.background = '#059669';
    setTimeout(() => { sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Send to Kiro'; sendBtn.style.background = '#6366f1'; }, 2000);
  });

  sidebarEl.append(header, list, sendBtn);
  document.documentElement.appendChild(sidebarEl);

  // Collapsed badge - hidden initially
  badgeEl = document.createElement('div');
  badgeEl.setAttribute(ATTR, 'collapse-badge');
  Object.assign(badgeEl.style, {
    position: 'fixed', top: '60px', right: '0', zIndex: '2147483646',
    padding: '10px 12px', borderRadius: '10px 0 0 10px',
    background: '#252536', border: '1px solid #333', borderRight: 'none',
    color: '#a5b4fc', fontSize: '14px', fontWeight: '600',
    display: 'none', alignItems: 'center', gap: '6px',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.3)',
  });
  badgeEl.title = 'Show annotations';
  badgeEl.addEventListener('click', () => toggleCollapse());
  document.documentElement.appendChild(badgeEl);

  refresh();
}

function toggleCollapse() {
  collapsed = !collapsed;
  if (collapsed) {
    sidebarEl.style.transform = 'translateX(100%)';
    badgeEl.style.display = 'flex';
    updateBadgeCount();
  } else {
    sidebarEl.style.transform = 'translateX(0)';
    badgeEl.style.display = 'none';
  }
}

function updateBadgeCount() {
  if (!badgeEl) return;
  const count = getAnnotations().length;
  badgeEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>${count}</span>`;
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
      padding: '16px 12px', color: '#666', fontSize: '12px',
      textAlign: 'center', fontStyle: 'italic',
    });
    list.appendChild(hint);
    return;
  }

  for (const ann of anns) {
    const entry = document.createElement('div');
    entry.setAttribute(ATTR, 'entry');
    Object.assign(entry.style, {
      padding: '8px 12px', borderBottom: '1px solid #2a2a3a',
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', transition: 'background 0.1s',
    });
    entry.addEventListener('mouseenter', () => { entry.style.background = '#22223a'; });
    entry.addEventListener('mouseleave', () => { entry.style.background = 'transparent'; });

    const label = document.createElement('span');
    Object.assign(label.style, {
      color: ann.resolved ? '#666' : '#c8c8d0', overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1',
    });

    // Ancestor element badge + comment
    if (ann.ancestor) {
      const elBadge = document.createElement('span');
      elBadge.textContent = ann.ancestor;
      Object.assign(elBadge.style, {
        background: '#2a2a4a', color: '#93c5fd', fontSize: '9px', fontWeight: '500',
        padding: '1px 4px', borderRadius: '3px', marginRight: '4px',
        fontFamily: 'SF Mono, Cascadia Code, monospace',
      });
      label.appendChild(elBadge);
    }
    const commentText = document.createElement('span');
    commentText.textContent = ann.comment || '(no comment)';
    if (ann.resolved) Object.assign(commentText.style, { textDecoration: 'line-through' });
    label.appendChild(commentText);

    // Click to scroll and show panel
    label.addEventListener('click', () => {
      window.scrollTo({ top: ann.region.y - 100, behavior: 'smooth' });
      showPanel(ann, { onChange: () => refresh() });
    });

    // Resolve toggle
    const resolveBtn = document.createElement('button');
    resolveBtn.setAttribute(ATTR, 'btn');
    resolveBtn.innerHTML = ann.resolved
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
    resolveBtn.title = ann.resolved ? 'Mark unresolved' : 'Mark resolved';
    Object.assign(resolveBtn.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    resolveBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleResolved(ann.id); refresh(); });

    // Delete button
    const del = document.createElement('button');
    del.setAttribute(ATTR, 'btn');
    del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    Object.assign(del.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    del.addEventListener('click', (e) => { e.stopPropagation(); removeAnnotation(ann.id); refresh(); });

    entry.append(label, resolveBtn, del);
    list.appendChild(entry);
  }

  updateBadgeCount();

  // Disable Send when no annotations
  const sendBtn = sidebarEl.querySelector(`[${ATTR}="send"]`);
  if (sendBtn) {
    const hasNotes = anns.length > 0;
    sendBtn.disabled = !hasNotes;
    sendBtn.style.opacity = hasNotes ? '1' : '0.4';
    sendBtn.style.cursor = hasNotes ? 'pointer' : 'default';
  }
}

/** Remove the sidebar from the DOM. */
export function destroy() {
  if (sidebarEl) { sidebarEl.remove(); sidebarEl = null; }
  if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  collapsed = false;
}
