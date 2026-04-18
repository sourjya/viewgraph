/**
 * Sidebar Captures Section
 *
 * Fetches capture list and baseline status from the server.
 * Renders in the Inspect tab below diagnostics and toggles.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '#lib/selector.js';
import * as transport from '#lib/transport.js';
import { COLOR, FONT, LABEL_STYLE } from './styles.js';

/**
 * Fetch captures and baselines from server, render into container.
 * @param {HTMLElement} container - The inspect tab content element
 */
export async function renderCaptures(container) {
  const pageUrl = location.href;

  let captures;
  try {
    await transport.getHealth();
    const data = await transport.getCaptures(pageUrl);
    captures = data?.captures || [];
  } catch { return; }

  if (!captures || captures.length === 0) return;

  const now = Date.now();
  const latest = captures[0];
  const d = latest.timestamp ? new Date(latest.timestamp) : null;

  let timeStr = '';
  if (d) {
    const diffMin = Math.floor((now - d.getTime()) / 60000);
    if (diffMin < 1) timeStr = 'latest just now';
    else if (diffMin < 60) timeStr = `latest ${diffMin}m ago`;
    else if (diffMin < 1440) timeStr = `latest ${Math.floor(diffMin / 60)}h ago`;
    else timeStr = `latest ${Math.floor(diffMin / 1440)}d ago`;
  }

  // Status row
  const row = document.createElement('div');
  row.setAttribute(ATTR, 'capture-status');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' });
  const label = document.createElement('span');
  label.textContent = 'SNAPSHOTS';
  Object.assign(label.style, LABEL_STYLE);
  const info = document.createElement('span');
  info.textContent = `${captures.length} - ${timeStr}`;
  info.setAttribute(ATTR, 'capture-info');
  Object.assign(info.style, { color: COLOR.muted, fontSize: '11px', flex: '1' });
  const dot = document.createElement('span');
  const isRecent = d && (now - d.getTime()) < 300000;
  Object.assign(dot.style, { width: '6px', height: '6px', borderRadius: '50%', flexShrink: '0', background: isRecent ? COLOR.success : '#444' });
  row.append(label, info, dot);
  container.appendChild(row);

  // Capture ID row
  const idRow = document.createElement('div');
  idRow.setAttribute(ATTR, 'capture-id-row');
  Object.assign(idRow.style, { display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' });
  const idText = document.createElement('span');
  idText.textContent = latest.filename.replace(/\.json$/, '');
  idText.setAttribute(ATTR, 'capture-id');
  Object.assign(idText.style, { color: COLOR.primary, fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1' });
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'copy-id');
  copyBtn.textContent = 'Copy';
  copyBtn.setAttribute('data-tooltip', 'Copy capture ID');
  Object.assign(copyBtn.style, { border: 'none', background: COLOR.bgDark, color: COLOR.muted, fontSize: '10px', padding: '1px 6px', borderRadius: '3px', cursor: 'pointer', flexShrink: '0', fontFamily: FONT });
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(latest.filename).then(() => {
      copyBtn.textContent = 'Copied';
      copyBtn.style.color = COLOR.success;
      setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.style.color = COLOR.muted; }, 1500);
    }).catch(() => {});
  });
  idRow.append(idText, copyBtn);
  container.appendChild(idRow);

  // URL
  if (latest.url) {
    const urlEl = document.createElement('div');
    urlEl.setAttribute(ATTR, 'capture-url');
    try { const u = new URL(latest.url); urlEl.textContent = u.host + u.pathname; } catch { urlEl.textContent = latest.url; }
    Object.assign(urlEl.style, { color: '#6b7280', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    container.appendChild(urlEl);
  }

  // Title
  if (latest.title) {
    const titleEl = document.createElement('div');
    titleEl.setAttribute(ATTR, 'capture-title');
    titleEl.textContent = latest.title;
    Object.assign(titleEl.style, { color: COLOR.dim, fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    container.appendChild(titleEl);
  }

  // Empty capture warning
  if ((latest.nodeCount || 0) === 0) {
    const warn = document.createElement('div');
    warn.setAttribute(ATTR, 'capture-warning');
    warn.textContent = '\u26a0 Latest capture is empty - page may not have loaded';
    Object.assign(warn.style, { color: COLOR.warning, fontSize: '10px', fontWeight: '600', padding: '2px 0' });
    container.appendChild(warn);
  }

  // Capture timeline - collapsible list of all captures
  if (captures.length > 1) {
    const timelineRow = document.createElement('div');
    Object.assign(timelineRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', cursor: 'pointer', userSelect: 'none' });
    const arrow = document.createElement('span');
    arrow.textContent = '\u25b6';
    Object.assign(arrow.style, { fontSize: '8px', color: COLOR.muted, transition: 'transform 0.15s' });
    const tlLabel = document.createElement('span');
    tlLabel.textContent = `${captures.length} captures`;
    Object.assign(tlLabel.style, { fontSize: '10px', color: COLOR.muted, flex: '1' });
    timelineRow.append(arrow, tlLabel);

    const timelineBody = document.createElement('div');
    timelineBody.setAttribute(ATTR, 'capture-timeline');
    Object.assign(timelineBody.style, { display: 'none', maxHeight: '120px', overflowY: 'auto', paddingLeft: '14px' });

    timelineRow.addEventListener('click', () => {
      const open = timelineBody.style.display !== 'none';
      timelineBody.style.display = open ? 'none' : 'block';
      arrow.style.transform = open ? '' : 'rotate(90deg)';
    });

    for (const cap of captures.slice(0, 20)) {
      const capRow = document.createElement('div');
      Object.assign(capRow.style, { display: 'flex', alignItems: 'center', gap: '4px', padding: '1px 0', fontSize: '10px' });
      const capDot = document.createElement('span');
      const capTime = cap.timestamp ? new Date(cap.timestamp) : null;
      const isLatest = cap === latest;
      Object.assign(capDot.style, { width: '4px', height: '4px', borderRadius: '50%', background: isLatest ? COLOR.success : COLOR.border, flexShrink: '0' });
      const capName = document.createElement('span');
      capName.textContent = cap.filename?.replace(/viewgraph-|\.json$/g, '').slice(-25) || 'unknown';
      Object.assign(capName.style, { color: isLatest ? COLOR.primary : COLOR.dim, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1' });
      const capAge = document.createElement('span');
      if (capTime) {
        const mins = Math.floor((now - capTime.getTime()) / 60000);
        capAge.textContent = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
      }
      Object.assign(capAge.style, { color: '#444', flexShrink: '0' });
      capRow.append(capDot, capName, capAge);
      timelineBody.appendChild(capRow);
    }

    container.appendChild(timelineRow);
    container.appendChild(timelineBody);
  }

  // Cross-page consistency - show when multiple pages captured
  const uniquePages = [...new Set(captures.map((c) => {
    try { const u = new URL(c.url); return u.pathname; } catch { return c.url; }
  }).filter(Boolean))];
  if (uniquePages.length > 1) {
    const consistRow = document.createElement('div');
    Object.assign(consistRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderTop: `1px solid ${COLOR.borderLight}`, marginTop: '4px' });
    const consistLabel = document.createElement('span');
    consistLabel.textContent = 'CONSISTENCY';
    Object.assign(consistLabel.style, { ...LABEL_STYLE, flex: '1' });
    const consistInfo = document.createElement('span');
    consistInfo.textContent = `${uniquePages.length} pages`;
    Object.assign(consistInfo.style, { color: COLOR.muted, fontSize: '11px' });
    const consistBtn = document.createElement('button');
    consistBtn.textContent = 'Compare';
    Object.assign(consistBtn.style, {
      border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
      fontWeight: '700', cursor: 'pointer', fontFamily: FONT,
      background: '#1e3a5f', color: '#60a5fa',
    });
    consistBtn.addEventListener('click', () => {
      const filenames = captures.slice(0, 5).map((c) => c.filename).join(', ');
      const prompt = `Run check_consistency on these captures to find style differences across pages: ${filenames}`;
      navigator.clipboard.writeText(prompt).then(() => {
        consistBtn.textContent = 'Copied!';
        consistBtn.style.background = '#059669';
        consistBtn.style.color = COLOR.white;
        setTimeout(() => { consistBtn.textContent = 'Compare'; consistBtn.style.background = '#1e3a5f'; consistBtn.style.color = '#60a5fa'; }, 2000);
      }).catch(() => {});
    });
    consistRow.append(consistLabel, consistInfo, consistBtn);
    container.appendChild(consistRow);
  }

  // Baseline section
  const baseRow = document.createElement('div');
  baseRow.setAttribute(ATTR, 'baseline-row');
  Object.assign(baseRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderTop: `1px solid ${COLOR.borderLight}`, marginTop: '4px' });
  const baseLabel = document.createElement('span');
  baseLabel.textContent = 'BASELINE';
  Object.assign(baseLabel.style, LABEL_STYLE);
  const baseInfo = document.createElement('span');
  baseInfo.setAttribute(ATTR, 'baseline-info');
  Object.assign(baseInfo.style, { color: COLOR.muted, fontSize: '11px', flex: '1' });
  const baseBtn = document.createElement('button');
  baseBtn.setAttribute(ATTR, 'baseline-btn');
  baseBtn.setAttribute('data-tooltip', 'Set or compare against golden baseline');
  Object.assign(baseBtn.style, { border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: FONT, background: COLOR.border, color: COLOR.muted });
  baseRow.append(baseLabel, baseInfo, baseBtn);
  container.appendChild(baseRow);

  const baseDiff = document.createElement('div');
  baseDiff.setAttribute(ATTR, 'baseline-diff');
  Object.assign(baseDiff.style, { display: 'none', fontSize: '10px', color: COLOR.secondary, padding: '2px 0' });
  container.appendChild(baseDiff);

  // Fetch baseline status
  try {
    const { baselines } = await transport.getBaselines(pageUrl);
    const current = baselines?.[0];
    if (current) {
      baseInfo.textContent = current.filename?.replace(/\.json$/, '').slice(-20) || 'set';
      baseBtn.textContent = 'Compare';
      baseBtn.style.background = '#1e3a5f';
      baseBtn.style.color = '#60a5fa';
      baseBtn.addEventListener('click', async () => {
        baseBtn.textContent = '...';
        try {
          const data = await transport.compareBaseline(pageUrl);
          if (data.diff) {
            const dd = data.diff;
            const parts = [];
            if (dd.added) parts.push(`+${dd.added} added`);
            if (dd.removed) parts.push(`-${dd.removed} removed`);
            if (dd.moved) parts.push(`${dd.moved} moved`);
            if (dd.testidChanges) parts.push(`${dd.testidChanges} testid changes`);
            baseDiff.textContent = parts.length ? parts.join(', ') : 'No structural changes';
            baseDiff.style.display = 'block';
            baseDiff.style.color = parts.length ? COLOR.warning : COLOR.success;
          }
        } catch { /* timeout */ }
        baseBtn.textContent = 'Compare';
      });
    } else {
      baseInfo.textContent = 'none set';
      baseBtn.textContent = 'Set';
      baseBtn.addEventListener('click', async () => {
        baseBtn.textContent = '...';
        try {
          await transport.setBaseline(latest.filename);
          baseInfo.textContent = latest.filename.replace(/\.json$/, '').slice(-20);
          baseBtn.textContent = 'Compare';
          baseBtn.style.background = '#1e3a5f';
          baseBtn.style.color = '#60a5fa';
        } catch { baseBtn.textContent = 'Set'; }
      });
    }
  } catch { baseInfo.textContent = 'unavailable'; }
}
