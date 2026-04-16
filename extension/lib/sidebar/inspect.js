/**
 * Sidebar Inspect Tab
 *
 * Page diagnostics: network, console, visibility, stacking, focus, scroll,
 * landmarks. Plus auto-capture/audit toggles and session recording.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '../selector.js';
import { collectNetworkState } from '../collectors/network-collector.js';
import { getConsoleState } from '../collectors/console-collector.js';
import { collectBreakpoints } from '../collectors/breakpoint-collector.js';
import { collectStackingContexts } from '../collectors/stacking-collector.js';
import { collectFocusChain } from '../collectors/focus-collector.js';
import { collectScrollContainers } from '../collectors/scroll-collector.js';
import { collectLandmarks } from '../collectors/landmark-collector.js';
// import { collectComponents } from '../collectors/component-collector.js';
import { checkRendered } from '../collectors/visibility-collector.js';
// import { startWatcher, stopWatcher, isWatcherEnabled } from '../session/continuous-capture.js';
// import { isRecording, startSession, stopSession, getState } from '../session/session-manager.js';
// import { startJourney, stopJourney } from '../session/journey-recorder.js';
import { groupRequests, smartPath } from '../network-grouper.js';
import { getAnnotations, addPageNote, updateComment } from '../annotate.js';
// import { discoverServer, updateConfig } from '../constants.js';

/**
 * Create the inspect tab content element and its refresh function.
 * @param {{ onRefresh: function }} callbacks
 * @returns {{ element: HTMLElement, refresh: function }}
 */
export function createInspectTab(callbacks = {}) {
  const el = document.createElement('div');
  el.setAttribute(ATTR, 'inspect-content');
  Object.assign(el.style, {
    display: 'none', flexDirection: 'column', flex: '1', minHeight: '0',
    overflowY: 'auto', padding: '8px 12px', gap: '12px',
    fontSize: '12px', fontFamily: 'system-ui, sans-serif', color: '#c8c8d0',
  });

  return {
    element: el,
    refresh: () => refreshInspect(el, callbacks),
  };
}

// Re-export createSection for captures module
export { createSection };

/** Create a collapsible section with copy and note buttons. */
function createSection(title, badgeText, badgeColor, onRefresh) {
  const section = document.createElement('div');
  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px',
  });
  const arrow = document.createElement('span');
  arrow.textContent = '\u25b6';
  Object.assign(arrow.style, { fontSize: '8px', color: '#666', transition: 'transform 0.15s' });
  const label = document.createElement('span');
  label.textContent = title;
  Object.assign(label.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', flex: '1', textTransform: 'uppercase', letterSpacing: '0.5px' });
  headerRow.append(arrow, label);
  if (badgeText) {
    const badge = document.createElement('span');
    badge.textContent = badgeText;
    Object.assign(badge.style, {
      fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '8px',
      background: badgeColor || '#333', color: '#fff',
    });
    headerRow.appendChild(badge);
  }

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'section-copy');
  copyBtn.dataset.section = title;
  copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
  copyBtn.title = `Copy ${title} data`;
  Object.assign(copyBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer', color: '#555',
    padding: '2px', borderRadius: '3px', display: 'flex', flexShrink: '0',
  });
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.color = '#a5b4fc'; });
  copyBtn.addEventListener('mouseleave', () => { if (copyBtn.dataset.copied !== 'true') copyBtn.style.color = '#555'; });
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = `${title}:\n${body.textContent.trim()}`;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.dataset.copied = 'true';
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      copyBtn.style.color = '#4ade80';
      setTimeout(() => {
        copyBtn.dataset.copied = 'false';
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        copyBtn.style.color = '#555';
      }, 1500);
    }).catch(() => {});
  });
  headerRow.appendChild(copyBtn);

  // Note button
  const noteBtn = document.createElement('button');
  noteBtn.setAttribute(ATTR, 'section-note');
  noteBtn.dataset.section = title;
  noteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
  noteBtn.title = 'Add as note for agent';
  const alreadyNoted = getAnnotations().some((a) => a.diagnostic?.section === title);
  Object.assign(noteBtn.style, {
    border: 'none', background: 'transparent', cursor: alreadyNoted ? 'default' : 'pointer',
    color: alreadyNoted ? '#4ade80' : '#6366f1',
    padding: '2px', borderRadius: '3px', display: 'flex', flexShrink: '0',
    opacity: alreadyNoted ? '0.4' : '1', pointerEvents: alreadyNoted ? 'none' : 'auto',
  });
  if (alreadyNoted) {
    noteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    noteBtn.title = 'Note added';
  }
  noteBtn.addEventListener('mouseenter', () => { noteBtn.style.color = '#818cf8'; });
  noteBtn.addEventListener('mouseleave', () => { if (noteBtn.dataset.noted !== 'true') noteBtn.style.color = '#6366f1'; });
  noteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const fullData = body.textContent.trim();
    const ann = addPageNote();
    if (ann) {
      updateComment(ann.id, '');
      ann.diagnostic = { section: title, data: fullData };
      if (onRefresh) onRefresh();
      noteBtn.dataset.noted = 'true';
      noteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      noteBtn.style.color = '#4ade80';
      noteBtn.style.opacity = '0.4';
      noteBtn.style.pointerEvents = 'none';
      noteBtn.title = 'Note added';
    }
  });
  headerRow.appendChild(noteBtn);

  const body = document.createElement('div');
  Object.assign(body.style, { display: 'none', marginTop: '6px', fontSize: '11px' });
  headerRow.addEventListener('click', () => {
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    arrow.style.transform = open ? '' : 'rotate(90deg)';
  });
  section.append(headerRow, body);
  return { section, body };
}

/**
 * Populate the inspect tab with live page data.
 * This is the main rendering function - called on tab switch.
 */
async function refreshInspect(container, callbacks) {
  container.innerHTML = '';

  // Breakpoint indicator (guarded for test environments without matchMedia)
  let bp;
  try { bp = collectBreakpoints(); } catch { bp = { activeRange: 'unknown', viewport: { width: 0 } }; }
  const bpRow = document.createElement('div');
  Object.assign(bpRow.style, { display: 'flex', alignItems: 'center', gap: '8px', background: '#16161e', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px' });
  const bpTitle = document.createElement('span');
  bpTitle.textContent = 'VIEWPORT';
  Object.assign(bpTitle.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' });
  const bpBadge = document.createElement('span');
  bpBadge.textContent = bp.activeRange;
  Object.assign(bpBadge.style, { background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' });
  const bpLabel = document.createElement('span');
  bpLabel.textContent = `${bp.viewport.width}px`;
  Object.assign(bpLabel.style, { color: '#666', fontSize: '11px' });
  bpRow.append(bpTitle, bpBadge, bpLabel);
  container.appendChild(bpRow);

  // Network section
  const net = collectNetworkState();
  const allReqs = net.requests || [];
  const failedReqs = allReqs.filter((r) => r.failed);
  const netSummary = `${failedReqs.length ? failedReqs.length + ' failed / ' : ''}${allReqs.length}`;
  const netColor = failedReqs.length > 0 ? '#dc2626' : '#333';
  const { section: netSection, body: netBody } = createSection('Network', netSummary, netColor, callbacks.onRefresh);
  if (allReqs.length === 0) {
    netBody.textContent = 'No requests captured';
    Object.assign(netBody.style, { color: '#555', fontStyle: 'italic' });
  } else {
    const groups = groupRequests(allReqs);
    for (const group of groups) {
      const groupRow = document.createElement('div');
      Object.assign(groupRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', cursor: 'pointer', userSelect: 'none' });
      const grpArrow = document.createElement('span');
      const isFailed = group.name === 'Failed';
      let expanded = isFailed;
      grpArrow.textContent = expanded ? '\u25be' : '\u25b8';
      Object.assign(grpArrow.style, { color: '#666', fontSize: '10px', width: '10px' });
      const gName = document.createElement('span');
      gName.textContent = group.name;
      Object.assign(gName.style, { fontWeight: '600', fontSize: '11px', flex: '1', color: isFailed ? '#f87171' : '#9ca3af' });
      const gCount = document.createElement('span');
      const sizeStr = group.totalSize > 0 ? ` - ${(group.totalSize / 1024).toFixed(1)}K` : '';
      gCount.textContent = `${group.requests.length}${sizeStr}`;
      Object.assign(gCount.style, { color: '#555', fontSize: '10px' });
      groupRow.append(grpArrow, gName, gCount);
      const groupBody = document.createElement('div');
      Object.assign(groupBody.style, { display: expanded ? 'block' : 'none', paddingLeft: '14px' });
      groupRow.addEventListener('click', () => {
        expanded = !expanded;
        grpArrow.textContent = expanded ? '\u25be' : '\u25b8';
        groupBody.style.display = expanded ? 'block' : 'none';
      });
      for (const req of group.requests) {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', gap: '6px', padding: '2px 0', color: req.failed ? '#f87171' : '#9ca3af' });
        const sp = smartPath(req.url);
        const urlEl = document.createElement('span');
        urlEl.textContent = sp.filename;
        urlEl.title = sp.full;
        Object.assign(urlEl.style, { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
        if (sp.parent) {
          const parentEl = document.createElement('span');
          parentEl.textContent = ` ${sp.parent}`;
          Object.assign(parentEl.style, { color: '#444', fontSize: '10px' });
          urlEl.appendChild(parentEl);
        }
        const size = document.createElement('span');
        size.textContent = req.failed ? 'FAIL' : `${((req.transferSize || 0) / 1024).toFixed(1)}K`;
        Object.assign(size.style, { flexShrink: '0', color: req.failed ? '#f87171' : '#555', fontWeight: req.failed ? '600' : '400' });
        row.append(urlEl, size);
        groupBody.appendChild(row);
        if (req.failed) {
          const detailRow = document.createElement('div');
          Object.assign(detailRow.style, { display: 'none', paddingLeft: '8px', paddingBottom: '4px', fontSize: '10px', color: '#888', borderLeft: '2px solid #7f1d1d' });
          const parts = [`Type: ${req.initiatorType || 'unknown'}`, `Duration: ${req.duration || 0}ms`];
          detailRow.innerHTML = `<div style="word-break:break-all;color:#f87171;margin-bottom:2px">${req.url}</div><div>${parts.join(' - ')}</div>`;
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => { detailRow.style.display = detailRow.style.display === 'none' ? 'block' : 'none'; });
          groupBody.appendChild(detailRow);
        }
      }
      netBody.append(groupRow, groupBody);
    }
  }
  container.appendChild(netSection);

  // Console section
  const cs = getConsoleState();
  const errCount = cs.summary?.errors || 0;
  const warnCount = cs.summary?.warnings || 0;
  const conBadgeParts = [];
  if (errCount) conBadgeParts.push(`${errCount} err`);
  if (warnCount) conBadgeParts.push(`${warnCount} warn`);
  const conBadge = conBadgeParts.length ? conBadgeParts.join(', ') : '\u2713 No errors or warnings';
  const conColor = errCount > 0 ? '#dc2626' : warnCount > 0 ? '#f59e0b' : '#333';
  const { section: conSection, body: conBody } = createSection('Console', conBadge, conColor, callbacks.onRefresh);
  for (const entry of (cs.entries || []).slice(0, 20)) {
    const row = document.createElement('div');
    Object.assign(row.style, { padding: '2px 0', color: entry.level === 'error' ? '#f87171' : entry.level === 'warn' ? '#fbbf24' : '#9ca3af' });
    row.textContent = `[${entry.level}] ${(entry.message || '').slice(0, 120)}`;
    conBody.appendChild(row);
  }
  container.appendChild(conSection);

  // Landmarks section
  const lm = collectLandmarks();
  const lmIssues = lm.issues?.length || 0;
  const lmBadge = lmIssues > 0 ? `\u26a0 ${lmIssues}` : `${lm.landmarks?.length || 0} found`;
  const lmColor = lmIssues > 0 ? '#f59e0b' : '#333';
  const { section: lmSection, body: lmBody } = createSection('Landmarks', lmBadge, lmColor, callbacks.onRefresh);
  if (lm.landmarks?.length) {
    // Show issues first if any
    if (lm.issues?.length) {
      for (const issue of lm.issues) {
        const row = document.createElement('div');
        row.textContent = `\u26a0 ${issue.message || issue}`;
        Object.assign(row.style, { color: '#f59e0b', padding: '2px 0', fontSize: '10px' });
        lmBody.appendChild(row);
      }
      const sep = document.createElement('hr');
      Object.assign(sep.style, { border: 'none', borderTop: '1px solid #333', margin: '4px 0' });
      lmBody.appendChild(sep);
    }
    for (const l of lm.landmarks) {
      const row = document.createElement('div');
      const label = l.label ? ` "${l.label}"` : ' (unlabeled)';
      row.textContent = `<${l.tag}>${label}`;
      Object.assign(row.style, { color: '#9ca3af', padding: '2px 0', fontSize: '10px' });
      lmBody.appendChild(row);
    }
  }
  container.appendChild(lmSection);

  // Conditional sections (only shown when issues detected)
  const hiddenEls = document.querySelectorAll('*');
  const hiddenList = [];
  for (let i = 0; i < Math.min(hiddenEls.length, 500); i++) {
    if (!checkRendered(hiddenEls[i]) && hiddenEls[i].textContent?.trim()) hiddenList.push(hiddenEls[i]);
  }
  if (hiddenList.length > 0) {
    const { section: visSection, body: visBody } = createSection('Visibility', `${hiddenList.length}`, '#f59e0b', callbacks.onRefresh);
    for (const el of hiddenList.slice(0, 10)) {
      const row = document.createElement('div');
      const text = el.textContent?.trim().slice(0, 40) || '';
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      row.textContent = `${tag}${id}${text ? ': "' + text + '"' : ''} - hidden`;
      Object.assign(row.style, { color: '#f59e0b', padding: '2px 0', fontSize: '10px' });
      visBody.appendChild(row);
    }
    container.appendChild(visSection);
  }

  const stacking = collectStackingContexts();
  if (stacking.issues?.length > 0) {
    const { section: stackSection, body: stackBody } = createSection('Stacking', `\u26a0 ${stacking.issues.length}`, '#f59e0b', callbacks.onRefresh);
    for (const issue of stacking.issues.slice(0, 10)) {
      const row = document.createElement('div');
      row.textContent = issue.description || `z-index conflict: ${issue.element}`;
      Object.assign(row.style, { color: '#f59e0b', padding: '1px 0' });
      stackBody.appendChild(row);
    }
    container.appendChild(stackSection);
  }

  const focus = collectFocusChain();
  if (focus.issues?.length > 0) {
    const { section: focusSection, body: focusBody } = createSection('Focus', `\u26a0 ${focus.issues.length}`, '#f59e0b', callbacks.onRefresh);
    for (const issue of focus.issues.slice(0, 10)) {
      const row = document.createElement('div');
      row.textContent = issue.description || issue.type;
      Object.assign(row.style, { color: '#f59e0b', padding: '1px 0' });
      focusBody.appendChild(row);
    }
    container.appendChild(focusSection);
  }

  const scroll = collectScrollContainers();
  if (scroll.containers?.length > 0) {
    const { section: scrollSection, body: scrollBody } = createSection('Scroll', `\u26a0 ${scroll.containers.length}`, '#f59e0b', callbacks.onRefresh);
    for (const c of scroll.containers.slice(0, 10)) {
      const row = document.createElement('div');
      row.textContent = c.selector || 'scroll container';
      Object.assign(row.style, { color: '#9ca3af', padding: '1px 0' });
      scrollBody.appendChild(row);
    }
    container.appendChild(scrollSection);
  }
}
