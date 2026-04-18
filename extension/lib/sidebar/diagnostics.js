/**
 * Sidebar Diagnostics Sections
 *
 * Renders page diagnostic sections in the Inspect tab: viewport breakpoint,
 * network, console, landmarks, visibility, stacking, focus, scroll.
 * Shows green "No issues detected" when all sections are clean.
 *
 * Extracted from inspect.js (16.11 decomposition).
 *
 * @see extension/lib/sidebar/inspect.js - orchestrator
 */

import { ATTR } from '#lib/selector.js';
import { collectNetworkState } from '#lib/collectors/network-collector.js';
import { getConsoleState } from '#lib/collectors/console-collector.js';
import { collectBreakpoints } from '#lib/collectors/breakpoint-collector.js';
import { collectStackingContexts } from '#lib/collectors/stacking-collector.js';
import { collectFocusChain } from '#lib/collectors/focus-collector.js';
import { collectScrollContainers } from '#lib/collectors/scroll-collector.js';
import { collectLandmarks } from '#lib/collectors/landmark-collector.js';
import { checkRendered } from '#lib/collectors/visibility-collector.js';
import { groupRequests, smartPath } from '#lib/network-grouper.js';
import { createSection } from './inspect.js';
import { COLOR, LABEL_STYLE } from './styles.js';

/**
 * Render all diagnostic sections into the container.
 * Returns issue counts for the empty-state check.
 * @param {HTMLElement} container
 * @param {{ onRefresh?: function }} callbacks
 */
export function renderDiagnostics(container, callbacks = {}) {
  // Breakpoint indicator
  let bp;
  try { bp = collectBreakpoints(); } catch { bp = { activeRange: 'unknown', viewport: { width: 0 } }; }
  const bpRow = document.createElement('div');
  Object.assign(bpRow.style, { display: 'flex', alignItems: 'center', gap: '8px', background: COLOR.bgCard, padding: '6px 10px', borderRadius: '6px', marginBottom: '4px' });
  const bpTitle = document.createElement('span');
  bpTitle.textContent = 'VIEWPORT';
  Object.assign(bpTitle.style, LABEL_STYLE);
  const bpBadge = document.createElement('span');
  bpBadge.textContent = bp.activeRange;
  Object.assign(bpBadge.style, { background: COLOR.primary, color: COLOR.white, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' });
  const bpLabel = document.createElement('span');
  bpLabel.textContent = `${bp.viewport.width}px`;
  Object.assign(bpLabel.style, { color: COLOR.muted, fontSize: '11px' });
  bpRow.append(bpTitle, bpBadge, bpLabel);
  container.appendChild(bpRow);

  // Network
  const net = collectNetworkState();
  const allReqs = net.requests || [];
  const failedReqs = allReqs.filter((r) => r.failed);
  const netSummary = `${failedReqs.length ? failedReqs.length + ' failed / ' : ''}${allReqs.length}`;
  const netColor = failedReqs.length > 0 ? COLOR.error : COLOR.border;
  const { section: netSection, body: netBody } = createSection('Network', netSummary, netColor, callbacks.onRefresh);
  if (allReqs.length === 0) {
    netBody.textContent = 'No requests captured';
    Object.assign(netBody.style, { color: COLOR.dim, fontStyle: 'italic' });
  } else {
    const groups = groupRequests(allReqs);
    for (const group of groups) {
      const groupRow = document.createElement('div');
      Object.assign(groupRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', cursor: 'pointer', userSelect: 'none' });
      const grpArrow = document.createElement('span');
      const isFailed = group.name === 'Failed';
      let expanded = isFailed;
      grpArrow.textContent = expanded ? '\u25be' : '\u25b8';
      Object.assign(grpArrow.style, { color: COLOR.muted, fontSize: '10px', width: '10px' });
      const gName = document.createElement('span');
      gName.textContent = group.name;
      Object.assign(gName.style, { fontWeight: '600', fontSize: '11px', flex: '1', color: isFailed ? COLOR.errorLight : COLOR.secondary });
      const gCount = document.createElement('span');
      const sizeStr = group.totalSize > 0 ? ` - ${(group.totalSize / 1024).toFixed(1)}K` : '';
      gCount.textContent = `${group.requests.length}${sizeStr}`;
      Object.assign(gCount.style, { color: COLOR.dim, fontSize: '10px' });
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
        Object.assign(row.style, { display: 'flex', gap: '6px', padding: '2px 0', color: req.failed ? COLOR.errorLight : COLOR.secondary });
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
        Object.assign(size.style, { flexShrink: '0', color: req.failed ? COLOR.errorLight : COLOR.dim, fontWeight: req.failed ? '600' : '400' });
        row.append(urlEl, size);
        groupBody.appendChild(row);
        if (req.failed) {
          const detailRow = document.createElement('div');
          Object.assign(detailRow.style, { display: 'none', paddingLeft: '8px', paddingBottom: '4px', fontSize: '10px', color: '#888', borderLeft: `2px solid ${COLOR.errorDark}` });
          const parts = [`Type: ${req.initiatorType || 'unknown'}`, `Duration: ${req.duration || 0}ms`];
          const urlDiv = document.createElement('div');
          Object.assign(urlDiv.style, { wordBreak: 'break-all', color: COLOR.errorLight, marginBottom: '2px' });
          urlDiv.textContent = req.url;
          const infoDiv = document.createElement('div');
          infoDiv.textContent = parts.join(' - ');
          detailRow.append(urlDiv, infoDiv);
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => { detailRow.style.display = detailRow.style.display === 'none' ? 'block' : 'none'; });
          groupBody.appendChild(detailRow);
        }
      }
      netBody.append(groupRow, groupBody);
    }
  }
  container.appendChild(netSection);

  // Console
  const cs = getConsoleState();
  const errCount = cs.summary?.errors || 0;
  const warnCount = cs.summary?.warnings || 0;
  const conBadgeParts = [];
  if (errCount) conBadgeParts.push(`${errCount} err`);
  if (warnCount) conBadgeParts.push(`${warnCount} warn`);
  const conBadge = conBadgeParts.length ? conBadgeParts.join(', ') : '\u2713 No errors or warnings';
  const conColor = errCount > 0 ? COLOR.error : warnCount > 0 ? COLOR.warning : COLOR.border;
  const { section: conSection, body: conBody } = createSection('Console', conBadge, conColor, callbacks.onRefresh);
  for (const entry of (cs.entries || []).slice(0, 20)) {
    const row = document.createElement('div');
    Object.assign(row.style, { padding: '2px 0', color: entry.level === 'error' ? COLOR.errorLight : entry.level === 'warn' ? COLOR.warningLight : COLOR.secondary });
    row.textContent = `[${entry.level}] ${(entry.message || '').slice(0, 120)}`;
    conBody.appendChild(row);
  }
  container.appendChild(conSection);

  // Landmarks
  const lm = collectLandmarks();
  const lmIssues = lm.issues?.length || 0;
  const lmBadge = lmIssues > 0 ? `\u26a0 ${lmIssues}` : `${lm.landmarks?.length || 0} found`;
  const lmColor = lmIssues > 0 ? COLOR.warning : COLOR.border;
  const { section: lmSection, body: lmBody } = createSection('Landmarks', lmBadge, lmColor, callbacks.onRefresh);
  if (lm.landmarks?.length) {
    if (lm.issues?.length) {
      for (const issue of lm.issues) {
        const row = document.createElement('div');
        row.textContent = `\u26a0 ${issue.message || issue}`;
        Object.assign(row.style, { color: COLOR.warning, padding: '2px 0', fontSize: '10px' });
        lmBody.appendChild(row);
      }
      const sep = document.createElement('hr');
      Object.assign(sep.style, { border: 'none', borderTop: `1px solid ${COLOR.border}`, margin: '4px 0' });
      lmBody.appendChild(sep);
    }
    for (const l of lm.landmarks) {
      const row = document.createElement('div');
      const label = l.label ? ` "${l.label}"` : ' (unlabeled)';
      row.textContent = `<${l.tag}>${label}`;
      Object.assign(row.style, { color: COLOR.secondary, padding: '2px 0', fontSize: '10px' });
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
    const { section: visSection, body: visBody } = createSection('Visibility', `${hiddenList.length}`, COLOR.warning, callbacks.onRefresh);
    for (const el of hiddenList.slice(0, 10)) {
      const row = document.createElement('div');
      const text = el.textContent?.trim().slice(0, 40) || '';
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      row.textContent = `${tag}${id}${text ? ': "' + text + '"' : ''} - hidden`;
      Object.assign(row.style, { color: COLOR.warning, padding: '2px 0', fontSize: '10px' });
      visBody.appendChild(row);
    }
    container.appendChild(visSection);
  }

  const stacking = collectStackingContexts();
  if (stacking.issues?.length > 0) {
    const { section: stackSection, body: stackBody } = createSection('Stacking', `\u26a0 ${stacking.issues.length}`, COLOR.warning, callbacks.onRefresh);
    for (const issue of stacking.issues.slice(0, 10)) {
      const row = document.createElement('div');
      row.textContent = issue.description || `z-index conflict: ${issue.element}`;
      Object.assign(row.style, { color: COLOR.warning, padding: '1px 0' });
      stackBody.appendChild(row);
    }
    container.appendChild(stackSection);
  }

  const focus = collectFocusChain();
  if (focus.issues?.length > 0) {
    const { section: focusSection, body: focusBody } = createSection('Focus', `\u26a0 ${focus.issues.length}`, COLOR.warning, callbacks.onRefresh);
    for (const issue of focus.issues.slice(0, 10)) {
      const row = document.createElement('div');
      row.textContent = issue.description || issue.type;
      Object.assign(row.style, { color: COLOR.warning, padding: '1px 0' });
      focusBody.appendChild(row);
    }
    container.appendChild(focusSection);
  }

  const scroll = collectScrollContainers();
  if (scroll.containers?.length > 0) {
    const { section: scrollSection, body: scrollBody } = createSection('Scroll', `\u26a0 ${scroll.containers.length}`, COLOR.warning, callbacks.onRefresh);
    for (const c of scroll.containers.slice(0, 10)) {
      const row = document.createElement('div');
      row.textContent = c.selector || 'scroll container';
      Object.assign(row.style, { color: COLOR.secondary, padding: '1px 0' });
      scrollBody.appendChild(row);
    }
    container.appendChild(scrollSection);
  }

  // Empty state: all diagnostics clean
  const hasIssues = failedReqs.length > 0 || errCount > 0 || lmIssues > 0
    || hiddenList.length > 0 || (stacking.issues?.length > 0) || (focus.issues?.length > 0);
  if (!hasIssues) {
    const cleanRow = document.createElement('div');
    cleanRow.setAttribute(ATTR, 'inspect-clean');
    Object.assign(cleanRow.style, {
      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
      background: 'rgba(74, 222, 128, 0.08)', borderRadius: '6px', margin: '4px 0',
    });
    const dot = document.createElement('span');
    Object.assign(dot.style, { width: '8px', height: '8px', borderRadius: '50%', background: COLOR.success, flexShrink: '0' });
    const text = document.createElement('span');
    text.textContent = 'No issues detected';
    Object.assign(text.style, { color: COLOR.success, fontSize: '11px', fontWeight: '600' });
    cleanRow.append(dot, text);
    container.appendChild(cleanRow);
  }
}
