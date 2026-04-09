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
import { getAnnotations, removeAnnotation, toggleResolved, hideMarkers, stop as stopAnnotate, pause as pauseAnnotate, resume as resumeAnnotate, addPageNote } from './annotate.js';

/**
 * Sync resolved state from the server. Polls /annotations/resolved for the
 * current page URL and updates local annotations that were resolved by Kiro.
 */
async function syncResolved() {
  try {
    const serverUrl = await discoverServer();
    if (!serverUrl) return;
    const pageUrl = encodeURIComponent(location.href);
    const res = await fetch(`${serverUrl}/annotations/resolved?url=${pageUrl}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const { resolved } = await res.json();
    if (!resolved?.length) return;
    const anns = getAnnotations();
    let changed = false;
    for (const { uuid, resolution } of resolved) {
      const ann = anns.find((a) => a.uuid === uuid && !a.resolved);
      if (ann) {
        ann.resolved = true;
        ann.resolution = resolution;
        changed = true;
      }
    }
    if (changed) refresh();
  } catch { /* server offline - no sync */ }
}
import { formatMarkdown } from './export-markdown.js';
import { discoverServer } from './constants.js';

const ATTR = 'data-vg-annotate';
let sidebarEl = null;
let badgeEl = null;
let collapsed = false;
let hasCaptured = false;
let pendingRequests = [];

/**
 * Poll the server for pending Kiro capture requests.
 * Shows them as timeline items so the user can fulfill them.
 */
async function pollRequests() {
  try {
    const serverUrl = await discoverServer();
    if (!serverUrl) return;
    const res = await fetch(`${serverUrl}/requests/pending`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const data = await res.json();
    pendingRequests = data.requests || [];
    refresh();
  } catch { /* server offline */ }
}

/** Create and mount the sidebar. */
export function create() {
  if (sidebarEl) return;

  sidebarEl = document.createElement('div');
  sidebarEl.setAttribute(ATTR, 'sidebar');
  Object.assign(sidebarEl.style, {
    position: 'fixed', top: '60px', right: '0', zIndex: '2147483646',
    width: '300px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
    background: '#1e1e2e', borderLeft: '1px solid #333', borderRadius: '8px 0 0 8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '14px',
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
  toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>ViewGraph: Review Notes';
  Object.assign(toggle.style, {
    flex: '1', padding: '10px', border: 'none',
    background: 'transparent', color: '#a5b4fc', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', textAlign: 'left',
  });
  toggle.addEventListener('click', () => toggleCollapse());

  // Connection status dot in header
  const statusDot = document.createElement('span');
  statusDot.setAttribute(ATTR, 'status-dot');
  Object.assign(statusDot.style, {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#666', flexShrink: '0', transition: 'background 0.3s',
  });
  discoverServer()
    .then((url) => {
      if (url) { statusDot.style.background = '#4ade80'; statusDot.title = `MCP server: ${url}`; }
      else { statusDot.style.background = '#f87171'; statusDot.title = 'MCP server offline'; }
    });

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
    hideMarkers();
    stopAnnotate();
    destroy();
  });

  header.append(toggle, statusDot, collapseBtn, closeBtn);

  const list = document.createElement('div');
  list.setAttribute(ATTR, 'list');

  // Export buttons row
  const exportRow = document.createElement('div');
  exportRow.setAttribute(ATTR, 'export-row');
  Object.assign(exportRow.style, {
    display: 'flex', gap: '4px', margin: '8px', marginTop: '4px',
  });

  const btnStyle = {
    flex: '1', padding: '7px 4px', border: 'none', borderRadius: '6px',
    color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif', transition: 'background 0.12s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
  };

  // Send to Kiro
  const sendBtn = document.createElement('button');
  sendBtn.setAttribute(ATTR, 'send');
  sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Send';
  Object.assign(sendBtn.style, { ...btnStyle, background: '#6366f1' });
  sendBtn.title = 'Send to Kiro';
  sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = '#5558e6'; });
  sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = '#6366f1'; });
  sendBtn.addEventListener('click', () => {
    console.log('[viewgraph] Send clicked, chrome.runtime available:', !!chrome?.runtime?.sendMessage);
    chrome.runtime.sendMessage({ type: 'send-review', includeCapture: hasCaptured }, (response) => {
      console.log('[viewgraph] Send response:', response, 'lastError:', chrome.runtime.lastError?.message);
    });
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Sent!';
    sendBtn.style.background = '#059669';
    setTimeout(() => { sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Send'; sendBtn.style.background = '#6366f1'; }, 2000);
  });

  // Copy Markdown
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'copy-md');
  copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Copy MD';
  Object.assign(copyBtn.style, { ...btnStyle, background: '#374151' });
  copyBtn.title = 'Copy as Markdown';
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = '#4b5563'; });
  copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = '#374151'; });
  copyBtn.addEventListener('click', () => {
    const meta = { title: document.title, url: location.href, timestamp: new Date().toISOString(), viewport: { width: window.innerWidth, height: window.innerHeight }, browser: navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+/)?.[0] || 'Unknown' };
    const md = formatMarkdown(getAnnotations(), meta);
    navigator.clipboard.writeText(md).then(() => {
      copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!';
      copyBtn.style.background = '#059669';
      setTimeout(() => { copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Copy MD'; copyBtn.style.background = '#374151'; }, 2000);
    });
  });

  // Download Report
  const dlBtn = document.createElement('button');
  dlBtn.setAttribute(ATTR, 'download');
  dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Report';
  Object.assign(dlBtn.style, { ...btnStyle, background: '#374151' });
  dlBtn.title = 'Download Report (Markdown + Screenshots)';
  dlBtn.addEventListener('mouseenter', () => { dlBtn.style.background = '#4b5563'; });
  dlBtn.addEventListener('mouseleave', () => { dlBtn.style.background = '#374151'; });
  dlBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'download-report' });
    dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Saving...';
    dlBtn.style.background = '#059669';
    setTimeout(() => { dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Report'; dlBtn.style.background = '#374151'; }, 2000);
  });

  exportRow.append(sendBtn, copyBtn, dlBtn);

  // Action row: Note button
  const actionRow = document.createElement('div');
  actionRow.setAttribute(ATTR, 'action-row');
  Object.assign(actionRow.style, {
    display: 'flex', gap: '4px', margin: '8px 8px 4px',
  });

  const noteBtn = document.createElement('button');
  noteBtn.setAttribute(ATTR, 'note');
  noteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Note';
  Object.assign(noteBtn.style, { ...btnStyle, background: '#374151', flex: '1' });
  noteBtn.title = 'Add a page-level note (no element reference)';
  noteBtn.addEventListener('mouseenter', () => { noteBtn.style.background = '#4b5563'; });
  noteBtn.addEventListener('mouseleave', () => { noteBtn.style.background = '#374151'; });
  noteBtn.addEventListener('click', () => {
    const ann = addPageNote();
    showPanel(ann, { onChange: () => refresh() });
    refresh();
  });

  // Capture button - explicit DOM snapshot
  const captureBtn = document.createElement('button');
  captureBtn.setAttribute(ATTR, 'capture');
  captureBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>Capture';
  Object.assign(captureBtn.style, { ...btnStyle, background: '#374151', flex: '1' });
  captureBtn.title = 'Take a DOM snapshot of the current page';
  captureBtn.addEventListener('mouseenter', () => { captureBtn.style.background = '#4b5563'; });
  captureBtn.addEventListener('mouseleave', () => { captureBtn.style.background = '#374151'; });
  captureBtn.addEventListener('click', () => {
    captureBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>...';
    chrome.runtime.sendMessage({ type: 'capture' }, (response) => {
      if (response?.ok) {
        hasCaptured = true;
        captureBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Done';
        captureBtn.style.background = '#059669';
      } else {
        captureBtn.innerHTML = 'Failed';
        captureBtn.style.background = '#dc2626';
      }
      setTimeout(() => {
        captureBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>Capture';
        captureBtn.style.background = '#374151';
      }, 2000);
    });
  });

  actionRow.append(captureBtn, noteBtn);

  sidebarEl.append(header, list, actionRow, exportRow);

  // Collapsible Settings section
  const settingsSection = document.createElement('div');
  settingsSection.setAttribute(ATTR, 'settings');
  const settingsHeader = document.createElement('div');
  settingsHeader.textContent = '\u25b8 Settings';
  Object.assign(settingsHeader.style, {
    padding: '6px 12px', color: '#666', fontSize: '11px', fontWeight: '600',
    borderTop: '1px solid #2a2a3a', cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  });
  const settingsBody = document.createElement('div');
  settingsBody.style.display = 'none';
  Object.assign(settingsBody.style, { padding: '8px 12px', fontSize: '11px', color: '#9ca3af' });

  // Server status line (populated async)
  const serverLine = document.createElement('div');
  serverLine.textContent = 'Server: checking...';
  Object.assign(serverLine.style, { marginBottom: '6px' });
  discoverServer().then((url) => {
    if (url) {
      const port = new URL(url).port;
      serverLine.innerHTML = `<span style="color:#4ade80">\u25cf</span> Connected (localhost:${port})`;
    } else {
      serverLine.innerHTML = '<span style="color:#f87171">\u25cf</span> MCP server offline';
    }
  });

  // Options link
  const optionsLink = document.createElement('a');
  optionsLink.textContent = 'Project mappings & auth \u2192';
  optionsLink.href = '#';
  Object.assign(optionsLink.style, { color: '#a5b4fc', textDecoration: 'none', display: 'block', marginTop: '4px' });
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: 'open-options' });
  });

  settingsBody.append(serverLine, optionsLink);
  settingsHeader.addEventListener('click', () => {
    const open = settingsBody.style.display === 'none';
    settingsBody.style.display = open ? 'block' : 'none';
    settingsHeader.textContent = `${open ? '\u25be' : '\u25b8'} Settings`;
  });
  settingsSection.append(settingsHeader, settingsBody);

  sidebarEl.append(header, list, actionRow, exportRow, settingsSection);
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
  syncResolved();
  pollRequests();
}

function toggleCollapse() {
  collapsed = !collapsed;
  if (collapsed) {
    sidebarEl.style.transform = 'translateX(100%)';
    badgeEl.style.display = 'flex';
    updateBadgeCount();
    pauseAnnotate();
  } else {
    sidebarEl.style.transform = 'translateX(0)';
    badgeEl.style.display = 'none';
    resumeAnnotate();
  }
}

function updateBadgeCount() {
  if (!badgeEl) return;
  const count = getAnnotations().length;
  // Large chat bubble with count centered inside
  badgeEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px"><svg style="position:absolute;top:0;left:0" width="40" height="40" viewBox="0 0 24 24" fill="#6366f1" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span style="position:relative;margin-top:-6px;color:#fff;font-size:14px;font-weight:700;z-index:1">${count}</span></span>`;
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
    hint.textContent = 'Click an element or shift+drag to annotate';
    Object.assign(hint.style, {
      padding: '16px 12px', color: '#666', fontSize: '13px',
      textAlign: 'center', fontStyle: 'italic',
    });
    list.appendChild(hint);
    return;
  }

  // Sort: open items first (by timestamp desc), then resolved
  const open = anns.filter((a) => !a.resolved);
  const resolved = anns.filter((a) => a.resolved);

  // Kiro capture requests - shown at top of timeline
  if (pendingRequests.length > 0) {
    const reqHeader = document.createElement('div');
    reqHeader.textContent = `Kiro Requests (${pendingRequests.length})`;
    Object.assign(reqHeader.style, {
      padding: '6px 12px', color: '#f59e0b', fontSize: '11px', fontWeight: '600',
      borderBottom: '1px solid #2a2a3a', fontFamily: 'system-ui, sans-serif',
    });
    list.appendChild(reqHeader);

    for (const req of pendingRequests) {
      const entry = document.createElement('div');
      Object.assign(entry.style, {
        padding: '8px 12px', borderBottom: '1px solid #2a2a3a',
        display: 'flex', alignItems: 'center', gap: '6px',
      });

      // Bell icon
      const bell = document.createElement('span');
      bell.textContent = '\ud83d\udd14';
      Object.assign(bell.style, { fontSize: '14px', flexShrink: '0' });

      // Request info
      const info = document.createElement('span');
      Object.assign(info.style, { flex: '1', fontSize: '12px', color: '#e0e0e0', overflow: 'hidden' });
      const urlText = document.createElement('div');
      urlText.textContent = req.url;
      Object.assign(urlText.style, { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' });
      info.appendChild(urlText);
      if (req.guidance) {
        const guide = document.createElement('div');
        guide.textContent = req.guidance;
        Object.assign(guide.style, { color: '#9ca3af', fontSize: '11px', marginTop: '2px' });
        info.appendChild(guide);
      }

      // Capture Now button
      const capBtn = document.createElement('button');
      capBtn.textContent = 'Capture';
      Object.assign(capBtn.style, {
        padding: '3px 8px', border: 'none', borderRadius: '4px',
        background: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: '600',
        cursor: 'pointer', flexShrink: '0', fontFamily: 'system-ui, sans-serif',
      });
      capBtn.addEventListener('click', () => {
        capBtn.textContent = '...';
        // Acknowledge the request, then trigger capture
        (async () => {
          try {
            const serverUrl = await discoverServer();
            if (serverUrl) await fetch(`${serverUrl}/requests/${req.id}/ack`, { method: 'POST' });
          } catch { /* best effort */ }
          chrome.runtime.sendMessage({ type: 'capture' }, () => {
            capBtn.textContent = '\u2713';
            capBtn.style.background = '#4ade80';
            // Remove from pending after capture
            pendingRequests = pendingRequests.filter((r) => r.id !== req.id);
            setTimeout(() => refresh(), 1000);
          });
        })();
      });

      entry.append(bell, info, capBtn);
      list.appendChild(entry);
    }
  }

  // Open items count header
  if (open.length > 0) {
    const openHeader = document.createElement('div');
    openHeader.textContent = `Open (${open.length})`;
    Object.assign(openHeader.style, {
      padding: '6px 12px', color: '#a5b4fc', fontSize: '11px', fontWeight: '600',
      borderBottom: '1px solid #2a2a3a', fontFamily: 'system-ui, sans-serif',
    });
    list.appendChild(openHeader);
  }

  for (const ann of open) {
    list.appendChild(createEntry(ann));
  }

  // Resolved accordion
  if (resolved.length > 0) {
    const accordion = document.createElement('div');
    const accordionHeader = document.createElement('div');
    accordionHeader.textContent = `\u25b8 Resolved (${resolved.length})`;
    Object.assign(accordionHeader.style, {
      padding: '6px 12px', color: '#666', fontSize: '11px', fontWeight: '600',
      borderTop: '1px solid #2a2a3a', cursor: 'pointer',
      fontFamily: 'system-ui, sans-serif',
    });
    const accordionList = document.createElement('div');
    accordionList.style.display = 'none';
    accordionHeader.addEventListener('click', () => {
      const open = accordionList.style.display === 'none';
      accordionList.style.display = open ? 'block' : 'none';
      accordionHeader.textContent = `${open ? '\u25be' : '\u25b8'} Resolved (${resolved.length})`;
    });
    for (const ann of resolved) {
      accordionList.appendChild(createEntry(ann));
    }
    accordion.append(accordionHeader, accordionList);
    list.appendChild(accordion);
  }

  /** Severity/category chip colors. */
  const CHIP_COLORS = {
    critical: '#dc2626', major: '#f59e0b', minor: '#6b7280',
    visual: '#6366f1', functional: '#0ea5e9', content: '#8b5cf6',
    a11y: '#10b981', performance: '#f97316',
  };

  /** Create a single timeline entry for an annotation. */
  function createEntry(ann) {
    const entry = document.createElement('div');
    entry.setAttribute(ATTR, 'entry');
    Object.assign(entry.style, {
      padding: '8px 12px', borderBottom: '1px solid #2a2a3a',
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', transition: 'background 0.1s',
    });
    entry.addEventListener('mouseenter', () => {
      entry.style.background = '#22223a';
      entry._expandTimer = setTimeout(() => {
        label.style.whiteSpace = 'normal';
        label.style.maxHeight = '120px';
      }, 600);
    });
    entry.addEventListener('mouseleave', () => {
      entry.style.background = 'transparent';
      clearTimeout(entry._expandTimer);
      label.style.whiteSpace = 'nowrap';
      label.style.maxHeight = '20px';
    });

    const label = document.createElement('span');
    Object.assign(label.style, {
      color: ann.resolved ? '#666' : '#c8c8d0', overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1',
      maxHeight: '20px', transition: 'max-height 0.25s ease, white-space 0s',
    });

    // Number badge or page-note icon
    const numBadge = document.createElement('span');
    if (ann.type === 'page-note') {
      numBadge.textContent = '\ud83d\udcdd';
      Object.assign(numBadge.style, { marginRight: '4px', fontSize: '12px' });
    } else {
      numBadge.textContent = `#${ann.id}`;
      Object.assign(numBadge.style, {
        background: '#6366f1', color: '#fff', fontSize: '10px', fontWeight: '700',
        padding: '1px 4px', borderRadius: '3px', marginRight: '4px',
        fontFamily: 'system-ui, sans-serif',
      });
    }
    label.appendChild(numBadge);

    // Severity chip
    if (ann.severity) {
      const sev = document.createElement('span');
      sev.textContent = ann.severity.charAt(0).toUpperCase() + ann.severity.slice(1);
      Object.assign(sev.style, {
        background: CHIP_COLORS[ann.severity] || '#555', color: '#fff',
        fontSize: '9px', fontWeight: '600', padding: '1px 4px', borderRadius: '8px',
        marginRight: '3px', fontFamily: 'system-ui, sans-serif',
      });
      label.appendChild(sev);
    }

    // Category chip
    if (ann.category) {
      const cat = document.createElement('span');
      cat.textContent = ann.category.charAt(0).toUpperCase() + ann.category.slice(1);
      Object.assign(cat.style, {
        background: CHIP_COLORS[ann.category] || '#555', color: '#fff',
        fontSize: '9px', fontWeight: '600', padding: '1px 4px', borderRadius: '8px',
        marginRight: '3px', fontFamily: 'system-ui, sans-serif',
      });
      label.appendChild(cat);
    }

    // Ancestor element badge
    if (ann.ancestor) {
      const elBadge = document.createElement('span');
      elBadge.textContent = ann.ancestor;
      Object.assign(elBadge.style, {
        background: '#2a2a4a', color: '#93c5fd', fontSize: '10px', fontWeight: '500',
        padding: '1px 4px', borderRadius: '3px', marginRight: '4px',
        fontFamily: 'SF Mono, Cascadia Code, monospace',
      });
      label.appendChild(elBadge);
    }

    const commentText = document.createElement('span');
    commentText.textContent = ann.comment || '(no comment)';
    if (ann.resolved) Object.assign(commentText.style, { textDecoration: 'line-through' });
    label.appendChild(commentText);

    // Resolution details for resolved items
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
    }

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
    return entry;
  }

  updateBadgeCount();

  // Disable export buttons when no annotations
  const hasNotes = anns.length > 0;
  sidebarEl.querySelectorAll(`[${ATTR}="send"], [${ATTR}="copy-md"], [${ATTR}="download"]`).forEach((btn) => {
    btn.disabled = !hasNotes;
    btn.style.opacity = hasNotes ? '1' : '0.4';
    btn.style.cursor = hasNotes ? 'pointer' : 'default';
  });
}

/** Remove the sidebar from the DOM. */
export function destroy() {
  if (sidebarEl) { sidebarEl.remove(); sidebarEl = null; }
  if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  collapsed = false;
  hasCaptured = false;
  pendingRequests = [];
}
