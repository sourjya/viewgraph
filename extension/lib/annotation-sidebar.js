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

import { show as showPanel, hide as hidePanel } from './annotation-panel.js';
import { getAnnotations, removeAnnotation, resolveAnnotation, hideMarkers, stop as stopAnnotate, setCaptureMode, getCaptureMode, CAPTURE_MODES, addPageNote, clearAnnotations, save, spotlightMarker, MARKER_COLORS, updateSeverity, updateComment } from './annotate.js';
import { resolveType, getBadgeColor, getBadgeIcon, getFilterIcon } from './annotation-types.js';
import { createHelpCard } from './sidebar/help.js';
import { createStrip } from './sidebar/strip.js';
import { syncResolved, startResolutionPolling, stopResolutionPolling, startRequestPolling, stopRequestPolling, pollRequests } from './sidebar/sync.js';
import { EVENTS, createEventBus } from './sidebar/events.js';
import { KEYS, get as storageGet, set as storageSet } from './storage.js';
import { groupRequests, smartPath } from './network-grouper.js';
import { formatMarkdown } from './export/export-markdown.js';
import { discoverServer, getAgentName, fetchConfig, updateConfig } from './constants.js';
import { collectNetworkState } from './collectors/network-collector.js';
import { getConsoleState } from './collectors/console-collector.js';
import { collectBreakpoints } from './collectors/breakpoint-collector.js';
import { collectStackingContexts } from './collectors/stacking-collector.js';
import { collectFocusChain } from './collectors/focus-collector.js';
import { collectScrollContainers } from './collectors/scroll-collector.js';
import { collectLandmarks } from './collectors/landmark-collector.js';
import { collectComponents } from './collectors/component-collector.js';
import { checkRendered } from './collectors/visibility-collector.js';
import { startWatcher, stopWatcher, isWatcherEnabled } from './session/continuous-capture.js';
import { isRecording, startSession, stopSession, getState } from './session/session-manager.js';
import { startJourney, stopJourney } from './session/journey-recorder.js';
import { startShortcuts, stopShortcuts } from './ui/keyboard-shortcuts.js';
import { connect as wsConnect, disconnect as wsDisconnect } from './ws-client.js';
import { WS_MESSAGES } from './ws-message-types.js';
import { ATTR } from './selector.js';

// ──────────────────────────────────────────────
// Module State
// ──────────────────────────────────────────────

let sidebarEl = null;
let hostEl = null;
let collapsed = false;
let badgeEl = null;
let _strip = null;
let _bus = null; // Event bus for inter-module communication
let _hasCaptured = false;
let pendingRequests = [];
let activeFilter = 'open';
let activeTypeFilters = new Set(['element', 'region', 'page-note', 'idea', 'diagnostic']);
let bellBtn = null;

/** Create and mount the sidebar. */
export function create() {
  if (sidebarEl) return;

  sidebarEl = document.createElement('div');
  sidebarEl.setAttribute(ATTR, 'sidebar');
  Object.assign(sidebarEl.style, {
    all: 'initial',
    position: 'fixed', top: '60px', right: '0', zIndex: '2147483646',
    width: '300px', height: 'calc(100vh - 120px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    background: '#1e1e2e', borderLeft: '1px solid #333', borderRadius: '8px 0 0 8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '14px',
    boxShadow: '-2px 0 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
    boxSizing: 'border-box', color: '#e0e0e0',
  });

  // Header row: toggle label + collapse chevron + close button
  const header = document.createElement('div');
  header.setAttribute(ATTR, 'header');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', borderBottom: '1px solid #333',
    padding: '2px 0',
  });

  const toggle = document.createElement('button');
  toggle.setAttribute(ATTR, 'toggle');
  // VG icon from extension assets + label + connection dot inline
  const vgIcon = document.createElement('img');
  vgIcon.src = chrome.runtime.getURL('icon-16.png');
  vgIcon.width = 16;
  vgIcon.height = 16;
  Object.assign(vgIcon.style, { verticalAlign: 'middle', marginRight: '6px' });
  toggle.appendChild(vgIcon);
  toggle.appendChild(document.createTextNode('ViewGraph'));
  Object.assign(toggle.style, {
    flex: '1', padding: '10px', border: 'none',
    background: 'transparent', color: '#a5b4fc', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
  });
  toggle.addEventListener('click', () => toggleCollapse());

  // Connection status dot - inline after ViewGraph label
  const statusDot = document.createElement('span');
  statusDot.setAttribute(ATTR, 'status-dot');
  Object.assign(statusDot.style, {
    width: '7px', height: '7px', borderRadius: '50%',
    background: '#666', flexShrink: '0', transition: 'background 0.3s',
    marginLeft: '6px',
  });

  // Status banner - shown between primary tabs and content when disconnected
  const statusBanner = document.createElement('div');
  statusBanner.setAttribute(ATTR, 'status-banner');
  Object.assign(statusBanner.style, {
    display: 'none', padding: '6px 12px', fontSize: '11px',
    fontFamily: 'system-ui, sans-serif', color: '#f59e0b',
    background: '#2a2a1a', borderBottom: '1px solid #333',
    flexShrink: '0',
  });

  discoverServer(window.location.href)
    .then(async (url) => {
      if (url) {
        statusDot.style.background = '#4ade80';
        statusDot.title = `MCP server: ${url}`;
        statusBanner.style.display = 'none';
        // Fetch project config and cache locally
        await fetchConfig(url);
        // Check version mismatch - only warn if extension is older than server (dev builds)
        try {
          const info = await fetch(`${url}/info`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json());
          const extVersion = chrome.runtime.getManifest?.()?.version;
          if (info.serverVersion && extVersion && extVersion < info.serverVersion) {
            statusBanner.textContent = `Extension v${extVersion} is behind server v${info.serverVersion}. Rebuild: npm run build:ext`;
            statusBanner.style.display = 'block';
            statusBanner.style.color = '#f59e0b';
          }
        } catch { /* info fetch failed - skip version check */ }
      } else {
        statusDot.style.background = '#f87171';
        statusDot.title = 'MCP server offline';
        statusBanner.textContent = 'No project connected. Copy MD and Report available.';
        statusBanner.style.display = 'block';
        // Adaptive footer: hide Send, promote Copy MD and Report to primary
        sendBtn.style.display = 'none';
        Object.assign(copyBtn.style, { background: '#6366f1', color: '#fff', border: 'none', flex: '1' });
        Object.assign(dlBtn.style, { background: '#374151', color: '#fff', border: 'none', flex: '1' });
      }
    });

  // Collapse chevron
  const collapseBtn = document.createElement('button');
  collapseBtn.setAttribute(ATTR, 'btn');
  collapseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  collapseBtn.title = 'Collapse panel';
  Object.assign(collapseBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
  });
  collapseBtn.addEventListener('mouseenter', () => { collapseBtn.style.background = 'rgba(255,255,255,0.06)'; });
  collapseBtn.addEventListener('mouseleave', () => { collapseBtn.style.background = 'transparent'; });
  collapseBtn.addEventListener('click', () => toggleCollapse());

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute(ATTR, 'close');
  closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  Object.assign(closeBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
  });
  closeBtn.title = 'Close review mode';
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.05)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
  closeBtn.addEventListener('click', () => {
    hideMarkers();
    stopAnnotate();
    destroy();
  });

  // Notification bell - pulses when agent requests are pending
  bellBtn = document.createElement('button');
  bellBtn.setAttribute(ATTR, 'bell');
  bellBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
  bellBtn.title = 'Agent requests';
  Object.assign(bellBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '8px', display: 'none', alignItems: 'center', borderRadius: '6px',
    color: '#f59e0b', position: 'relative',
  });
  bellBtn.addEventListener('mouseenter', () => { bellBtn.style.background = 'rgba(255,255,255,0.06)'; });
  bellBtn.addEventListener('mouseleave', () => { bellBtn.style.background = 'transparent'; });
  bellBtn.addEventListener('click', () => {
    // Switch to Review tab where request cards are shown
    if (typeof switchTab === 'function') switchTab('review');
  });

  // Dot goes inside toggle, after the label text
  toggle.appendChild(statusDot);

  header.append(toggle, bellBtn, collapseBtn, closeBtn);

  // Help button in header - opens slide-down help card
  const helpBtn = document.createElement('button');
  helpBtn.setAttribute(ATTR, 'help-btn');
  helpBtn.innerHTML = '?';
  helpBtn.title = 'Help & keyboard shortcuts';
  Object.assign(helpBtn.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '4px 8px', display: 'flex', alignItems: 'center', borderRadius: '6px',
    color: '#666', fontSize: '14px', fontWeight: '700', fontFamily: 'system-ui, sans-serif',
  });
  helpBtn.addEventListener('mouseenter', () => { helpBtn.style.background = 'rgba(255,255,255,0.06)'; });
  helpBtn.addEventListener('mouseleave', () => { helpBtn.style.background = 'transparent'; });
  helpBtn.addEventListener('click', () => help.toggle());
  header.insertBefore(helpBtn, collapseBtn);

  // Help card - extracted to sidebar/help.js
  const help = createHelpCard();
  const helpCard = help.element;

  const list = document.createElement('div');
  list.setAttribute(ATTR, 'list');
  Object.assign(list.style, { flex: '1', overflowY: 'auto', minHeight: '0' });

  // Tab bar container - pinned between header and scrollable list
  const tabContainer = document.createElement('div');
  tabContainer.setAttribute(ATTR, 'tab-container');
  Object.assign(tabContainer.style, { flexShrink: '0' });

  // Capture mode buttons: Element | Region | Page
  const modeBar = document.createElement('div');
  modeBar.setAttribute(ATTR, 'mode-bar');
  Object.assign(modeBar.style, {
    display: 'flex', gap: '4px', padding: '6px 8px',
    borderBottom: '1px solid #2a2a3a', flexShrink: '0',
  });

  // SVG icons for each mode
  const MODE_ICONS = {
    element: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
    region: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/></svg>',
    page: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  };

  const modeButtons = {};
  const MODE_HINTS = {
    element: 'Click to select',
    region: 'Shift+drag area',
    page: 'Add a page note',
  };
  for (const [key, icon] of Object.entries(MODE_ICONS)) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, `mode-${key}`);
    btn.innerHTML = `${icon}<span style="font-size:10px;margin-top:2px">${key.charAt(0).toUpperCase() + key.slice(1)}</span><span style="font-size:8px;color:#666;margin-top:1px">${MODE_HINTS[key]}</span>`;
    Object.assign(btn.style, {
      flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '2px', padding: '6px 4px', border: '1px solid #333', borderRadius: '6px',
      background: 'transparent', color: '#9ca3af', cursor: 'pointer',
      fontSize: '11px', fontFamily: 'system-ui, sans-serif', transition: 'all 0.15s',
    });
    btn.addEventListener('click', () => {
      if (key === 'page') {
        const ann = addPageNote();
        refresh();
        showPanel(ann, { onChange: () => refresh() });
        return;
      }
      const mode = CAPTURE_MODES[key.toUpperCase()];
      const wasActive = getCaptureMode() === mode;
      setCaptureMode(mode);
      updateModeButtons();
      if (!wasActive) {
        // Entering capture mode - collapse sidebar for full page access
        collapse();
      } else {
        // Toggling off - expand sidebar
        expand();
      }
    });
    modeButtons[key] = btn;
    modeBar.appendChild(btn);
  }

  /** Sync mode button active states. */
  function updateModeButtons() {
    const current = getCaptureMode();
    for (const [key, btn] of Object.entries(modeButtons)) {
      const isActive = current === key;
      btn.style.background = isActive ? '#6366f1' : 'transparent';
      btn.style.color = isActive ? '#fff' : '#9ca3af';
      btn.style.borderColor = isActive ? '#6366f1' : '#333';
    }
  }

  // Footer container - holds all footer rows
  const footer = document.createElement('div');
  footer.setAttribute(ATTR, 'footer');
  Object.assign(footer.style, { borderTop: '1px solid #2a2a3a', padding: '6px 8px', flexShrink: '0' });

  const btnStyle = {
    padding: '7px 4px', border: 'none', borderRadius: '6px',
    color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif', transition: 'background 0.12s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
  };

  // Row 1: Creation actions [Capture] [Note]
  // Row 1: Primary CTA - Send to Agent (full width)
  const sendBtn = document.createElement('button');
  sendBtn.setAttribute(ATTR, 'send');
  sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Send to Agent';
  Object.assign(sendBtn.style, { ...btnStyle, background: '#6366f1', width: '100%', padding: '9px 4px', marginBottom: '4px' });
  sendBtn.title = 'Send annotations to your AI coding agent via MCP';
  sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = '#5558e6'; });
  sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = '#6366f1'; });
  sendBtn.addEventListener('click', () => {
    // Read session note from input if recording
    const noteInput = hostEl?.shadowRoot?.querySelector(`[${ATTR}="session-note"]`);
    const sessionNote = noteInput?.value?.trim() || undefined;
    if (noteInput) noteInput.value = '';
    chrome.runtime.sendMessage({ type: 'send-review', includeCapture: true, includeSnapshot: true, sessionNote }, () => {});
    // Mark unresolved annotations as pending (visual feedback while agent works)
    for (const ann of getAnnotations()) {
      if (!ann.resolved) ann.pending = true;
    }
    refresh();
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Sent!';
    sendBtn.style.background = '#059669';
    setTimeout(() => { sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Send to Agent'; sendBtn.style.background = '#6366f1'; }, 2000);
  });

  // Copy Markdown
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'copy-md');
  copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Copy MD';
  Object.assign(copyBtn.style, { ...btnStyle, background: '#374151' });
  copyBtn.title = 'Copy as Markdown';
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = 'rgba(255,255,255,0.05)'; });
  copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = 'transparent'; });
  copyBtn.addEventListener('click', () => {
    const meta = { title: document.title, url: location.href, timestamp: new Date().toISOString(), viewport: { width: window.innerWidth, height: window.innerHeight }, browser: navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+/)?.[0] || 'Unknown' };
    const enrichment = { network: collectNetworkState(), console: getConsoleState(), breakpoints: collectBreakpoints(), stacking: collectStackingContexts(), focus: collectFocusChain(), scroll: collectScrollContainers(), landmarks: collectLandmarks(), components: collectComponents() };
    const md = formatMarkdown(getAnnotations(), meta, { enrichment });
    navigator.clipboard.writeText(md).then(() => {
      copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!';
      copyBtn.style.background = '#059669';
      setTimeout(() => { copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Copy MD'; copyBtn.style.background = 'transparent'; }, 2000);
    });
  });

  // Download Report
  const dlBtn = document.createElement('button');
  dlBtn.setAttribute(ATTR, 'download');
  dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Report';
  Object.assign(dlBtn.style, { ...btnStyle, background: '#374151' });
  dlBtn.title = 'Download Report (Markdown + Screenshots)';
  dlBtn.addEventListener('mouseenter', () => { dlBtn.style.background = 'rgba(255,255,255,0.05)'; });
  dlBtn.addEventListener('mouseleave', () => { dlBtn.style.background = 'transparent'; });
  dlBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'download-report' });
    dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Saved!';
    dlBtn.style.background = '#059669';
    setTimeout(() => { dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Report'; dlBtn.style.background = 'transparent'; }, 2000);
  });

  // Row 3: Secondary exports [Copy MD] [Report]
  const secondaryRow = document.createElement('div');
  Object.assign(secondaryRow.style, { display: 'flex', gap: '4px', alignItems: 'center' });
  Object.assign(copyBtn.style, { ...btnStyle, background: 'transparent', color: '#9ca3af', flex: '1', border: '1px solid #333' });
  Object.assign(dlBtn.style, { ...btnStyle, background: 'transparent', color: '#9ca3af', flex: '1', border: '1px solid #333' });

  secondaryRow.append(copyBtn, dlBtn);

  // Settings link in footer
  const settingsLink = document.createElement('button');
  settingsLink.setAttribute(ATTR, 'settings-link');
  settingsLink.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> Settings';
  Object.assign(settingsLink.style, {
    border: 'none', background: 'transparent', cursor: 'pointer',
    color: '#666', fontSize: '11px', fontFamily: 'system-ui, sans-serif',
    padding: '6px 0', display: 'flex', alignItems: 'center', gap: '5px',
    width: '100%', justifyContent: 'center', marginTop: '4px',
  });
  settingsLink.addEventListener('mouseenter', () => { settingsLink.style.color = '#9ca3af'; });
  settingsLink.addEventListener('mouseleave', () => { settingsLink.style.color = '#555'; });
  settingsLink.addEventListener('click', () => showSettings());

  footer.append(sendBtn, secondaryRow, settingsLink);

  // Settings screen - alternate view replacing the list
  const settingsScreen = document.createElement('div');
  settingsScreen.setAttribute(ATTR, 'settings-screen');
  Object.assign(settingsScreen.style, {
    display: 'none', padding: '0',
    position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
    background: '#1e1e2e', zIndex: '10', overflowY: 'auto',
  });

  // Settings header with back arrow
  const settingsHeader = document.createElement('div');
  Object.assign(settingsHeader.style, {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 12px', borderBottom: '1px solid #333',
  });
  const backBtn = document.createElement('button');
  backBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  Object.assign(backBtn.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', display: 'flex' });
  backBtn.addEventListener('click', () => hideSettings());
  const settingsTitle = document.createElement('span');
  settingsTitle.textContent = 'Settings';
  Object.assign(settingsTitle.style, { color: '#a5b4fc', fontSize: '14px', fontWeight: '600' });
  settingsHeader.append(backBtn, settingsTitle);

  // Settings body
  const settingsBody = document.createElement('div');
  Object.assign(settingsBody.style, { padding: '12px', fontSize: '12px', color: '#9ca3af' });

  const serverLine = document.createElement('div');
  serverLine.textContent = 'Server: checking...';
  Object.assign(serverLine.style, { marginBottom: '6px' });

  // Version info - highlighted box
  const versionLine = document.createElement('div');
  const extVer = chrome.runtime.getManifest?.()?.version || 'unknown';
  versionLine.textContent = `Extension: v${extVer} | Server: checking...`;
  Object.assign(versionLine.style, {
    marginBottom: '10px', fontSize: '11px', color: '#9ca3af',
    background: '#16161e', border: '1px solid #2a2a3a', borderRadius: '6px',
    padding: '8px 10px', fontFamily: 'monospace',
  });
  discoverServer(window.location.href).then(async (url) => {
    if (url) {
      try {
        const info = await fetch(`${url}/info`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json());
        versionLine.textContent = `Extension: v${extVer} | Server: v${info.serverVersion || 'unknown'}`;
        if (info.serverVersion && extVer && extVer < info.serverVersion) {
          versionLine.style.color = '#f59e0b';
          versionLine.style.borderColor = '#92400e';
          versionLine.textContent += ' - rebuild extension';
        }
      } catch { versionLine.textContent = `Extension: v${extVer} | Server: offline`; }
    } else {
      versionLine.textContent = `Extension: v${extVer} | Server: not connected`;
    }
  });

  // Auto-detected project mapping (read-only)
  const mappingsSection = document.createElement('div');
  Object.assign(mappingsSection.style, { marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' });
  const mapLabel = document.createElement('div');
  mapLabel.textContent = 'Project';
  Object.assign(mapLabel.style, { color: '#9ca3af', fontSize: '11px', marginBottom: '6px', fontWeight: '600' });

  const autoInfo = document.createElement('div');
  autoInfo.textContent = 'Detecting...';
  Object.assign(autoInfo.style, { color: '#555', fontSize: '11px', fontStyle: 'italic' });

  // Fetch server status and /info - try direct fetch first, fall back to background
  discoverServer(window.location.href).then(async (url) => {
    if (!url) {
      serverLine.innerHTML = '<span style="color:#f87171">\u25cf</span> MCP server offline';
      autoInfo.textContent = 'No server detected - start the MCP server';
      return;
    }
    const port = new URL(url).port;
    serverLine.innerHTML = '<span style="color:#4ade80">\u25cf</span> Connected (localhost:' + port + ')';
    // Try direct fetch (works if /health worked from this context)
    try {
      const res = await fetch(`${url}/info`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        renderProjectInfo(data);
        return;
      }
    } catch { /* direct fetch failed, try background */ }
    // Fall back to background script proxy
    try {
      chrome.runtime.sendMessage({ type: 'fetch-info', serverUrl: url }, (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          autoInfo.textContent = 'Could not load project info';
          return;
        }
        renderProjectInfo(response);
      });
    } catch {
      autoInfo.textContent = 'Could not load project info';
    }
  });

  /** Render project root and captures dir into the autoInfo element. */
  function renderProjectInfo(data) {
    autoInfo.innerHTML = '';
    autoInfo.style.fontStyle = 'normal';
    const items = [
      { label: 'Root', value: data.projectRoot },
      { label: 'Captures', value: data.capturesDir },
    ];
    for (const item of items) {
      const lbl = document.createElement('div');
      Object.assign(lbl.style, { color: '#666', fontSize: '10px', marginBottom: '1px' });
      lbl.textContent = item.label;
      const val = document.createElement('div');
      Object.assign(val.style, { color: '#93c5fd', fontFamily: 'SF Mono,Cascadia Code,monospace', fontSize: '10px', wordBreak: 'break-all', marginBottom: '6px' });
      val.textContent = item.value;
      autoInfo.append(lbl, val);
    }
  }

  const advLink = document.createElement('button');
  advLink.textContent = 'Advanced settings...';
  Object.assign(advLink.style, {
    background: 'transparent', border: 'none', color: '#6366f1', fontSize: '10px',
    cursor: 'pointer', padding: '0', marginTop: '8px',
  });
  advLink.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-options' }));

  mappingsSection.append(mapLabel, autoInfo, advLink);
  settingsBody.append(serverLine, versionLine, mappingsSection);

  // Capture options - toggle switches
  const captureOpts = document.createElement('div');
  Object.assign(captureOpts.style, { marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' });
  const optsLabel = document.createElement('div');
  optsLabel.textContent = 'Capture includes:';
  Object.assign(optsLabel.style, { color: '#9ca3af', fontSize: '11px', marginBottom: '8px', fontWeight: '600' });
  captureOpts.appendChild(optsLabel);

  /** Build a toggle switch row. Returns { row, input }. */
  function createToggleRow(labelText, opts = {}) {
    const row = document.createElement('label');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '6px', color: '#c8c8d0', fontSize: '12px',
      cursor: opts.disabled ? 'default' : 'pointer',
      opacity: opts.disabled ? '0.5' : '1',
    });
    const text = document.createElement('span');
    text.textContent = labelText;
    // Toggle track
    const track = document.createElement('span');
    Object.assign(track.style, {
      position: 'relative', width: '32px', height: '18px', flexShrink: '0',
      borderRadius: '9px', transition: 'background 0.2s', display: 'inline-block',
    });
    // Hidden checkbox drives state
    const input = document.createElement('input');
    input.type = 'checkbox';
    Object.assign(input.style, { position: 'absolute', opacity: '0', width: '0', height: '0' });
    if (opts.checked) input.checked = true;
    if (opts.disabled) input.disabled = true;
    // Toggle knob
    const knob = document.createElement('span');
    Object.assign(knob.style, {
      position: 'absolute', top: '2px', width: '14px', height: '14px',
      borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
    });
    function syncToggle() {
      track.style.background = input.checked ? '#6366f1' : '#444';
      knob.style.left = input.checked ? '16px' : '2px';
    }
    syncToggle();
    input.addEventListener('change', syncToggle);
    track.append(input, knob);
    row.append(text, track);
    return { row, input };
  }

  // ViewGraph JSON - always on
  const jsonToggle = createToggleRow('ViewGraph JSON', { checked: true, disabled: true });
  // HTML snapshot - optional
  const htmlToggle = createToggleRow('HTML snapshot');
  // Screenshot - optional
  const ssToggle = createToggleRow('Screenshot');

  captureOpts.append(jsonToggle.row, htmlToggle.row, ssToggle.row);
  settingsBody.appendChild(captureOpts);

  // Load saved settings
  chrome.storage.local.get('vg-settings', (result) => {
    const s = result['vg-settings'] || {};
    htmlToggle.input.checked = !!s.html;
    ssToggle.input.checked = !!s.screenshot;
    // Re-sync visuals after loading
    htmlToggle.input.dispatchEvent(new Event('change'));
    ssToggle.input.dispatchEvent(new Event('change'));
  });
  function saveSettings() {
    chrome.storage.local.set({ 'vg-settings': { html: htmlToggle.input.checked, screenshot: ssToggle.input.checked } });
  }
  htmlToggle.input.addEventListener('change', saveSettings);
  ssToggle.input.addEventListener('change', saveSettings);
  settingsScreen.append(settingsHeader, settingsBody);

  /** Show settings as slide-over overlay. */
  let settingsVisible = false;
  function showSettings() {
    settingsVisible = true;
    settingsScreen.style.display = 'block';
  }

  /** Hide settings overlay. */
  function hideSettings() {
    settingsVisible = false;
    settingsScreen.style.display = 'none';
  }

  sidebarEl.append(header, modeBar, tabContainer, list, settingsScreen, footer);

  // ---------------------------------------------------------------------------
  // Two-tab sidebar: Review (annotations) and Inspect (page diagnostics)
  // ---------------------------------------------------------------------------

  // Primary tab bar: Review | Inspect
  const primaryTabs = document.createElement('div');
  primaryTabs.setAttribute(ATTR, 'primary-tabs');
  Object.assign(primaryTabs.style, {
    display: 'flex', borderBottom: '1px solid #333', flexShrink: '0',
  });

  // Review tab content wrapper - holds mode bar, filter tabs, list, footer
  const reviewContent = document.createElement('div');
  reviewContent.setAttribute(ATTR, 'review-content');
  Object.assign(reviewContent.style, {
    display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0',
  });
  reviewContent.append(modeBar, tabContainer, list, footer);

  // Inspect tab content wrapper - page diagnostics
  const inspectContent = document.createElement('div');
  inspectContent.setAttribute(ATTR, 'inspect-content');
  Object.assign(inspectContent.style, {
    display: 'none', flexDirection: 'column', flex: '1', minHeight: '0',
    overflowY: 'auto', padding: '8px 12px', gap: '12px',
    fontSize: '12px', fontFamily: 'system-ui, sans-serif', color: '#c8c8d0',
  });

  /** Create a collapsible section for the Inspect tab. */
  function createSection(title, badgeText, badgeColor) {
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
    // Copy button - copies section content as text
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

    // Note button - creates a page annotation from section data
    const noteBtn = document.createElement('button');
    noteBtn.setAttribute(ATTR, 'section-note');
    noteBtn.dataset.section = title;
    noteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
    noteBtn.title = `Add as note for agent`;
    // Check if a diagnostic note already exists for this section
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
        refresh();
        noteBtn.dataset.noted = 'true';
        noteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        noteBtn.style.color = '#4ade80';
        // Disable after use - one note per section prevents duplicates
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

  /** Populate the Inspect tab with live page data. Called on tab switch. */
  async function refreshInspect() {
    inspectContent.innerHTML = '';

    // Breakpoint indicator (always visible, not collapsible)
    const bp = collectBreakpoints();
    const bpRow = document.createElement('div');
    Object.assign(bpRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
    const bpTitle = document.createElement('span');
    bpTitle.textContent = 'VIEWPORT';
    Object.assign(bpTitle.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' });
    const bpBadge = document.createElement('span');
    bpBadge.textContent = bp.activeRange;
    Object.assign(bpBadge.style, {
      background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: '700',
      padding: '2px 8px', borderRadius: '4px',
    });
    const bpLabel = document.createElement('span');
    bpLabel.textContent = `${bp.viewport.width}px`;
    Object.assign(bpLabel.style, { color: '#666', fontSize: '11px' });
    bpRow.append(bpTitle, bpBadge, bpLabel);
    inspectContent.appendChild(bpRow);

    // Auto-capture toggle
    const autoRow = document.createElement('div');
    Object.assign(autoRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
    const autoLabel = document.createElement('span');
    autoLabel.textContent = 'AUTO-CAPTURE';
    Object.assign(autoLabel.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', flex: '1' });
    const autoToggle = document.createElement('button');
    const watcherOn = isWatcherEnabled();
    autoToggle.textContent = watcherOn ? 'ON' : 'OFF';
    Object.assign(autoToggle.style, {
      border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
      fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
      background: watcherOn ? '#166534' : '#333', color: watcherOn ? '#4ade80' : '#666',
    });
    autoToggle.addEventListener('click', () => {
      if (isWatcherEnabled()) {
        stopWatcher();
        autoToggle.textContent = 'OFF';
        autoToggle.style.background = '#333';
        autoToggle.style.color = '#666';
      } else {
        startWatcher(() => {
          chrome.runtime.sendMessage({ type: 'capture-page' });
        });
        autoToggle.textContent = 'ON';
        autoToggle.style.background = '#166534';
        autoToggle.style.color = '#4ade80';
      }
    });
    autoRow.append(autoLabel, autoToggle);

    // Network section - grouped by category
    const net = collectNetworkState();
    const allReqs = net.requests || [];
    const failedReqs = allReqs.filter((r) => r.failed);
    const netSummary = `${failedReqs.length ? failedReqs.length + ' failed / ' : ''}${allReqs.length}`;
    const netColor = failedReqs.length > 0 ? '#dc2626' : '#333';
    const { section: netSection, body: netBody } = createSection('Network', netSummary, netColor);
    if (allReqs.length === 0) {
      netBody.textContent = 'No requests captured';
      Object.assign(netBody.style, { color: '#555', fontStyle: 'italic' });
    } else {
      const groups = groupRequests(allReqs);
      for (const group of groups) {
        // Group header row
        const groupRow = document.createElement('div');
        Object.assign(groupRow.style, {
          display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0',
          cursor: 'pointer', userSelect: 'none',
        });
        const arrow = document.createElement('span');
        const isFailed = group.name === 'Failed';
        // Failed expanded by default, others collapsed
        let expanded = isFailed;
        arrow.textContent = expanded ? '\u25be' : '\u25b8';
        Object.assign(arrow.style, { color: '#666', fontSize: '10px', width: '10px' });
        const gName = document.createElement('span');
        gName.textContent = group.name;
        Object.assign(gName.style, {
          fontWeight: '600', fontSize: '11px', flex: '1',
          color: isFailed ? '#f87171' : '#9ca3af',
        });
        const gCount = document.createElement('span');
        const sizeStr = group.totalSize > 0 ? ` - ${(group.totalSize / 1024).toFixed(1)}K` : '';
        gCount.textContent = `${group.requests.length}${sizeStr}`;
        Object.assign(gCount.style, { color: '#555', fontSize: '10px' });
        groupRow.append(arrow, gName, gCount);

        // Group body - request rows
        const groupBody = document.createElement('div');
        Object.assign(groupBody.style, {
          display: expanded ? 'block' : 'none',
          paddingLeft: '14px',
        });
        groupRow.addEventListener('click', () => {
          expanded = !expanded;
          arrow.textContent = expanded ? '\u25be' : '\u25b8';
          groupBody.style.display = expanded ? 'block' : 'none';
        });

        for (const req of group.requests) {
          const row = document.createElement('div');
          Object.assign(row.style, {
            display: 'flex', gap: '6px', padding: '2px 0',
            color: req.failed ? '#f87171' : '#9ca3af',
          });
          // Smart path: filename + parent on hover
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

          // Failed requests get an expandable detail row
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
    inspectContent.appendChild(netSection);

    // Console section
    const cs = getConsoleState();
    const errCount = cs.summary?.errors || 0;
    const warnCount = cs.summary?.warnings || 0;
    const conBadgeParts = [];
    if (errCount) conBadgeParts.push(`${errCount} err`);
    if (warnCount) conBadgeParts.push(`${warnCount} wrn`);
    const conBadge = conBadgeParts.length ? conBadgeParts.join(' ') : '0 / 0';
    const conColor = errCount > 0 ? '#dc2626' : warnCount > 0 ? '#f59e0b' : '#22c55e';
    const { section: conSection, body: conBody } = createSection('Console', conBadge, conColor);
    if (cs.errors.length === 0 && cs.warnings.length === 0) {
      conBody.textContent = '\u2713 No errors or warnings captured';
      Object.assign(conBody.style, { color: '#22c55e', fontSize: '10px' });
    } else {
      for (const err of cs.errors.slice(0, 10)) {
        const row = document.createElement('div');
        Object.assign(row.style, { padding: '2px 0', color: '#f87171' });
        row.textContent = err.message.slice(0, 120);
        conBody.appendChild(row);
      }
      for (const warn of cs.warnings.slice(0, 10)) {
        const row = document.createElement('div');
        Object.assign(row.style, { padding: '2px 0', color: '#f59e0b' });
        row.textContent = warn.message.slice(0, 120);
        conBody.appendChild(row);
      }
    }
    inspectContent.appendChild(conSection);

    // Visibility warnings - elements hidden by ancestors
    const hiddenEls = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.closest('[data-vg-annotate]')) continue; // skip our own UI
      const cs2 = window.getComputedStyle(el);
      if (cs2.display === 'none' || cs2.visibility === 'hidden') continue; // already invisible
      if (!checkRendered(el) && el.getBoundingClientRect().width > 0) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : '';
        hiddenEls.push(`${tag}${id}`);
        if (hiddenEls.length >= 10) break;
      }
    }
    if (hiddenEls.length > 0) {
      const { section: visSection, body: visBody } = createSection('Visibility', `${hiddenEls.length}`, '#f59e0b');
      for (const desc of hiddenEls) {
        const row = document.createElement('div');
        Object.assign(row.style, { padding: '2px 0', color: '#f59e0b' });
        row.textContent = `! ${desc} - hidden by ancestor`;
        visBody.appendChild(row);
      }
      inspectContent.appendChild(visSection);
    }

    // Stacking context issues (only shown when conflicts detected)
    const stacking = collectStackingContexts();
    if (stacking.issues.length > 0) {
      const { section: stackSection, body: stackBody } = createSection('Stacking', `\u26a0 ${stacking.issues.length}`, '#f59e0b');
      for (const issue of stacking.issues) {
        const row = document.createElement('div');
        Object.assign(row.style, { padding: '3px 0', fontSize: '10px', color: '#f59e0b' });
        row.textContent = issue.message;
        stackBody.appendChild(row);
      }
      // Context count as subtle info
      const ctxInfo = document.createElement('div');
      ctxInfo.textContent = `${stacking.contexts.length} stacking contexts on page`;
      Object.assign(ctxInfo.style, { color: '#444', fontSize: '9px', marginTop: '4px', fontStyle: 'italic' });
      stackBody.appendChild(ctxInfo);
      inspectContent.appendChild(stackSection);
    }

    // Focus chain issues (only shown when problems detected)
    const focus = collectFocusChain();
    if (focus.issues.length > 0) {
      const { section: focusSection, body: focusBody } = createSection('Focus', `\u26a0 ${focus.issues.length}`, '#f59e0b');
      for (const issue of focus.issues) {
        const row = document.createElement('div');
        Object.assign(row.style, { padding: '3px 0', fontSize: '10px', color: '#f59e0b' });
        row.textContent = issue.message;
        focusBody.appendChild(row);
      }
      if (focus.traps.length > 0) {
        const trapInfo = document.createElement('div');
        trapInfo.textContent = `${focus.traps.length} focus trap(s) active`;
        Object.assign(trapInfo.style, { color: '#444', fontSize: '9px', marginTop: '4px', fontStyle: 'italic' });
        focusBody.appendChild(trapInfo);
      }
      inspectContent.appendChild(focusSection);
    }

    // Scroll containers (only shown when nested containers detected)
    const scroll = collectScrollContainers();
    if (scroll.issues.length > 0) {
      const { section: scrollSection, body: scrollBody } = createSection('Scroll', `\u26a0 ${scroll.containers.length}`, '#f59e0b');
      for (const issue of scroll.issues) {
        const row = document.createElement('div');
        Object.assign(row.style, { padding: '3px 0', fontSize: '10px', color: '#f59e0b' });
        row.textContent = issue.message;
        scrollBody.appendChild(row);
      }
      inspectContent.appendChild(scrollSection);
    }

    // ARIA landmarks (only shown when issues detected)
    const lm = collectLandmarks();
    const lmHasIssues = lm.issues.length > 0;
    const lmBadge = lmHasIssues ? `\u26a0 ${lm.issues.length}` : `${lm.landmarks.length}`;
    const lmColor = lmHasIssues ? '#f59e0b' : '#22c55e';
    const { section: lmSection, body: lmBody } = createSection('Landmarks', lmBadge, lmColor);

    // Brief explainer
    const lmExplainer = document.createElement('div');
    lmExplainer.textContent = 'Page regions screen readers use for navigation';
    Object.assign(lmExplainer.style, { color: '#555', fontSize: '9px', marginBottom: '4px' });
    lmBody.appendChild(lmExplainer);

    // Issues
    for (const issue of lm.issues) {
      const row = document.createElement('div');
      Object.assign(row.style, { padding: '2px 0', fontSize: '10px', color: '#f59e0b' });
      row.textContent = `\u26a0 ${issue.message}`;
      lmBody.appendChild(row);
    }

    // Always show landmark list
    if (lm.landmarks.length > 0) {
      const list = document.createElement('div');
      Object.assign(list.style, { marginTop: '4px', fontSize: '10px', color: '#9ca3af' });
      list.textContent = lm.landmarks.map((l) => l.label ? `${l.role}(${l.label})` : l.role).join(' \u2192 ');
      lmBody.appendChild(list);
    } else {
      const none = document.createElement('div');
      none.textContent = 'No landmarks found';
      Object.assign(none.style, { color: '#555', fontSize: '10px' });
      lmBody.appendChild(none);
    }
    inspectContent.appendChild(lmSection);

    // "All clear" indicator when no diagnostic issues found
    const hasIssues = failedReqs.length > 0 || errCount > 0 || warnCount > 0
      || hiddenEls.length > 0 || stacking.issues.length > 0
      || focus.issues.length > 0 || scroll.issues.length > 0 || lmHasIssues;
    if (!hasIssues) {
      const allClear = document.createElement('div');
      allClear.setAttribute(ATTR, 'all-clear');
      allClear.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>No issues detected';
      Object.assign(allClear.style, {
        color: '#4ade80', fontSize: '12px', fontWeight: '600',
        padding: '8px 0', textAlign: 'center',
      });
      inspectContent.appendChild(allClear);
    }

    // Visual separator between diagnostics and capture sections
    const capSep = document.createElement('hr');
    Object.assign(capSep.style, { border: 'none', borderTop: '1px solid #333', margin: '8px 0 4px' });
    inspectContent.appendChild(capSep);

    // Auto-capture toggle (grouped with captures below)
    const autoDesc = document.createElement('div');
    autoDesc.textContent = 'Captures on every DOM change or hot-reload';
    Object.assign(autoDesc.style, { color: '#555', fontSize: '10px', marginBottom: '6px' });
    inspectContent.appendChild(autoRow);
    inspectContent.appendChild(autoDesc);

    // Auto-audit toggle (reads/writes config.json via server)
    const auditRow = document.createElement('div');
    Object.assign(auditRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
    const auditLabel = document.createElement('span');
    auditLabel.textContent = 'AUTO-AUDIT';
    Object.assign(auditLabel.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', flex: '1' });
    const auditToggle = document.createElement('button');
    auditToggle.setAttribute(ATTR, 'audit-toggle');
    let auditEnabled = false;
    try {
      const cached = await chrome.storage.local.get('vg_project_config');
      auditEnabled = cached.vg_project_config?.autoAudit || false;
    } catch { /* no cache */ }
    auditToggle.textContent = auditEnabled ? 'ON' : 'OFF';
    Object.assign(auditToggle.style, {
      border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
      fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
      background: auditEnabled ? '#166534' : '#333', color: auditEnabled ? '#4ade80' : '#666',
    });
    auditToggle.addEventListener('click', async () => {
      const serverUrl = await discoverServer(window.location.href);
      if (!serverUrl) return;
      auditEnabled = !auditEnabled;
      auditToggle.textContent = auditEnabled ? 'ON' : 'OFF';
      auditToggle.style.background = auditEnabled ? '#166534' : '#333';
      auditToggle.style.color = auditEnabled ? '#4ade80' : '#666';
      try { await updateConfig(serverUrl, { autoAudit: auditEnabled }); } catch { /* offline */ }
    });
    auditRow.append(auditLabel, auditToggle);
    inspectContent.appendChild(auditRow);
    const auditDesc = document.createElement('div');
    auditDesc.textContent = 'Runs a11y, layout, and testid audits after each capture';
    Object.assign(auditDesc.style, { color: '#555', fontSize: '10px', marginBottom: '6px' });
    inspectContent.appendChild(auditDesc);

    // Audit results badge (populated by WS audit:results messages)
    const auditBadge = document.createElement('div');
    auditBadge.setAttribute(ATTR, 'audit-badge');
    Object.assign(auditBadge.style, { display: 'none', fontSize: '11px', color: '#9ca3af', padding: '2px 0' });
    inspectContent.appendChild(auditBadge);

    // Thin divider between toggles and record flow
    const flowSep = document.createElement('hr');
    Object.assign(flowSep.style, { border: 'none', borderTop: '1px solid #2a2a3a', margin: '4px 0' });
    inspectContent.appendChild(flowSep);

    // Session recording row
    const sessionRow = document.createElement('div');
    sessionRow.setAttribute(ATTR, 'session-row');
    Object.assign(sessionRow.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' });

    const recording = isRecording();
    const sessionState = getState();

    const recDot = document.createElement('span');
    Object.assign(recDot.style, {
      width: '8px', height: '8px', borderRadius: '50%', flexShrink: '0',
      background: recording ? '#dc2626' : '#333',
      animation: recording ? 'vg-pulse 1.5s infinite' : 'none',
    });

    const recLabel = document.createElement('span');
    recLabel.textContent = recording ? `RECORDING` : 'RECORD FLOW';
    Object.assign(recLabel.style, {
      fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
      color: recording ? '#dc2626' : '#9ca3af',
    });

    const recInfo = document.createElement('span');
    recInfo.textContent = recording ? `Step ${sessionState.step}` : '';
    Object.assign(recInfo.style, { color: '#666', fontSize: '11px', flex: '1' });

    const recBtn = document.createElement('button');
    recBtn.setAttribute(ATTR, 'session-toggle');
    recBtn.textContent = recording ? 'Stop' : 'Start';
    Object.assign(recBtn.style, {
      border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
      fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
      background: recording ? '#7f1d1d' : '#333', color: recording ? '#fca5a5' : '#666',
    });
    recBtn.addEventListener('click', () => {
      if (isRecording()) {
        stopJourney();
        stopSession();
      } else {
        startSession();
        startJourney(({ url, trigger: src }) => {
          // Auto-capture on navigation during journey recording
          chrome.runtime.sendMessage({ type: 'send-review', includeCapture: true, sessionNote: `Auto: ${src} to ${url}` }, () => {});
          refreshInspect();
        });
      }
      refreshInspect();
    });

    sessionRow.append(recDot, recLabel, recInfo, recBtn);
    inspectContent.appendChild(sessionRow);

    // Record flow description (only when not recording)
    if (!recording) {
      const recDesc = document.createElement('div');
      recDesc.textContent = 'Tag captures as steps in a multi-page flow';
      Object.assign(recDesc.style, { color: '#555', fontSize: '10px', marginBottom: '2px' });
      inspectContent.appendChild(recDesc);
    }

    // Step note input (only visible when recording)
    if (recording) {
      const noteRow = document.createElement('div');
      Object.assign(noteRow.style, { display: 'flex', gap: '4px', padding: '2px 0' });
      const noteInput = document.createElement('input');
      noteInput.setAttribute(ATTR, 'session-note');
      noteInput.type = 'text';
      noteInput.placeholder = 'Note for next step (optional)';
      Object.assign(noteInput.style, {
        flex: '1', background: '#1a1a2e', border: '1px solid #333', borderRadius: '4px',
        color: '#ccc', fontSize: '10px', padding: '3px 6px', fontFamily: 'system-ui, sans-serif',
        outline: 'none',
      });
      noteInput.addEventListener('focus', () => { noteInput.style.borderColor = '#6366f1'; });
      noteInput.addEventListener('blur', () => { noteInput.style.borderColor = '#333'; });
      // Store note for next addStep call
      noteInput.dataset.vgNoteTarget = 'session';
      noteRow.appendChild(noteInput);
      inspectContent.appendChild(noteRow);
    }

    // Captures + Baseline section - fetches from server asynchronously
    fetchCapturesSection(inspectContent);
  }

  /**
   * Fetch capture count from the server and render a single status line.
   * Surfaces warnings only when something looks wrong (empty capture, stale data).
   */
  async function fetchCapturesSection(container) {
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

    // Build relative time string
    let timeStr = '';
    if (d) {
      const diffMin = Math.floor((now - d.getTime()) / 60000);
      if (diffMin < 1) timeStr = 'latest just now';
      else if (diffMin < 60) timeStr = `latest ${diffMin}m ago`;
      else if (diffMin < 1440) timeStr = `latest ${Math.floor(diffMin / 60)}h ago`;
      else timeStr = `latest ${Math.floor(diffMin / 1440)}d ago`;
    }

    // Status row - single line
    const row = document.createElement('div');
    row.setAttribute(ATTR, 'capture-status');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0',
    });

    const label = document.createElement('span');
    label.textContent = 'SNAPSHOTS';
    Object.assign(label.style, { fontWeight: '600', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' });

    const info = document.createElement('span');
    info.textContent = `${captures.length} - ${timeStr}`;
    info.setAttribute(ATTR, 'capture-info');
    Object.assign(info.style, { color: '#666', fontSize: '11px', flex: '1' });

    // Freshness dot: green if < 5min, grey otherwise
    const dot = document.createElement('span');
    const isRecent = d && (now - d.getTime()) < 300000;
    Object.assign(dot.style, {
      width: '6px', height: '6px', borderRadius: '50%', flexShrink: '0',
      background: isRecent ? '#4ade80' : '#444',
    });

    row.append(label, info, dot);
    container.appendChild(row);

    // Capture ID row: filename + copy button, and page title
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
    Object.assign(copyBtn.style, {
      border: 'none', background: '#1a1a2e', color: '#666', fontSize: '10px',
      padding: '1px 6px', borderRadius: '3px', cursor: 'pointer', flexShrink: '0',
      fontFamily: 'system-ui, sans-serif', transition: 'color 0.15s',
    });
    copyBtn.addEventListener('mouseenter', () => { copyBtn.style.color = '#a5b4fc'; });
    copyBtn.addEventListener('mouseleave', () => { copyBtn.style.color = '#666'; });
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(latest.filename).then(() => {
        copyBtn.textContent = 'Copied';
        copyBtn.style.color = '#4ade80';
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.style.color = '#666'; }, 1500);
      }).catch(() => { /* clipboard not available */ });
    });
    idRow.append(idText, copyBtn);
    container.appendChild(idRow);

    // URL (truncated, always shown)
    if (latest.url) {
      const urlEl = document.createElement('div');
      urlEl.setAttribute(ATTR, 'capture-url');
      try {
        const u = new URL(latest.url);
        urlEl.textContent = u.host + u.pathname;
      } catch { urlEl.textContent = latest.url; }
      Object.assign(urlEl.style, { color: '#6b7280', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0' });
      container.appendChild(urlEl);
    }

    // Page title (if available, on same tight spacing)
    if (latest.title) {
      const titleEl = document.createElement('div');
      titleEl.setAttribute(ATTR, 'capture-title');
      titleEl.textContent = latest.title;
      Object.assign(titleEl.style, { color: '#555', fontSize: '10px', padding: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      container.appendChild(titleEl);
    }

    // Warning if latest capture is empty
    if ((latest.nodeCount || 0) === 0) {
      const warn = document.createElement('div');
      warn.setAttribute(ATTR, 'capture-warning');
      warn.textContent = '\u26a0 Latest capture is empty - page may not have loaded';
      Object.assign(warn.style, {
        color: '#f59e0b', fontSize: '10px', fontWeight: '600', padding: '2px 0',
      });
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
    Object.assign(baseBtn.style, {
      border: 'none', borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
      fontWeight: '700', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
      background: '#333', color: '#666',
    });

    baseRow.append(baseLabel, baseInfo, baseBtn);
    container.appendChild(baseRow);

    // Baseline diff results area
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
                  const d = data.diff;
                  const parts = [];
                  if (d.added) parts.push(`+${d.added} added`);
                  if (d.removed) parts.push(`-${d.removed} removed`);
                  if (d.moved) parts.push(`${d.moved} moved`);
                  if (d.testidChanges) parts.push(`${d.testidChanges} testid changes`);
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

  /** Switch between Review and Inspect tabs. */
  function switchTab(tab) {
    reviewContent.style.display = tab === 'review' ? 'flex' : 'none';
    inspectContent.style.display = tab === 'inspect' ? 'flex' : 'none';
    if (tab === 'inspect') refreshInspect();
    for (const btn of primaryTabs.children) {
      const isActive = btn.dataset.tab === tab;
      btn.style.color = isActive ? '#a5b4fc' : '#666';
      btn.style.borderBottom = isActive ? '2px solid #a5b4fc' : '2px solid transparent';
    }
  }

  for (const { key, label } of [
    { key: 'review', label: 'Review' },
    { key: 'inspect', label: 'Inspect' },
  ]) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, 'primary-tab');
    btn.dataset.tab = key;
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1', padding: '8px 0', border: 'none', background: 'transparent',
      cursor: 'pointer', fontSize: '12px', fontWeight: '600',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      color: key === 'review' ? '#a5b4fc' : '#666',
      borderBottom: key === 'review' ? '2px solid #a5b4fc' : '2px solid transparent',
      transition: 'color 0.15s',
    });
    btn.addEventListener('click', () => switchTab(key));
    primaryTabs.appendChild(btn);
  }

  sidebarEl.append(header, helpCard, primaryTabs, statusBanner, reviewContent, inspectContent, settingsScreen);

  // Shadow DOM isolates sidebar from page CSS (prevents * { margin:0 } etc.)
  hostEl = document.createElement('div');
  hostEl.setAttribute(ATTR, 'shadow-host');
  Object.assign(hostEl.style, { all: 'initial', position: 'fixed', top: '0', right: '0', zIndex: '2147483646' });
  const shadow = hostEl.attachShadow({ mode: 'open' });

  // Initialize event bus on shadow root for inter-module communication
  _bus = createEventBus(shadow);

  // Wire core event listeners
  _bus.on(EVENTS.REFRESH, () => refresh());
  _bus.on(EVENTS.COLLAPSE_TOGGLE, () => { if (collapsed) expand(); else collapse(); });
  _bus.on(EVENTS.DESTROY, () => { hideMarkers(); stopAnnotate(); destroy(); });
  _bus.on(EVENTS.ANNOTATION_RESOLVED, ({ uuid, resolution }) => {
    const anns = getAnnotations();
    const ann = anns.find((a) => a.uuid === uuid && !a.resolved);
    if (ann) { ann.resolved = true; ann.resolution = resolution; refresh(); }
  });
  _bus.on(EVENTS.AUDIT_RESULTS, ({ audit, filename }) => {
    const badge = hostEl?.shadowRoot?.querySelector(`[${ATTR}="audit-badge"]`);
    if (badge && audit) {
      const parts = [];
      if (audit.a11y) parts.push(`${audit.a11y} a11y`);
      if (audit.layout) parts.push(`${audit.layout} layout`);
      if (audit.testids) parts.push(`${audit.testids} testids`);
      badge.textContent = parts.length ? `Auto-audit: ${parts.join(', ')}` : 'Auto-audit: no issues found';
      badge.style.display = 'block';
      badge.style.color = audit.total > 0 ? '#f59e0b' : '#4ade80';
    }
  });

  const scrollStyle = document.createElement('style');
  scrollStyle.textContent = `:host{scrollbar-color:#2a2a3a transparent}*::-webkit-scrollbar{width:8px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:4px}*::-webkit-scrollbar-thumb:hover{background:#3a3a4a}@keyframes vg-bell-pulse{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(0)}}@keyframes vg-pulse{0%,100%{opacity:1}50%{opacity:0.3}}`;
  shadow.append(scrollStyle, sidebarEl);
  document.documentElement.appendChild(hostEl);

  // Collapsed strip - extracted to sidebar/strip.js
  const strip = createStrip({
    onExpand: () => { expand(); setCaptureMode(null); updateModeButtons(); },
    modeIcons: MODE_ICONS,
    modeHints: MODE_HINTS,
    onModeClick: (key) => {
      if (key === 'page') {
        const ann = addPageNote();
        expand();
        refresh();
        showPanel(ann, { onChange: () => refresh() });
        return;
      }
      const mode = CAPTURE_MODES[key.toUpperCase()];
      setCaptureMode(getCaptureMode() === mode ? null : mode);
      updateModeButtons();
      strip.updateModeButtons(getCaptureMode());
    },
  });
  badgeEl = strip.element;
  _strip = strip;

  document.documentElement.appendChild(badgeEl);

  refresh();
  syncResolved(() => _bus.emit(EVENTS.REFRESH));
  startResolutionPolling(() => _bus.emit(EVENTS.REFRESH));
  startRequestPolling((reqs) => { pendingRequests = reqs || []; });

  // Connect WebSocket for real-time annotation sync
  (async () => {
    const serverUrl = await discoverServer(window.location.href);
    if (!serverUrl) return;
    const token = '';
    wsConnect({
      url: serverUrl,
      token,
      onMessage: (msg) => {
        if (msg.type === WS_MESSAGES.ANNOTATION_RESOLVED) {
          _bus.emit(EVENTS.ANNOTATION_RESOLVED, { uuid: msg.uuid, resolution: msg.resolution });
        }
        if (msg.type === WS_MESSAGES.AUDIT_RESULTS && msg.audit) {
          _bus.emit(EVENTS.AUDIT_RESULTS, { audit: msg.audit, filename: msg.filename });
        }
      },
    });
  })();

  // Wire keyboard shortcuts for annotate mode actions
  startShortcuts({
    onEscape: () => {
      if (help.isVisible()) { help.hide(); return; }
      if (settingsVisible) { hideSettings(); return; }
      hideMarkers();
      stopAnnotate();
      destroy();
    },
    onSend: () => { hostEl?.shadowRoot?.querySelector(`[${ATTR}="send"]`)?.click(); },
    onCopyMd: () => { hostEl?.shadowRoot?.querySelector(`[${ATTR}="copy-md"]`)?.click(); },
    onDelete: () => {
      const selected = getAnnotations().find((a) => a.selected);
      if (selected) { removeAnnotation(selected.id); refresh(); }
    },
    onSeverity: (sev) => {
      const selected = getAnnotations().find((a) => a.selected);
      if (selected) { updateSeverity(selected.id, sev); refresh(); }
    },
    onToggleCollapse: () => { _bus.emit(EVENTS.COLLAPSE_TOGGLE); },
    onClose: () => { _bus.emit(EVENTS.DESTROY); },
  });
}

/** Collapse sidebar to strip. Exported for capture mode integration. */
export function collapse() {
  if (collapsed || !sidebarEl) return;
  collapsed = true;
  sidebarEl.style.transform = 'translateX(100%)';
  badgeEl.style.display = 'flex';
  updateBadgeCount();
}

/** Expand sidebar from strip. Exported for capture mode integration. */
export function expand() {
  if (!collapsed || !sidebarEl) return;
  collapsed = false;
  sidebarEl.style.transform = 'translateX(0)';
  badgeEl.style.display = 'none';
  refresh();
}

export function isCollapsed() { return collapsed; }

function toggleCollapse() {
  if (collapsed) expand(); else collapse();
}

function updateBadgeCount() {
  if (_strip) _strip.updateCount();
}

/** Refresh the sidebar list from current annotations. */
export function refresh() {
  if (!sidebarEl) return;
  const list = sidebarEl.querySelector(`[${ATTR}="list"]`);
  const tabContainer = sidebarEl.querySelector(`[${ATTR}="tab-container"]`);
  if (!list || !tabContainer) return;

  // Update Review tab count badge
  const _reviewTab = hostEl?.shadowRoot?.querySelector(`[${ATTR}="primary-tab"][data-tab="review"]`);
  if (_reviewTab) {
    const openCount = getAnnotations().filter((a) => !a.resolved).length;
    _reviewTab.textContent = openCount > 0 ? `Review (${openCount})` : 'Review';
  }

  // Update header bell indicator
  if (bellBtn) {
    if (pendingRequests.length > 0) {
      bellBtn.style.display = 'flex';
      bellBtn.style.animation = 'none';
      // Trigger reflow then apply pulse
      void bellBtn.offsetWidth;
      bellBtn.style.animation = 'vg-bell-pulse 1s ease-in-out 3';
    } else {
      bellBtn.style.display = 'none';
    }
  }

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
  }

  // Sort: open items first (by timestamp desc), then resolved
  const open = anns.filter((a) => !a.resolved);
  const resolved = anns.filter((a) => a.resolved);

  // Kiro capture requests - shown at top of timeline
  if (pendingRequests.length > 0) {
    const reqHeader = document.createElement('div');
    reqHeader.textContent = `${getAgentName()} Requests (${pendingRequests.length})`;
    Object.assign(reqHeader.style, {
      padding: '6px 12px', color: '#f59e0b', fontSize: '11px', fontWeight: '600',
      borderBottom: '1px solid #2a2a3a', fontFamily: 'system-ui, sans-serif',
    });
    list.appendChild(reqHeader);

    for (const req of pendingRequests) {
      const entry = document.createElement('div');
      Object.assign(entry.style, {
        padding: '10px 12px', borderBottom: '1px solid #2a2a3a',
        fontFamily: 'system-ui, sans-serif',
      });

      // Top row: purpose label + URL
      // Build buttons first (needed in topRow)
      const btnRow = document.createElement('div');
      Object.assign(btnRow.style, { display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: '0' });

      const capBtn = document.createElement('button');
      capBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
      capBtn.title = 'Capture now';
      Object.assign(capBtn.style, {
        padding: '5px', border: 'none', borderRadius: '6px',
        background: '#f59e0b', color: '#000', display: 'flex', cursor: 'pointer',
      });
      capBtn.addEventListener('click', () => {
        capBtn.innerHTML = '\u23f3';
        (async () => {
          try {
            const serverUrl = await discoverServer(window.location.href);
            if (serverUrl) await fetch(`${serverUrl}/requests/${req.id}/ack`, { method: 'POST', headers: {} });
          } catch { /* best effort */ }
          // Use capture with keepSidebar to get full DOM without tearing down sidebar
          chrome.runtime.sendMessage({ type: 'capture', includeSnapshot: true, keepSidebar: true }, () => {
            // Green flash + fade out
            entry.style.transition = 'background 0.3s, opacity 0.5s';
            entry.style.background = 'rgba(74, 222, 128, 0.15)';
            capBtn.innerHTML = '\u2713';
            capBtn.style.background = '#4ade80';
            setTimeout(() => {
              entry.style.opacity = '0';
              setTimeout(() => {
                pendingRequests = pendingRequests.filter((r) => r.id !== req.id);
                storageSet(KEYS.pendingRequests, pendingRequests);
                refresh();
              }, 500);
            }, 800);
          });
        })();
      });

      const decBtn = document.createElement('button');
      decBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      decBtn.title = 'Decline capture request';
      Object.assign(decBtn.style, {
        padding: '5px', border: '1px solid #333', borderRadius: '6px',
        background: 'transparent', color: '#9ca3af', display: 'flex', cursor: 'pointer',
      });
      decBtn.addEventListener('mouseenter', () => { decBtn.style.color = '#f87171'; decBtn.style.borderColor = '#f87171'; });
      decBtn.addEventListener('mouseleave', () => { decBtn.style.color = '#9ca3af'; decBtn.style.borderColor = '#333'; });
      decBtn.addEventListener('click', () => {
        (async () => {
          try {
            const serverUrl = await discoverServer(window.location.href);
            if (serverUrl) {
              await fetch(`${serverUrl}/requests/${req.id}/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'User declined from extension' }),
              });
            }
          } catch { /* best effort */ }
          // Red flash + fade out
          entry.style.transition = 'background 0.3s, opacity 0.5s';
          entry.style.background = 'rgba(248, 113, 113, 0.15)';
          setTimeout(() => {
            entry.style.opacity = '0';
            setTimeout(() => {
              pendingRequests = pendingRequests.filter((r) => r.id !== req.id);
              storageSet(KEYS.pendingRequests, pendingRequests);
              refresh();
            }, 500);
          }, 600);
        })();
      });
      btnRow.append(capBtn, decBtn);

      // Top row: purpose label + URL + buttons
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

      // Guidance text
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

      list.appendChild(entry);
    }
  }

  // Filter tabs: All | Open | Resolved
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
    tab.addEventListener('click', () => { activeFilter = key; refresh(); });
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
    btn.addEventListener('click', () => {
      if (ft.key === 'element') {
        // Bug toggle controls both element and region
        if (activeTypeFilters.has('element')) { activeTypeFilters.delete('element'); activeTypeFilters.delete('region'); }
        else { activeTypeFilters.add('element'); activeTypeFilters.add('region'); }
      } else {
        if (activeTypeFilters.has(ft.key)) activeTypeFilters.delete(ft.key);
        else activeTypeFilters.add(ft.key);
      }
      refresh();
    });
    typeFilterRow.appendChild(btn);
  }
  tabContainer.appendChild(typeFilterRow);

  // Trash icon at end of tab row - clear all annotations
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
    const count = getAnnotations().length;
    if (!count) return;
    // Themed confirmation card overlaid on the sidebar
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
    // Trash icon
    const icon = document.createElement('div');
    icon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
    Object.assign(icon.style, { marginBottom: '8px' });
    // Message
    const msg = document.createElement('div');
    msg.textContent = `Clear ${count} annotation${count > 1 ? 's' : ''}?`;
    Object.assign(msg.style, { color: '#e0e0e0', fontSize: '13px', fontWeight: '600', marginBottom: '4px' });
    const sub = document.createElement('div');
    sub.textContent = 'This cannot be undone.';
    Object.assign(sub.style, { color: '#666', fontSize: '11px', marginBottom: '14px' });
    // Buttons
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
    confirmBtn.addEventListener('click', () => {
      overlay.remove();
      clearAnnotations();
      save();
      refresh();
    });
    btnRow.append(cancelBtn, confirmBtn);
    card.append(icon, msg, sub, btnRow);
    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    sidebarEl.appendChild(overlay);
  });
  tabBar.appendChild(trashBtn);

  // Filtered items
  const statusFiltered = activeFilter === 'all' ? anns : activeFilter === 'open' ? open : resolved;
  const visible = statusFiltered.filter((a) => activeTypeFilters.has(resolveType(a)));
  for (const ann of visible) {
    try {
      list.appendChild(createEntry(ann));
    } catch (e) {
      // Defensive: don't let one bad annotation kill the entire list
      console.error(`[ViewGraph] Failed to render annotation #${ann.id}:`, e);
    }
  }
  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = activeFilter === 'resolved' ? 'No resolved items yet' : 'No open items';
    Object.assign(empty.style, { padding: '16px 12px', color: '#666', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' });
    list.appendChild(empty);
  }

  // Auto-scroll to show newest item
  list.scrollTop = list.scrollHeight;

  /** Create a single timeline entry for an annotation. */
  function createEntry(ann) {
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
      spotlightMarker(ann.id);
    });
    entry.addEventListener('mouseleave', () => {
      entry.style.background = 'transparent';
      spotlightMarker(null);
    });

    const label = document.createElement('span');
    Object.assign(label.style, {
      color: ann.resolved ? '#666' : '#c8c8d0', overflow: 'hidden',
      flex: '1', display: 'flex', flexDirection: 'column', gap: '2px',
    });

    // Line 1: number + ancestor + comment
    const line1 = document.createElement('div');
    Object.assign(line1.style, {
      display: 'flex', alignItems: 'center', overflow: 'hidden',
      whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      maxHeight: '20px', transition: 'max-height 0.25s ease, white-space 0s',
    });

    // Number badge - color matches the bounding box marker on the page
    // Severity dot - separate indicator after the number
    const numBadge = document.createElement('span');
    const SEV_DOT_COLORS = { critical: '#ef4444', major: '#eab308', minor: '#9ca3af' };
    const markerColor = getBadgeColor(ann);
    const iconSvg = getBadgeIcon(ann);

    // Type icon - separate element before the number badge
    if (iconSvg) {
      const iconEl = document.createElement('span');
      iconEl.innerHTML = iconSvg;
      Object.assign(iconEl.style, { display: 'inline-flex', color: markerColor, flexShrink: '0', marginRight: '2px' });
      line1.appendChild(iconEl);
    }

    // Number badge
    numBadge.textContent = `#${ann.id}`;
    Object.assign(numBadge.style, {
      background: markerColor, color: '#fff', fontSize: '10px', fontWeight: '700',
      padding: '1px 5px', borderRadius: '3px', marginRight: '3px',
      fontFamily: 'system-ui, sans-serif', flexShrink: '0',
    });
    numBadge.title = `Annotation ${ann.id}`;
    line1.appendChild(numBadge);

    // Severity icon - colored pill with exclamation mark, same size as number badge
    if (ann.severity) {
      const sevIcon = document.createElement('span');
      sevIcon.textContent = '!';
      Object.assign(sevIcon.style, {
        background: SEV_DOT_COLORS[ann.severity] || '#a855f7',
        color: '#fff',
        fontSize: '10px', fontWeight: '900', marginRight: '4px', flexShrink: '0',
        fontFamily: 'system-ui, sans-serif',
        padding: '1px 4px', borderRadius: '3px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      });
      sevIcon.title = ann.severity;
      line1.appendChild(sevIcon);
    } else {
      // No severity set - add small spacer
      const spacer = document.createElement('span');
      spacer.style.marginRight = '4px';
      line1.appendChild(spacer);
    }

    // Ancestor element badge
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
    // Diagnostic notes (from Inspect section note buttons) get styled excerpt
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

    // Click-to-expand for long comments (> 40 chars)
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
    } else if (ann.pending) {
      const pendLine = document.createElement('div');
      pendLine.textContent = '\u23F3 Sent to agent - waiting for fix...';
      Object.assign(pendLine.style, {
        color: '#f59e0b', fontSize: '10px', marginTop: '2px',
        fontFamily: 'system-ui, sans-serif',
      });
      label.appendChild(pendLine);
    }

    // Click to scroll and show panel (open items only)
    if (!ann.resolved) {
      label.addEventListener('click', () => {
        window.scrollTo({ top: ann.region.y - 100, behavior: 'smooth' });
        showPanel(ann, { onChange: () => refresh() });
      });
    }

    // Action buttons - resolved items are read-only (just a static checkmark)
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
        resolveAnnotation(ann.id);
        hidePanel();
        refresh();
      });

      const del = document.createElement('button');
      del.setAttribute(ATTR, 'btn');
      del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      Object.assign(del.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', flexShrink: '0' });
      del.addEventListener('click', (e) => { e.stopPropagation(); removeAnnotation(ann.id); hidePanel(); refresh(); });

      entry.append(label, resolveBtn, del);
    }
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
  stopShortcuts();
  stopJourney();
  stopRequestPolling();
  stopResolutionPolling();
  wsDisconnect();
  if (hostEl) { hostEl.remove(); hostEl = null; }
  if (sidebarEl) { sidebarEl = null; }
  if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  bellBtn = null;
  _strip = null;
  if (_bus) { _bus.destroy(); _bus = null; }
  collapsed = false;
  _hasCaptured = false;
  pendingRequests = [];
  activeFilter = 'open';
}
