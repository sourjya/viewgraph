/**
 * Sidebar Captures Section
 *
 * Fetches capture list and baseline status from the server.
 * Renders in the Inspect tab below diagnostics and toggles.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '../selector.js';
import { discoverServer } from '../constants.js';

/**
 * Fetch captures and baselines from server, render into container.
 * @param {HTMLElement} container - The inspect tab content element
 */
export async function renderCaptures(container) {
  const serverUrl = await discoverServer(window.location.href);
  if (!serverUrl) return;
  const pageUrl = location.href;

  let captures = [];
  try {
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const listRes = await fetch(`${serverUrl}/captures?url=${encodeURIComponent(pageUrl)}`, { signal: AbortSignal.timeout(3000) });
    if (listRes.ok) captures = (await listRes.json()).captures || [];
  } catch { return; }

  if (captures.length === 0) return;

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
  Object.assign(label.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' });
  const info = document.createElement('span');
  info.textContent = `${captures.length} - ${timeStr}`;
  info.setAttribute(ATTR, 'capture-info');
  Object.assign(info.style, { color: '#666', fontSize: '11px', flex: '1' });
  const dot = document.createElement('span');
  const isRecent = d && (now - d.getTime()) < 300000;
  Object.assign(dot.style, { width: '6px', height: '6px', borderRadius: '50%', flexShrink: '0', background: isRecent ? '#4ade80' : '#444' });
  row.append(label, info, dot);
  container.appendChild(row);

  // Capture ID row
  const idRow = document.createElement('div');
  idRow.setAttribute(ATTR, 'capture-id-row');
  Object.assign(idRow.style, { display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' });
  const idText = document.createElement('span');
  idText.textContent = latest.filename.replace(/\.json$/, '');
  idText.setAttribute(ATTR, 'capture-id');
  Object.assign(idText.style, { color: '#6366f1', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1' });
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'copy-id');
  copyBtn.textContent = 'Copy';
  copyBtn.title = 'Copy capture ID';
  Object.assign(copyBtn.style, { border: 'none', background: '#1a1a2e', color: '#666', fontSize: '10px', padding: '1px 6px', borderRadius: '3px', cursor: 'pointer', flexShrink: '0', fontFamily: 'system-ui, sans-serif' });
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(latest.filename).then(() => {
      copyBtn.textContent = 'Copied';
      copyBtn.style.color = '#4ade80';
      setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.style.color = '#666'; }, 1500);
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
    Object.assign(titleEl.style, { color: '#555', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    container.appendChild(titleEl);
  }

  // Empty capture warning
  if ((latest.nodeCount || 0) === 0) {
    const warn = document.createElement('div');
    warn.setAttribute(ATTR, 'capture-warning');
    warn.textContent = '\u26a0 Latest capture is empty - page may not have loaded';
    Object.assign(warn.style, { color: '#f59e0b', fontSize: '10px', fontWeight: '600', padding: '2px 0' });
    container.appendChild(warn);
  }

  // Baseline section
  const baseRow = document.createElement('div');
  baseRow.setAttribute(ATTR, 'baseline-row');
  Object.assign(baseRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderTop: '1px solid #2a2a3a', marginTop: '4px' });
  const baseLabel = document.createElement('span');
  baseLabel.textContent = 'BASELINE';
  Object.assign(baseLabel.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' });
  const baseInfo = document.createElement('span');
  baseInfo.setAttribute(ATTR, 'baseline-info');
  Object.assign(baseInfo.style, { color: '#666', fontSize: '11px', flex: '1' });
  const baseBtn = document.createElement('button');
  baseBtn.setAttribute(ATTR, 'baseline-btn');
  Object.assign(baseBtn.style, { border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', background: '#333', color: '#666' });
  baseRow.append(baseLabel, baseInfo, baseBtn);
  container.appendChild(baseRow);

  const baseDiff = document.createElement('div');
  baseDiff.setAttribute(ATTR, 'baseline-diff');
  Object.assign(baseDiff.style, { display: 'none', fontSize: '10px', color: '#9ca3af', padding: '2px 0' });
  container.appendChild(baseDiff);

  // Fetch baseline status
  try {
    const baseRes = await fetch(`${serverUrl}/baselines?url=${encodeURIComponent(pageUrl)}`, { signal: AbortSignal.timeout(3000) });
    if (baseRes.ok) {
      const { baselines } = await baseRes.json();
      const current = baselines?.[0];
      if (current) {
        baseInfo.textContent = current.filename?.replace(/\.json$/, '').slice(-20) || 'set';
        baseBtn.textContent = 'Compare';
        baseBtn.style.background = '#1e3a5f';
        baseBtn.style.color = '#60a5fa';
        baseBtn.addEventListener('click', async () => {
          baseBtn.textContent = '...';
          try {
            const cmpRes = await fetch(`${serverUrl}/baselines/compare?url=${encodeURIComponent(pageUrl)}`, { signal: AbortSignal.timeout(5000) });
            if (cmpRes.ok) {
              const data = await cmpRes.json();
              if (data.diff) {
                const dd = data.diff;
                const parts = [];
                if (dd.added) parts.push(`+${dd.added} added`);
                if (dd.removed) parts.push(`-${dd.removed} removed`);
                if (dd.moved) parts.push(`${dd.moved} moved`);
                if (dd.testidChanges) parts.push(`${dd.testidChanges} testid changes`);
                baseDiff.textContent = parts.length ? parts.join(', ') : 'No structural changes';
                baseDiff.style.display = 'block';
                baseDiff.style.color = parts.length ? '#f59e0b' : '#4ade80';
              }
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
            await fetch(`${serverUrl}/baselines`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: latest.filename }),
              signal: AbortSignal.timeout(3000),
            });
            baseInfo.textContent = latest.filename.replace(/\.json$/, '').slice(-20);
            baseBtn.textContent = 'Compare';
            baseBtn.style.background = '#1e3a5f';
            baseBtn.style.color = '#60a5fa';
          } catch { baseBtn.textContent = 'Set'; }
        });
      }
    }
  } catch { baseInfo.textContent = 'unavailable'; }
}
