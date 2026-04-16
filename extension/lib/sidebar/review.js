/**
 * Sidebar Review Tab - Annotation List Rendering
 *
 * Renders the annotation timeline: pending agent requests, filter tabs,
 * type filter toggles, trash/clear, and individual annotation entries.
 * Extracted from annotation-sidebar.js as part of F14 Phase 3.
 *
 * @see lib/annotation-sidebar.js - parent sidebar that calls renderReviewList
 * @see lib/annotation-types.js - type resolution, badge colors/icons
 * @see lib/sidebar/events.js - event bus for inter-module communication
 */

import { ATTR } from '../selector.js';
import { resolveType, getBadgeColor, getBadgeIcon, getFilterIcon } from '../annotation-types.js';
import { discoverServer } from '../constants.js';
import { KEYS, set as storageSet } from '../storage.js';

/**
 * Render the review list: pending requests, filter tabs, type toggles,
 * annotation entries, and trash button into the provided containers.
 *
 * @param {HTMLElement} list - The scrollable list container
 * @param {HTMLElement} tabContainer - Container for filter tabs
 * @param {HTMLElement} sidebarEl - Parent sidebar element (for overlay positioning)
 * @param {object} state - Current review state
 * @param {Array} state.annotations - All annotations
 * @param {Array} state.pendingRequests - Agent capture requests
 * @param {string} state.activeFilter - 'all' | 'open' | 'resolved'
 * @param {Set} state.activeTypeFilters - Active type filter keys
 * @param {string} state.agentName - Display name for the agent
 * @param {object} callbacks - Action callbacks
 * @param {function} callbacks.onRefresh - Re-render the list
 * @param {function} callbacks.onShowPanel - Show annotation edit panel
 * @param {function} callbacks.onHidePanel - Hide annotation edit panel
 * @param {function} callbacks.onRemove - Remove an annotation by id
 * @param {function} callbacks.onResolve - Resolve an annotation by id
 * @param {function} callbacks.onClear - Clear all annotations
 * @param {function} callbacks.onSpotlight - Highlight a marker on the page
 * @param {function} callbacks.onFilterChange - Called with new filter value
 * @param {function} callbacks.onTypeFilterToggle - Called with type key to toggle
 * @param {function} callbacks.onRequestCapture - Accept a capture request
 * @param {function} callbacks.onRequestDecline - Decline a capture request
 */
export function renderReviewList(list, tabContainer, sidebarEl, state, callbacks) {
  list.innerHTML = '';

  const { annotations: anns, pendingRequests, activeFilter, activeTypeFilters, agentName } = state;

  if (anns.length === 0) {
    const hint = document.createElement('div');
    hint.setAttribute(ATTR, 'hint');
    hint.textContent = 'Click an element or shift+drag to annotate';
    Object.assign(hint.style, {
      padding: '16px 12px', color: '#666', fontSize: '13px',
      textAlign: 'center', fontStyle: 'italic',
    });
    list.appendChild(hint);
  }

  // Sort: open items first (by timestamp desc), then resolved
  const open = anns.filter((a) => !a.resolved);
  const resolved = anns.filter((a) => a.resolved);

  // Agent capture requests - shown at top of timeline
  if (pendingRequests.length > 0) {
    const reqHeader = document.createElement('div');
    reqHeader.textContent = `${agentName} Requests (${pendingRequests.length})`;
    Object.assign(reqHeader.style, {
      padding: '6px 12px', color: '#f59e0b', fontSize: '11px', fontWeight: '600',
      borderBottom: '1px solid #2a2a3a', fontFamily: 'system-ui, sans-serif',
    });
    list.appendChild(reqHeader);

    for (const req of pendingRequests) {
      list.appendChild(createRequestEntry(req, callbacks));
    }
  }

  // Filter tabs: All | Open | Resolved
  renderFilterTabs(tabContainer, { open, resolved, anns, activeFilter, activeTypeFilters }, callbacks);

  // Filtered items
  const statusFiltered = activeFilter === 'all' ? anns : activeFilter === 'open' ? open : resolved;
  const visible = statusFiltered.filter((a) => activeTypeFilters.has(resolveType(a)));
  for (const ann of visible) {
    try {
      list.appendChild(createEntry(ann, callbacks));
    } catch (e) {
      console.error(`[ViewGraph] Failed to render annotation #${ann.id}:`, e);
    }
  }
  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = activeFilter === 'resolved' ? 'No resolved items yet' : 'No open items';
    Object.assign(empty.style, { padding: '16px 12px', color: '#666', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' });
    list.appendChild(empty);
  }

  list.scrollTop = list.scrollHeight;
}

// ──────────────────────────────────────────────
// Filter tabs and type toggles
// ──────────────────────────────────────────────

/**
 * Render filter tabs (Open/Resolved/All), type toggles, and trash button.
 * Replaces tabContainer contents entirely.
 */
function renderFilterTabs(tabContainer, { open, resolved, anns, activeFilter, activeTypeFilters }, callbacks) {
  const tabBar = document.createElement('div');
  Object.assign(tabBar.style, {
    display: 'flex', borderBottom: '1px solid #2a2a3a', flexShrink: '0',
  });
  const tabStyle = { flex: '1', padding: '6px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'system-ui, sans-serif', textAlign: 'center' };
  for (const { key, label } of [
    { key: 'open', label: `Open (${open.length})` },
    { key: 'resolved', label: `Resolved (${resolved.length})` },
    { key: 'all', label: `All (${anns.length})` },
  ]) {
    const tab = document.createElement('button');
    tab.textContent = label;
    const isActive = activeFilter === key;
    Object.assign(tab.style, { ...tabStyle, color: isActive ? '#a5b4fc' : '#666', borderBottom: isActive ? '2px solid #a5b4fc' : '2px solid transparent' });
    tab.addEventListener('click', () => { callbacks.onFilterChange(key); });
    tabBar.appendChild(tab);
  }
  tabContainer.innerHTML = '';
  tabContainer.appendChild(tabBar);

  // Type filter toggles: [bug] [idea] [diagnostic] [note]
  const typeFilterRow = document.createElement('div');
  Object.assign(typeFilterRow.style, { display: 'flex', gap: '2px', padding: '4px 8px', borderBottom: '1px solid #2a2a3a', justifyContent: 'flex-end' });
  const filterTypes = [
    { key: 'element', label: 'Bugs', color: '#9ca3af' },
    { key: 'idea', label: 'Ideas', color: '#eab308' },
    { key: 'diagnostic', label: 'Diagnostics', color: '#0d9488' },
    { key: 'page-note', label: 'Notes', color: '#0ea5e9' },
  ];
  for (const ft of filterTypes) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, 'type-filter');
    btn.dataset.type = ft.key;
    btn.innerHTML = getFilterIcon(ft.key);
    btn.title = ft.label;
    const isOn = activeTypeFilters.has(ft.key) || (ft.key === 'element' && activeTypeFilters.has('region'));
    Object.assign(btn.style, {
      border: 'none', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', fontFamily: 'system-ui, sans-serif',
      background: isOn ? 'rgba(255,255,255,0.08)' : 'transparent',
      color: isOn ? ft.color : '#555', opacity: isOn ? '1' : '0.5',
      transition: 'opacity 0.15s',
    });
    btn.addEventListener('click', () => { callbacks.onTypeFilterToggle(ft.key); });
    typeFilterRow.appendChild(btn);
  }
  tabContainer.appendChild(typeFilterRow);

  // Trash icon - clear all annotations
  const trashBtn = document.createElement('button');
  trashBtn.setAttribute(ATTR, 'trash');
  trashBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
  trashBtn.title = 'Clear all annotations';
  Object.assign(trashBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '6px 8px', display: 'flex', alignItems: 'center', flexShrink: '0',
  });
  trashBtn.addEventListener('mouseenter', () => { trashBtn.querySelector('svg').setAttribute('stroke', '#f87171'); });
  trashBtn.addEventListener('mouseleave', () => { trashBtn.querySelector('svg').setAttribute('stroke', '#666'); });
  trashBtn.addEventListener('click', () => {
    if (!anns.length) return;
    showClearConfirmation(anns.length, callbacks);
  });
  tabBar.appendChild(trashBtn);
}

// ──────────────────────────────────────────────
// Clear confirmation dialog
// ──────────────────────────────────────────────

/**
 * Show themed confirmation overlay for clearing all annotations.
 * Appended to the sidebar element for proper positioning.
 */
function showClearConfirmation(count, callbacks) {
  const overlay = document.createElement('div');
  overlay.setAttribute(ATTR, 'confirm-overlay');
  Object.assign(overlay.style, {
    position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '10', borderRadius: '8px 0 0 8px',
  });
  const card = document.createElement('div');
  Object.assign(card.style, {
    background: '#1e1e2e', border: '1px solid #dc2626', borderRadius: '10px',
    padding: '16px', width: '220px', textAlign: 'center',
    fontFamily: 'system-ui, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  });
  const icon = document.createElement('div');
  icon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
  Object.assign(icon.style, { marginBottom: '8px' });
  const msg = document.createElement('div');
  msg.textContent = `Clear ${count} annotation${count > 1 ? 's' : ''}?`;
  Object.assign(msg.style, { color: '#e0e0e0', fontSize: '13px', fontWeight: '600', marginBottom: '4px' });
  const sub = document.createElement('div');
  sub.textContent = 'This cannot be undone.';
  Object.assign(sub.style, { color: '#666', fontSize: '11px', marginBottom: '14px' });
  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '8px', justifyContent: 'center' });
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    flex: '1', padding: '6px', border: '1px solid #333', borderRadius: '6px',
    background: 'transparent', color: '#9ca3af', fontSize: '12px',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  });
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Clear All';
  Object.assign(confirmBtn.style, {
    flex: '1', padding: '6px', border: 'none', borderRadius: '6px',
    background: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
  });
  cancelBtn.addEventListener('click', () => overlay.remove());
  confirmBtn.addEventListener('click', () => { overlay.remove(); callbacks.onClear(); });
  btnRow.append(cancelBtn, confirmBtn);
  card.append(icon, msg, sub, btnRow);
  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  // Append to closest positioned ancestor (the sidebar element)
  const parent = overlay.getRootNode()?.host?.querySelector?.(`[${ATTR}="sidebar"]`) || document.body;
  callbacks.getSidebarEl().appendChild(overlay);
}

// ──────────────────────────────────────────────
// Agent capture request entry
// ──────────────────────────────────────────────

/** Create a single pending capture request entry. */
function createRequestEntry(req, callbacks) {
  const entry = document.createElement('div');
  Object.assign(entry.style, {
    padding: '10px 12px', borderBottom: '1px solid #2a2a3a',
    fontFamily: 'system-ui, sans-serif',
  });

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: '0' });

  const capBtn = document.createElement('button');
  capBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  capBtn.title = 'Capture now';
  Object.assign(capBtn.style, {
    padding: '5px', border: 'none', borderRadius: '6px',
    background: '#f59e0b', color: '#000', display: 'flex', cursor: 'pointer',
  });
  capBtn.addEventListener('click', () => { callbacks.onRequestCapture(req, entry, capBtn); });

  const decBtn = document.createElement('button');
  decBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  decBtn.title = 'Decline capture request';
  Object.assign(decBtn.style, {
    padding: '5px', border: '1px solid #333', borderRadius: '6px',
    background: 'transparent', color: '#9ca3af', display: 'flex', cursor: 'pointer',
  });
  decBtn.addEventListener('mouseenter', () => { decBtn.style.color = '#f87171'; decBtn.style.borderColor = '#f87171'; });
  decBtn.addEventListener('mouseleave', () => { decBtn.style.color = '#9ca3af'; decBtn.style.borderColor = '#333'; });
  decBtn.addEventListener('click', () => { callbacks.onRequestDecline(req, entry); });
  btnRow.append(capBtn, decBtn);

  const PURPOSE_LABELS = { inspect: '\ud83d\udd0d Inspect', verify: '\u2705 Verify', capture: '\ud83d\udd14 Capture' };
  const topRow = document.createElement('div');
  Object.assign(topRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
  const label = document.createElement('span');
  label.textContent = PURPOSE_LABELS[req.purpose] || '\ud83d\udd14 Capture';
  Object.assign(label.style, { fontSize: '11px', fontWeight: '600', color: '#f59e0b' });
  const urlText = document.createElement('span');
  urlText.textContent = req.url;
  Object.assign(urlText.style, {
    fontSize: '11px', color: '#9ca3af', flex: '1',
    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
  });
  topRow.append(label, urlText, btnRow);
  entry.appendChild(topRow);

  if (req.guidance) {
    const guide = document.createElement('div');
    guide.textContent = req.guidance;
    Object.assign(guide.style, {
      color: '#e0e0e0', fontSize: '12px', lineHeight: '1.4',
      marginTop: '6px', padding: '6px 8px',
      background: '#252536', borderRadius: '0', borderLeft: '3px solid #f59e0b',
    });
    entry.appendChild(guide);
  }

  return entry;
}

// ──────────────────────────────────────────────
// Annotation entry
// ──────────────────────────────────────────────

/** Severity dot color map. */
const SEV_DOT_COLORS = { critical: '#ef4444', major: '#eab308', minor: '#9ca3af' };

/** Create a single timeline entry for an annotation. */
function createEntry(ann, callbacks) {
  const entry = document.createElement('div');
  entry.setAttribute(ATTR, 'entry');
  Object.assign(entry.style, {
    padding: '8px 12px', borderBottom: '1px solid #2a2a3a',
    cursor: ann.resolved ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', transition: 'background 0.1s',
    opacity: ann.pending && !ann.resolved ? '0.7' : '1',
  });
  entry.addEventListener('mouseenter', () => {
    entry.style.background = '#2a2a4a';
    callbacks.onSpotlight(ann.id);
  });
  entry.addEventListener('mouseleave', () => {
    entry.style.background = 'transparent';
    callbacks.onSpotlight(null);
  });

  const label = document.createElement('span');
  Object.assign(label.style, {
    color: ann.resolved ? '#666' : '#c8c8d0', overflow: 'hidden',
    flex: '1', display: 'flex', flexDirection: 'column', gap: '2px',
  });

  const line1 = document.createElement('div');
  Object.assign(line1.style, {
    display: 'flex', alignItems: 'center', overflow: 'hidden',
    whiteSpace: 'nowrap', textOverflow: 'ellipsis',
    maxHeight: '20px', transition: 'max-height 0.25s ease, white-space 0s',
  });

  const markerColor = getBadgeColor(ann);
  const iconSvg = getBadgeIcon(ann);

  if (iconSvg) {
    const iconEl = document.createElement('span');
    iconEl.innerHTML = iconSvg;
    Object.assign(iconEl.style, { display: 'inline-flex', color: markerColor, flexShrink: '0', marginRight: '2px' });
    line1.appendChild(iconEl);
  }

  const numBadge = document.createElement('span');
  numBadge.textContent = `#${ann.id}`;
  Object.assign(numBadge.style, {
    background: markerColor, color: '#fff', fontSize: '10px', fontWeight: '700',
    padding: '1px 5px', borderRadius: '3px', marginRight: '3px',
    fontFamily: 'system-ui, sans-serif', flexShrink: '0',
  });
  numBadge.title = `Annotation ${ann.id}`;
  line1.appendChild(numBadge);

  if (ann.severity) {
    const sevIcon = document.createElement('span');
    sevIcon.textContent = '!';
    Object.assign(sevIcon.style, {
      background: SEV_DOT_COLORS[ann.severity] || '#a855f7',
      color: '#fff', fontSize: '10px', fontWeight: '900', marginRight: '4px', flexShrink: '0',
      fontFamily: 'system-ui, sans-serif',
      padding: '1px 4px', borderRadius: '3px',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    });
    sevIcon.title = ann.severity;
    line1.appendChild(sevIcon);
  } else {
    const spacer = document.createElement('span');
    spacer.style.marginRight = '4px';
    line1.appendChild(spacer);
  }

  if (ann.ancestor) {
    const elBadge = document.createElement('span');
    elBadge.textContent = ann.ancestor;
    Object.assign(elBadge.style, {
      background: '#2a2a4a', color: '#93c5fd', fontSize: '10px', fontWeight: '500',
      padding: '1px 4px', borderRadius: '3px', marginRight: '4px',
      fontFamily: 'SF Mono, Cascadia Code, monospace', flexShrink: '0',
    });
    line1.appendChild(elBadge);
  }

  const commentText = document.createElement('span');
  const isDiagnostic = /^(Network|Console|Visibility|Stacking|Focus|Scroll|Landmarks):/.test(ann.comment || '');
  if (isDiagnostic) {
    const [section, ...rest] = (ann.comment || '').split(':');
    const excerpt = rest.join(':').trim().slice(0, 50);
    const sectionTag = document.createElement('span');
    sectionTag.textContent = section;
    Object.assign(sectionTag.style, { background: '#1e3a5f', color: '#60a5fa', padding: '0 4px', borderRadius: '3px', fontSize: '9px', marginRight: '4px' });
    commentText.appendChild(sectionTag);
    commentText.appendChild(document.createTextNode(excerpt + (rest.join(':').trim().length > 50 ? '...' : '')));
  } else {
    commentText.textContent = ann.comment || '(no comment)';
  }
  Object.assign(commentText.style, { overflow: 'hidden', textOverflow: 'ellipsis' });
  if (ann.resolved) Object.assign(commentText.style, { textDecoration: 'line-through' });
  line1.appendChild(commentText);

  // Click-to-expand for long comments
  const commentLen = (ann.comment || '').length;
  if (commentLen > 40) {
    let expanded = false;
    const chevron = document.createElement('span');
    chevron.textContent = '\u25b8';
    Object.assign(chevron.style, {
      color: '#555', fontSize: '9px', cursor: 'pointer', flexShrink: '0',
      marginLeft: '4px', transition: 'transform 0.15s', userSelect: 'none',
    });
    chevron.title = 'Expand comment';
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      expanded = !expanded;
      line1.style.whiteSpace = expanded ? 'normal' : 'nowrap';
      line1.style.maxHeight = expanded ? '120px' : '20px';
      chevron.style.transform = expanded ? 'rotate(90deg)' : '';
      chevron.title = expanded ? 'Collapse comment' : 'Expand comment';
    });
    line1.appendChild(chevron);
  }

  label.appendChild(line1);

  if (ann.resolved && ann.resolution) {
    const resLine = document.createElement('div');
    const by = ann.resolution.by || 'unknown';
    const action = ann.resolution.action || 'fixed';
    const summary = ann.resolution.summary || '';
    resLine.textContent = `\u2713 ${action} by ${by}${summary ? ': ' + summary.slice(0, 60) : ''}`;
    Object.assign(resLine.style, {
      color: '#4ade80', fontSize: '10px', marginTop: '2px',
      fontFamily: 'system-ui, sans-serif',
    });
    label.appendChild(resLine);
  } else if (ann.pending) {
    const pendLine = document.createElement('div');
    pendLine.textContent = '\u23F3 Sent to agent - waiting for fix...';
    Object.assign(pendLine.style, {
      color: '#f59e0b', fontSize: '10px', marginTop: '2px',
      fontFamily: 'system-ui, sans-serif',
    });
    label.appendChild(pendLine);
  }

  if (!ann.resolved) {
    label.addEventListener('click', () => { callbacks.onShowPanel(ann); });
  }

  if (ann.resolved) {
    const check = document.createElement('span');
    check.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    Object.assign(check.style, { padding: '2px', flexShrink: '0' });
    entry.append(label, check);
  } else {
    const resolveBtn = document.createElement('button');
    resolveBtn.setAttribute(ATTR, 'btn');
    resolveBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
    resolveBtn.title = 'Mark resolved';
    Object.assign(resolveBtn.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    resolveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onResolve(ann.id);
    });

    const del = document.createElement('button');
    del.setAttribute(ATTR, 'btn');
    del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    Object.assign(del.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    del.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onRemove(ann.id); });

    entry.append(label, resolveBtn, del);
  }
  return entry;
}
