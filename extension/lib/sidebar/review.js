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

import { ATTR } from '#lib/selector.js';
import { resolveType, getBadgeColor, getBadgeIcon, getFilterIcon } from '#lib/annotation-types.js';
import { discoverServer } from '#lib/constants.js';
import { KEYS, set as storageSet } from '#lib/storage.js';
import { trashIcon, cameraIcon, closeIcon, checkIcon, circleIcon } from './icons.js';
import { FONT, COLOR, FONT_MONO } from './styles.js';

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
  list.replaceChildren();

  const { annotations: anns, pendingRequests, activeFilter, activeTypeFilters, agentName } = state;

  if (anns.length === 0) {
    const hint = document.createElement('div');
    hint.setAttribute(ATTR, 'hint');
    hint.textContent = 'Click an element or shift+drag to annotate';
    Object.assign(hint.style, {
      padding: '16px 12px', color: COLOR.muted, fontSize: '13px',
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
      padding: '6px 12px', color: COLOR.warning, fontSize: '11px', fontWeight: '600',
      borderBottom: `1px solid ${COLOR.borderLight}`, fontFamily: FONT,
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
    Object.assign(empty.style, { padding: '16px 12px', color: COLOR.muted, fontSize: '12px', textAlign: 'center', fontStyle: 'italic' });
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
  // Reuse existing tab bar if present, only update counts
  const existingBar = tabContainer.querySelector('div');
  if (existingBar && existingBar.children.length >= 3) {
    const tabs = existingBar.querySelectorAll('button');
    const counts = [`Open (${open.length})`, `Resolved (${resolved.length})`, `All (${anns.length})`];
    const keys = ['open', 'resolved', 'all'];
    tabs.forEach((tab, i) => {
      if (i < 3) {
        tab.textContent = counts[i];
        const isActive = activeFilter === keys[i];
        tab.style.color = isActive ? COLOR.primaryLight : COLOR.muted;
        tab.style.borderBottom = isActive ? `2px solid ${COLOR.primaryLight}` : '2px solid transparent';
      }
    });
    // Update type filter toggle states
    const typeToggles = tabContainer.querySelectorAll(`[${ATTR}="type-filter"]`);
    typeToggles.forEach((btn) => {
      const ft = btn.dataset.type;
      const isOn = activeTypeFilters.has(ft) || (ft === 'element' && activeTypeFilters.has('region'));
      btn.style.background = isOn ? COLOR.bgHoverSubtle : 'transparent';
      btn.style.opacity = isOn ? '1' : '0.5';
    });
    return;
  }

  // First render - create tab bar from scratch
  const tabBar = document.createElement('div');
  Object.assign(tabBar.style, {
    display: 'flex', borderBottom: `1px solid ${COLOR.borderLight}`, flexShrink: '0',
  });
  const tabStyle = { flex: '1', padding: '6px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: FONT, textAlign: 'center' };
  for (const { key, label } of [
    { key: 'open', label: `Open (${open.length})` },
    { key: 'resolved', label: `Resolved (${resolved.length})` },
    { key: 'all', label: `All (${anns.length})` },
  ]) {
    const tab = document.createElement('button');
    tab.textContent = label;
    const isActive = activeFilter === key;
    Object.assign(tab.style, { ...tabStyle, color: isActive ? COLOR.primaryLight : COLOR.muted, borderBottom: isActive ? `2px solid ${COLOR.primaryLight}` : '2px solid transparent' });
    tab.addEventListener('click', () => { callbacks.onFilterChange(key); });
    tabBar.appendChild(tab);
  }
  tabContainer.replaceChildren();
  tabContainer.appendChild(tabBar);

  // Type filter toggles: [label] [bug] [idea] [diagnostic] [note]
  const typeFilterRow = document.createElement('div');
  Object.assign(typeFilterRow.style, { display: 'flex', gap: '2px', padding: '4px 8px', borderBottom: `1px solid ${COLOR.borderLight}`, alignItems: 'center' });
  const filterLabel = document.createElement('span');
  filterLabel.textContent = 'Filter';
  Object.assign(filterLabel.style, { fontSize: '10px', color: COLOR.muted, marginRight: '4px', flexShrink: '0' });
  typeFilterRow.appendChild(filterLabel);
  const filterSpacer = document.createElement('span');
  filterSpacer.style.flex = '1';
  typeFilterRow.appendChild(filterSpacer);
  const filterTypes = [
    { key: 'element', label: 'Bugs', color: COLOR.secondary },
    { key: 'idea', label: 'Ideas', color: '#eab308' },
    { key: 'diagnostic', label: 'Diagnostics', color: '#0d9488' },
    { key: 'page-note', label: 'Notes', color: '#0ea5e9' },
  ];
  for (const ft of filterTypes) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, 'type-filter');
    btn.dataset.type = ft.key;
    btn.innerHTML = getFilterIcon(ft.key);
    btn.setAttribute('data-tooltip', ft.label);
    const isOn = activeTypeFilters.has(ft.key) || (ft.key === 'element' && activeTypeFilters.has('region'));
    Object.assign(btn.style, {
      border: 'none', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', fontFamily: FONT,
      background: isOn ? COLOR.bgHoverSubtle : 'transparent',
      color: isOn ? ft.color : COLOR.dim, opacity: isOn ? '1' : '0.5',
      transition: 'opacity 0.15s',
    });
    btn.addEventListener('click', () => { callbacks.onTypeFilterToggle(ft.key); });
    typeFilterRow.appendChild(btn);
  }
  tabContainer.appendChild(typeFilterRow);

  // Trash icon - clear all annotations
  const trashBtn = document.createElement('button');
  trashBtn.setAttribute(ATTR, 'trash');
  trashBtn.appendChild(trashIcon(12, COLOR.muted));
  trashBtn.setAttribute('data-tooltip', 'Clear all annotations');
  Object.assign(trashBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '6px 8px', display: 'flex', alignItems: 'center', flexShrink: '0',
  });
  trashBtn.addEventListener('mouseenter', () => { trashBtn.querySelector('svg')?.setAttribute('stroke', COLOR.errorLight); });
  trashBtn.addEventListener('mouseleave', () => { trashBtn.querySelector('svg')?.setAttribute('stroke', COLOR.muted); });
  trashBtn.addEventListener('click', () => {
    const currentCount = callbacks.getAnnotationCount ? callbacks.getAnnotationCount() : anns.length;
    if (!currentCount) return;
    showClearConfirmation(currentCount, callbacks);
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
    background: '#1e1e2e', border: `1px solid ${COLOR.error}`, borderRadius: '10px',
    padding: '16px', width: '220px', textAlign: 'center',
    fontFamily: 'system-ui, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  });
  const icon = document.createElement('div');
  icon.appendChild(trashIcon(28, COLOR.errorLight));
  Object.assign(icon.style, { marginBottom: '8px' });
  const msg = document.createElement('div');
  msg.textContent = `Clear ${count} annotation${count > 1 ? 's' : ''}?`;
  Object.assign(msg.style, { color: '#e0e0e0', fontSize: '13px', fontWeight: '600', marginBottom: '4px' });
  const sub = document.createElement('div');
  sub.textContent = 'This cannot be undone.';
  Object.assign(sub.style, { color: COLOR.muted, fontSize: '11px', marginBottom: '14px' });
  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '8px', justifyContent: 'center' });
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    flex: '1', padding: '6px', border: `1px solid ${COLOR.border}`, borderRadius: '6px',
    background: 'transparent', color: COLOR.secondary, fontSize: '12px',
    cursor: 'pointer', fontFamily: FONT,
  });
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Clear All';
  Object.assign(confirmBtn.style, {
    flex: '1', padding: '6px', border: 'none', borderRadius: '6px',
    background: COLOR.error, color: COLOR.white, fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', fontFamily: FONT,
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
    padding: '10px 12px', borderBottom: `1px solid ${COLOR.borderLight}`,
    fontFamily: FONT,
  });

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: '0' });

  const capBtn = document.createElement('button');
  capBtn.appendChild(cameraIcon(16));
  capBtn.setAttribute('data-tooltip', 'Capture now');
  Object.assign(capBtn.style, {
    padding: '5px', border: 'none', borderRadius: '6px',
    background: COLOR.warning, color: '#000', display: 'flex', cursor: 'pointer',
  });
  capBtn.addEventListener('click', () => { callbacks.onRequestCapture(req, entry, capBtn); });

  const decBtn = document.createElement('button');
  decBtn.appendChild(closeIcon(16, 'currentColor'));
  decBtn.setAttribute('data-tooltip', 'Decline capture request');
  Object.assign(decBtn.style, {
    padding: '5px', border: `1px solid ${COLOR.border}`, borderRadius: '6px',
    background: 'transparent', color: COLOR.secondary, display: 'flex', cursor: 'pointer',
  });
  decBtn.addEventListener('mouseenter', () => { decBtn.style.color = COLOR.errorLight; decBtn.style.borderColor = COLOR.errorLight; });
  decBtn.addEventListener('mouseleave', () => { decBtn.style.color = COLOR.secondary; decBtn.style.borderColor = COLOR.border; });
  decBtn.addEventListener('click', () => { callbacks.onRequestDecline(req, entry); });
  btnRow.append(capBtn, decBtn);

  const PURPOSE_LABELS = { inspect: '\ud83d\udd0d Inspect', verify: '\u2705 Verify', capture: '\ud83d\udd14 Capture' };
  const topRow = document.createElement('div');
  Object.assign(topRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
  const label = document.createElement('span');
  label.textContent = PURPOSE_LABELS[req.purpose] || '\ud83d\udd14 Capture';
  Object.assign(label.style, { fontSize: '11px', fontWeight: '600', color: COLOR.warning });
  const urlText = document.createElement('span');
  urlText.textContent = req.url;
  Object.assign(urlText.style, {
    fontSize: '11px', color: COLOR.secondary, flex: '1',
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
      background: '#252536', borderRadius: '0', borderLeft: `3px solid ${COLOR.warning}`,
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
  entry.tabIndex = 0;
  Object.assign(entry.style, {
    padding: '8px 12px', borderBottom: `1px solid ${COLOR.borderLight}`,
    cursor: ann.resolved ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', transition: 'background 0.1s',
    opacity: ann.pending && !ann.resolved ? '0.7' : '1',
    outline: 'none',
  });
  entry.addEventListener('mouseenter', () => {
    entry.style.background = COLOR.bgHover;
    callbacks.onSpotlight(ann.id);
  });
  entry.addEventListener('mouseleave', () => {
    if (entry !== entry.ownerDocument.activeElement) entry.style.background = 'transparent';
    callbacks.onSpotlight(null);
  });
  entry.addEventListener('focus', () => { entry.style.background = COLOR.bgHover; callbacks.onSpotlight(ann.id); });
  entry.addEventListener('blur', () => { entry.style.background = 'transparent'; callbacks.onSpotlight(null); });
  entry.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !ann.resolved) { callbacks.onEntryClick(ann); }
    if (e.key === 'ArrowDown') { e.preventDefault(); entry.nextElementSibling?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); entry.previousElementSibling?.focus(); }
  });

  const label = document.createElement('span');
  Object.assign(label.style, {
    color: ann.resolved ? COLOR.muted : COLOR.text, overflow: 'hidden',
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
    background: markerColor, color: COLOR.white, fontSize: '10px', fontWeight: '700',
    padding: '1px 5px', borderRadius: '3px', marginRight: '3px',
    fontFamily: FONT, flexShrink: '0',
  });
  numBadge.setAttribute('data-tooltip', `Annotation ${ann.id}`);
  line1.appendChild(numBadge);

  if (ann.severity) {
    const sevIcon = document.createElement('span');
    sevIcon.textContent = '!';
    Object.assign(sevIcon.style, {
      background: SEV_DOT_COLORS[ann.severity] || '#a855f7',
      color: COLOR.white, fontSize: '10px', fontWeight: '900', marginRight: '4px', flexShrink: '0',
      fontFamily: FONT,
      padding: '1px 4px', borderRadius: '3px',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    });
    sevIcon.setAttribute('data-tooltip', ann.severity);
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
      background: COLOR.bgHover, color: '#93c5fd', fontSize: '10px', fontWeight: '500',
      padding: '1px 4px', borderRadius: '3px', marginRight: '4px',
      fontFamily: FONT_MONO, flexShrink: '0',
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
      color: COLOR.dim, fontSize: '9px', cursor: 'pointer', flexShrink: '0',
      marginLeft: '4px', transition: 'transform 0.15s', userSelect: 'none',
    });
    chevron.setAttribute('data-tooltip', 'Expand comment');
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      expanded = !expanded;
      line1.style.whiteSpace = expanded ? 'normal' : 'nowrap';
      line1.style.maxHeight = expanded ? '120px' : '20px';
      chevron.style.transform = expanded ? 'rotate(90deg)' : '';
      chevron.setAttribute('data-tooltip', expanded ? 'Collapse comment' : 'Expand comment');
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
      color: COLOR.success, fontSize: '10px', marginTop: '2px',
      fontFamily: FONT,
    });
    label.appendChild(resLine);
  } else if (ann.pending) {
    const pendLine = document.createElement('div');
    pendLine.textContent = '\u23F3 Sent to agent - waiting for fix...';
    Object.assign(pendLine.style, {
      color: COLOR.warning, fontSize: '10px', marginTop: '2px',
      fontFamily: FONT,
    });
    label.appendChild(pendLine);
  }

  if (!ann.resolved) {
    label.addEventListener('click', () => { callbacks.onShowPanel(ann); });
  }

  if (ann.resolved) {
    const check = document.createElement('span');
    check.appendChild(checkIcon(12, COLOR.success));
    Object.assign(check.style, { padding: '2px', flexShrink: '0' });
    entry.append(label, check);
  } else {
    const resolveBtn = document.createElement('button');
    resolveBtn.setAttribute(ATTR, 'btn');
    resolveBtn.appendChild(circleIcon(12, COLOR.muted));
    resolveBtn.setAttribute('data-tooltip', 'Mark resolved');
    Object.assign(resolveBtn.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    resolveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onResolve(ann.id);
    });

    const del = document.createElement('button');
    del.setAttribute(ATTR, 'btn');
    del.appendChild(closeIcon(12, COLOR.muted));
    Object.assign(del.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
    del.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onRemove(ann.id); });

    entry.append(label, resolveBtn, del);
  }
  return entry;
}
