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
import { getAnnotations, removeAnnotation, resolveAnnotation, hideMarkers, stop as stopAnnotate, setCaptureMode, getCaptureMode, CAPTURE_MODES, addPageNote, clearAnnotations, save, spotlightMarker, updateSeverity, updateComment } from './annotate.js';
// Annotation type helpers used by sidebar/review.js (no longer needed here)
import { createHelpCard } from './sidebar/help.js';
import { createStrip } from './sidebar/strip.js';
import { createSettings } from './sidebar/settings.js';
import { createInspectTab } from './sidebar/inspect.js';
import { renderReviewList } from './sidebar/review.js';
import { scanForSuggestions } from './sidebar/suggestions.js';
import { renderSuggestionBar } from './sidebar/suggestions-ui.js';
import { syncResolved, startResolutionPolling, stopResolutionPolling, startRequestPolling, stopRequestPolling } from './sidebar/sync.js';
import { EVENTS, createEventBus } from './sidebar/events.js';
import { chevronRightIcon, closeIcon, bellIcon, sendIcon, checkIcon, docIcon, downloadIcon, gearIcon, shieldIcon } from './sidebar/icons.js';
import { KEYS, set as storageSet } from './storage.js';
// import { groupRequests, smartPath } from './network-grouper.js';
import { formatMarkdown } from './export/export-markdown.js';
import { discoverServer, getAgentName, fetchConfig, classifyTrust } from './constants.js';
import { collectNetworkState } from './collectors/network-collector.js';
import { getConsoleState } from './collectors/console-collector.js';
import { collectBreakpoints } from './collectors/breakpoint-collector.js';
import { collectStackingContexts } from './collectors/stacking-collector.js';
import { collectFocusChain } from './collectors/focus-collector.js';
import { collectScrollContainers } from './collectors/scroll-collector.js';
import { collectLandmarks } from './collectors/landmark-collector.js';
import { collectComponents } from './collectors/component-collector.js';
// import { checkRendered } from './collectors/visibility-collector.js';
import { stopJourney } from './session/journey-recorder.js';
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
let _suggestionsCache = null;
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
          // F17: Trust shield based on URL classification
          const trust = classifyTrust(window.location.href, info.trustedPatterns || []);
          const TRUST_COLORS = { trusted: '#4ade80', configured: '#60a5fa', untrusted: '#f59e0b' };
          trustShield.replaceChildren(shieldIcon(12, TRUST_COLORS[trust.level]));
          trustShield.title = `${trust.level}: ${trust.reason}`;
          trustShield.style.display = 'inline-flex';
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
  collapseBtn.appendChild(chevronRightIcon(18, '#666'));
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
  closeBtn.appendChild(closeIcon(18, '#666'));
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
  bellBtn.appendChild(bellIcon(18));
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

  // Dot and trust shield go inside toggle
  const trustShield = document.createElement('span');
  trustShield.setAttribute(ATTR, 'trust-shield');
  Object.assign(trustShield.style, { display: 'none', marginLeft: '4px', flexShrink: '0' });
  toggle.append(statusDot, trustShield);

  header.append(toggle, bellBtn, collapseBtn, closeBtn);

  // Help button in header - opens slide-down help card
  const helpBtn = document.createElement('button');
  helpBtn.setAttribute(ATTR, 'help-btn');
  helpBtn.textContent = '?';
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
    btn.innerHTML = icon;
    const labelSpan = document.createElement('span');
    Object.assign(labelSpan.style, { fontSize: '10px', marginTop: '2px' });
    labelSpan.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    const hintSpan = document.createElement('span');
    Object.assign(hintSpan.style, { fontSize: '9px', color: '#666', marginTop: '1px' });
    hintSpan.textContent = MODE_HINTS[key];
    btn.append(labelSpan, hintSpan);
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
  sendBtn.replaceChildren(sendIcon(14), document.createTextNode('Send to Agent'));
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
    sendBtn.replaceChildren(checkIcon(14), document.createTextNode('Sent!'));
    sendBtn.style.background = '#059669';
    setTimeout(() => { sendBtn.replaceChildren(sendIcon(14), document.createTextNode('Send to Agent')); sendBtn.style.background = '#6366f1'; }, 2000);
  });

  // Copy Markdown
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(ATTR, 'copy-md');
  copyBtn.replaceChildren(docIcon(14), document.createTextNode('Copy MD'));
  Object.assign(copyBtn.style, { ...btnStyle, background: '#374151' });
  copyBtn.title = 'Copy as Markdown';
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = 'rgba(255,255,255,0.05)'; });
  copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = 'transparent'; });
  copyBtn.addEventListener('click', () => {
    const meta = { title: document.title, url: location.href, timestamp: new Date().toISOString(), viewport: { width: window.innerWidth, height: window.innerHeight }, browser: navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+/)?.[0] || 'Unknown' };
    const enrichment = { network: collectNetworkState(), console: getConsoleState(), breakpoints: collectBreakpoints(), stacking: collectStackingContexts(), focus: collectFocusChain(), scroll: collectScrollContainers(), landmarks: collectLandmarks(), components: collectComponents() };
    const md = formatMarkdown(getAnnotations(), meta, { enrichment });
    navigator.clipboard.writeText(md).then(() => {
      copyBtn.replaceChildren(checkIcon(14), document.createTextNode('Copied!'));
      copyBtn.style.background = '#059669';
      setTimeout(() => { copyBtn.replaceChildren(docIcon(14), document.createTextNode('Copy MD')); copyBtn.style.background = 'transparent'; }, 2000);
    });
  });

  // Download Report
  const dlBtn = document.createElement('button');
  dlBtn.setAttribute(ATTR, 'download');
  dlBtn.replaceChildren(downloadIcon(14), document.createTextNode('Report'));
  Object.assign(dlBtn.style, { ...btnStyle, background: '#374151' });
  dlBtn.title = 'Download Report (Markdown + Screenshots)';
  dlBtn.addEventListener('mouseenter', () => { dlBtn.style.background = 'rgba(255,255,255,0.05)'; });
  dlBtn.addEventListener('mouseleave', () => { dlBtn.style.background = 'transparent'; });
  dlBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'download-report' });
    dlBtn.replaceChildren(checkIcon(14), document.createTextNode('Saved!'));
    dlBtn.style.background = '#059669';
    setTimeout(() => { dlBtn.replaceChildren(downloadIcon(14), document.createTextNode('Report')); dlBtn.style.background = 'transparent'; }, 2000);
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
  settingsLink.replaceChildren(gearIcon(12), document.createTextNode(' Settings'));
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


  // Settings screen - extracted to sidebar/settings.js
  const settings = createSettings();
  const settingsScreen = settings.element;
  let settingsVisible = false;
  function showSettings() { settingsVisible = true; settings.show(); }
  function hideSettings() { settingsVisible = false; settings.hide(); }

  // Version + connection info for help card
  const extVer = chrome.runtime.getManifest?.()?.version || 'unknown';
  help.setVersion(`Extension: v${extVer}`);
  discoverServer(window.location.href).then(async (url) => {
    if (url) {
      try {
        const port = new URL(url).port || '9876';
        const info = await fetch(`${url}/info`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json());
        const mismatch = info.serverVersion && extVer && extVer < info.serverVersion;
        help.setVersion(`Ext v${extVer} | Server v${info.serverVersion || '?'} | Port ${port}${mismatch ? ' - rebuild extension' : ''}`, mismatch);
      } catch { help.setVersion(`Ext v${extVer} | Server: offline`); }
    } else { help.setVersion(`Ext v${extVer} | Server: not connected`); }
  });

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
  reviewContent.append(modeBar, tabContainer, list, statusBanner, footer);

  // Inspect tab - extracted to sidebar/inspect.js
  const inspect = createInspectTab({ onRefresh: () => refresh() });
  const inspectContent = inspect.element;

  /** Switch between Review and Inspect tabs. */
  function switchTab(tab) {
    reviewContent.style.display = tab === 'review' ? 'flex' : 'none';
    inspectContent.style.display = tab === 'inspect' ? 'flex' : 'none';
    if (tab === 'inspect') inspect.refresh();
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

  sidebarEl.append(header, helpCard, primaryTabs, reviewContent, inspectContent, settingsScreen);

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
  _bus.on(EVENTS.AUDIT_RESULTS, ({ audit, filename: _filename }) => {
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

  const anns = getAnnotations();

  // Render annotation list first (clears list contents)
  renderReviewList(list, tabContainer, sidebarEl, {
    annotations: anns,
    pendingRequests,
    activeFilter,
    activeTypeFilters,
    agentName: getAgentName(),
  }, {
    onRefresh: () => refresh(),
    onShowPanel: (ann) => {
      window.scrollTo({ top: ann.region.y - 100, behavior: 'smooth' });
      showPanel(ann, { onChange: () => refresh() });
    },
    onHidePanel: () => hidePanel(),
    onRemove: (id) => { removeAnnotation(id); hidePanel(); refresh(); },
    onResolve: (id) => { resolveAnnotation(id); hidePanel(); refresh(); },
    onClear: () => { clearAnnotations(); save(); refresh(); },
    onSpotlight: (id) => spotlightMarker(id),
    onFilterChange: (key) => { activeFilter = key; refresh(); },
    onTypeFilterToggle: (key) => {
      if (key === 'element') {
        if (activeTypeFilters.has('element')) { activeTypeFilters.delete('element'); activeTypeFilters.delete('region'); }
        else { activeTypeFilters.add('element'); activeTypeFilters.add('region'); }
      } else {
        if (activeTypeFilters.has(key)) activeTypeFilters.delete(key);
        else activeTypeFilters.add(key);
      }
      refresh();
    },
    onRequestCapture: (req, entry, capBtn) => {
      capBtn.textContent = '\u23f3';
      (async () => {
        try {
          const serverUrl = await discoverServer(window.location.href);
          if (serverUrl) await fetch(`${serverUrl}/requests/${req.id}/ack`, { method: 'POST', headers: {} });
        } catch { /* best effort */ }
        chrome.runtime.sendMessage({ type: 'capture', includeSnapshot: true, keepSidebar: true }, () => {
          entry.style.transition = 'background 0.3s, opacity 0.5s';
          entry.style.background = 'rgba(74, 222, 128, 0.15)';
          capBtn.textContent = '\u2713';
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
    },
    onRequestDecline: (req, entry) => {
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
    },
    getSidebarEl: () => sidebarEl,
  });

  // Auto-inspect suggestions - prepend to list AFTER renderReviewList (which clears list)
  if (!_suggestionsCache) _suggestionsCache = scanForSuggestions();
  /** Convert a suggestion into an annotation in the timeline. */
  function addSuggestionToReview(sug) {
    const ann = addPageNote();
    if (ann) {
      const tierLabel = sug.tier === 'accessibility' ? 'A11Y' : sug.tier === 'quality' ? 'QUAL' : 'TEST';
      updateComment(ann.id, `${tierLabel}: ${sug.title} - ${sug.detail || ''}`);
      ann.diagnostic = { section: sug.tier, data: sug.detail };
      ann.severity = sug.severity || 'minor';
      if (sug.selector && sug.selector !== 'body') ann.element = { selector: sug.selector };
    }
  }
  renderSuggestionBar(list, _suggestionsCache, {
    onAdd: (sug) => { addSuggestionToReview(sug); _suggestionsCache = _suggestionsCache?.filter((s) => s.id !== sug.id) || null; save(); refresh(); },
    onAddAll: (sugs) => { for (const s of sugs) addSuggestionToReview(s); _suggestionsCache = []; save(); refresh(); },
    onDismissAll: () => { _suggestionsCache = []; refresh(); },
    onRefresh: () => { _suggestionsCache = null; refresh(); },
  });

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
  _suggestionsCache = null;
}
