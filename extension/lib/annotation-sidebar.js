/**
 * Annotation Sidebar
 *
 * Collapsible list of all annotations, docked to the right edge of
 * the viewport. Each entry shows the annotation number, a comment
 * preview, and click-to-scroll behavior.
 *
 * Orchestrates extracted sub-modules:
 * - sidebar/header.js - top bar (logo, status, trust, bell, help, collapse, close)
 * - sidebar/footer.js - export actions (send, copy MD, report, settings link)
 * - sidebar/mode-bar.js - capture mode selector (element, region, page)
 * - sidebar/trust-gate.js - F17 trust gate for untrusted URLs
 * - sidebar/help.js - help card overlay
 * - sidebar/strip.js - collapsed badge strip
 * - sidebar/settings.js - settings screen
 * - sidebar/inspect.js - inspect tab (diagnostics)
 * - sidebar/review.js - review tab (annotation list)
 * - sidebar/suggestions.js - auto-inspect suggestions engine
 * - sidebar/suggestions-ui.js - suggestions bar UI
 * - sidebar/sync.js - resolution/request polling
 * - sidebar/events.js - inter-module event bus
 *
 * @see lib/annotate.js - annotation state management
 * @see lib/annotation-panel.js - comment editing
 */

import { show as showPanel, hide as hidePanel } from './annotation-panel.js';
import { getAnnotations, removeAnnotation, resolveAnnotation, hideMarkers, stop as stopAnnotate, setCaptureMode, getCaptureMode, CAPTURE_MODES, addPageNote, clearAnnotations, save, spotlightMarker, updateSeverity, updateComment } from './annotate.js';
import { createHelpCard } from './sidebar/help.js';
import { createStrip } from './sidebar/strip.js';
import { createSettings } from './sidebar/settings.js';
import { createInspectTab } from './sidebar/inspect.js';
import { renderReviewList } from './sidebar/review.js';
import { scanForSuggestions } from './sidebar/suggestions.js';
import { renderSuggestionBar, collapseSuggestions } from './sidebar/suggestions-ui.js';
import { syncResolved, startResolutionPolling, stopResolutionPolling, startRequestPolling, stopRequestPolling } from './sidebar/sync.js';
import { EVENTS, createEventBus } from './sidebar/events.js';
import { createHeader } from './sidebar/header.js';
import { createFooter } from './sidebar/footer.js';
import { createModeBar, MODE_ICONS, MODE_HINTS } from './sidebar/mode-bar.js';
import { showTrustGate } from './sidebar/trust-gate.js';
import { sendIcon, checkIcon } from './sidebar/icons.js';
import { createTooltip } from './tooltip.js';
import { COLOR } from './sidebar/styles.js';
import { KEYS, set as storageSet } from './storage.js';
import { discoverServer, getAgentName, classifyTrust } from './constants.js';
import * as transport from './transport.js';
import { stopJourney } from './session/journey-recorder.js';
import { startShortcuts, stopShortcuts } from './ui/keyboard-shortcuts.js';
import { ATTR } from './selector.js';

// ──────────────────────────────────────────────
// Module State
// ──────────────────────────────────────────────

let sidebarEl = null;
let hostEl = null;
let _shadowRoot = null;
let collapsed = false;
let badgeEl = null;
let _strip = null;
let _bus = null;
let pendingRequests = [];
let activeFilter = 'open';
let _suggestionsCache = null;
let _trustLevel = null;
let activeTypeFilters = new Set(['element', 'region', 'page-note', 'idea', 'diagnostic']);
let _header = null;
let _footer = null;
let _modeBar = null;
let _popstateHandler = null;
let _tooltip = null;

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
    background: '#1e1e2e', borderLeft: `1px solid ${COLOR.border}`, borderRadius: '8px 0 0 8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '14px',
    boxShadow: '-2px 0 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
    boxSizing: 'border-box', color: '#e0e0e0',
  });

  // ── Header ──
  _header = createHeader({
    onToggleCollapse: () => toggleCollapse(),
    onClose: () => { hideMarkers(); stopAnnotate(); destroy(); },
    onHelpToggle: () => help.toggle(),
    onBellClick: () => switchTab('review'),
  });

  // ── Server discovery + trust classification ──
  discoverServer(window.location.href)
    .then(async (url) => {
      // Guard: sidebar may have been destroyed while discovery was in flight
      if (!_footer) return;
      if (url) {
        _footer.statusDot.style.background = COLOR.success;
        _footer.statusDot.setAttribute('data-tooltip', `MCP server: ${url}`);
        _header.statusBanner.style.display = 'none';
        try {
          const info = await transport.getInfo();
          const extVersion = chrome.runtime.getManifest?.()?.version;
          if (info.serverVersion && extVersion && extVersion < info.serverVersion) {
            if (!_header) return;
            _header.statusBanner.textContent = '';
            _header.statusBanner.appendChild(document.createTextNode(`Extension v${extVersion} is behind server v${info.serverVersion}. `));
            const link = document.createElement('a');
            link.href = 'https://chaoslabz.gitbook.io/viewgraph/getting-started/manual-install';
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'Update extension';
            Object.assign(link.style, { color: COLOR.primaryHover, textDecoration: 'underline' });
            _header.statusBanner.appendChild(link);
            _header.statusBanner.style.display = 'block';
          }
          const trust = classifyTrust(window.location.href, info.trustedPatterns || []);
          _trustLevel = trust;
          _footer.setTrustLevel(trust);
        } catch (e) { console.error('[ViewGraph] info/trust error:', e); }
      } else {
        _footer.statusDot.style.background = COLOR.errorLight;
        _footer.statusDot.setAttribute('data-tooltip', 'MCP server offline');
        _header.statusBanner.textContent = 'No project connected. Copy MD and Report available.';
        _header.statusBanner.style.display = 'block';
        _footer.setOfflineMode();
      }
      // Always classify trust based on URL even without server
      if (!_trustLevel && _footer) {
        const trust = classifyTrust(window.location.href, []);
        _trustLevel = trust;
        _footer.setTrustLevel(trust);
      }
    });

  // Re-classify trust on SPA navigation (URL changes without page reload)
  _popstateHandler = () => {
    if (!_header) return;
    const trust = classifyTrust(window.location.href, []);
    _trustLevel = trust;
    _footer.setTrustLevel(trust);
  };
  window.addEventListener('popstate', _popstateHandler);

  // ── Mode Bar ──
  _modeBar = createModeBar({
    onModeClick: (key) => {
      if (key === 'page') {
        const ann = addPageNote();
        refresh();
        showPanel(ann, { onChange: () => refresh() });
        return;
      }
      const mode = CAPTURE_MODES[key.toUpperCase()];
      const wasActive = getCaptureMode() === mode;
      setCaptureMode(mode);
      _modeBar.updateActive(getCaptureMode());
      if (!wasActive) collapse(); else expand();
    },
  });

  // ── Footer ──
  _footer = createFooter({
    onSend: () => {
      if (_trustLevel?.level === 'untrusted') {
        showTrustGate(sidebarEl, _footer.sendBtn, {
          onSend: (override) => doSend(override),
          onTrustUpdated: (trust) => { _trustLevel = trust; },
          shadowRoot: _shadowRoot,
        });
        return;
      }
      doSend();
    },
    onShowSettings: () => showSettings(),
  });

  // ── Help Card ──
  const help = createHelpCard();

  // ── Settings ──
  const settings = createSettings();
  let settingsVisible = false;
  function showSettings() { settingsVisible = true; settings.show(); }
  function hideSettings() { settingsVisible = false; settings.hide(); }

  // Version info for help card
  const extVer = chrome.runtime.getManifest?.()?.version || 'unknown';
  help.setVersion(`Extension: v${extVer}`);
  discoverServer(window.location.href).then(async (url) => {
    if (url) {
      const port = new URL(url).port || '9876';
      try {
        const info = await transport.getInfo();
        const mismatch = info.serverVersion && extVer && extVer < info.serverVersion;
        help.setVersion(`Extension: v${extVer} | Server: v${info.serverVersion || '?'} | Port: ${port}${mismatch ? ' - rebuild extension' : ''}`, mismatch);
      } catch { help.setVersion(`Extension: v${extVer} | Server: offline | Port: ${port}`); }
    } else { help.setVersion(`Extension: v${extVer} | Server: not connected | Port: n/a`); }
  });

  // ── Scrollable list ──
  const list = document.createElement('div');
  list.setAttribute(ATTR, 'list');
  Object.assign(list.style, { flex: '1', overflowY: 'auto', minHeight: '0' });

  const tabContainer = document.createElement('div');
  tabContainer.setAttribute(ATTR, 'tab-container');
  Object.assign(tabContainer.style, { flexShrink: '0' });

  // ── Two-tab layout: Review | Inspect ──
  const primaryTabs = document.createElement('div');
  primaryTabs.setAttribute(ATTR, 'primary-tabs');
  Object.assign(primaryTabs.style, { display: 'flex', borderBottom: `1px solid ${COLOR.border}`, flexShrink: '0' });

  const reviewContent = document.createElement('div');
  reviewContent.setAttribute(ATTR, 'review-content');
  Object.assign(reviewContent.style, { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' });
  reviewContent.append(_modeBar.element, tabContainer, list, _header.statusBanner, _footer.element);

  const inspect = createInspectTab({ onRefresh: () => refresh() });
  const inspectContent = inspect.element;

  function switchTab(tab) {
    reviewContent.style.display = tab === 'review' ? 'flex' : 'none';
    inspectContent.style.display = tab === 'inspect' ? 'flex' : 'none';
    if (tab === 'inspect') inspect.refresh();
    for (const btn of primaryTabs.children) {
      const isActive = btn.dataset.tab === tab;
      btn.style.color = isActive ? COLOR.primaryLight : COLOR.muted;
      btn.style.borderBottom = isActive ? `2px solid ${COLOR.primaryLight}` : '2px solid transparent';
    }
  }

  for (const { key, label } of [{ key: 'review', label: 'Review' }, { key: 'inspect', label: 'Inspect' }]) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, 'primary-tab');
    btn.dataset.tab = key;
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1', padding: '8px 0', border: 'none', background: 'transparent',
      cursor: 'pointer', fontSize: '12px', fontWeight: '600',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      color: key === 'review' ? COLOR.primaryLight : COLOR.muted,
      borderBottom: key === 'review' ? `2px solid ${COLOR.primaryLight}` : '2px solid transparent',
      transition: 'color 0.15s',
    });
    btn.addEventListener('click', () => switchTab(key));
    primaryTabs.appendChild(btn);
  }

  sidebarEl.append(_header.element, help.element, primaryTabs, reviewContent, inspectContent, settings.element);

  // ── Shadow DOM ──
  hostEl = document.createElement('div');
  hostEl.setAttribute(ATTR, 'shadow-host');
  Object.assign(hostEl.style, { all: 'initial', position: 'fixed', top: '0', right: '0', zIndex: '2147483646' });
  const shadow = hostEl.attachShadow({ mode: 'closed' });
  _shadowRoot = shadow;

  _bus = createEventBus(shadow);
  _bus.on(EVENTS.REFRESH, () => refresh());
  _bus.on(EVENTS.COLLAPSE_TOGGLE, () => toggleCollapse());
  _bus.on(EVENTS.DESTROY, () => { hideMarkers(); stopAnnotate(); destroy(); });
  _bus.on(EVENTS.ANNOTATION_RESOLVED, ({ uuid, resolution }) => {
    const ann = getAnnotations().find((a) => a.uuid === uuid && !a.resolved);
    if (ann) { ann.resolved = true; ann.resolution = resolution; refresh(); }
  });
  _bus.on(EVENTS.AUDIT_RESULTS, ({ audit }) => {
    const badge = _shadowRoot?.querySelector(`[${ATTR}="audit-badge"]`);
    if (badge && audit) {
      const parts = [];
      if (audit.a11y) parts.push(`${audit.a11y} a11y`);
      if (audit.layout) parts.push(`${audit.layout} layout`);
      if (audit.testids) parts.push(`${audit.testids} testids`);
      if (audit.regressions) {
        const r = audit.regressions;
        if (r.elementsRemoved) parts.push(`${r.elementsRemoved} removed`);
        if (r.elementsMoved) parts.push(`${r.elementsMoved} shifted`);
      }
      badge.textContent = parts.length ? `Auto-audit: ${parts.join(', ')}` : 'Auto-audit: no issues found';
      badge.style.display = 'block';
      badge.style.color = audit.regressions ? COLOR.errorLight : audit.total > 0 ? COLOR.warning : COLOR.success;
    }
  });

  const scrollStyle = document.createElement('style');
  scrollStyle.textContent = `:host{scrollbar-color:#2a2a3a transparent}*::-webkit-scrollbar{width:8px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:4px}*::-webkit-scrollbar-thumb:hover{background:#3a3a4a}@keyframes vg-bell-pulse{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(0)}}@keyframes vg-pulse{0%,100%{opacity:1}50%{opacity:0.3}}`;
  shadow.append(scrollStyle, sidebarEl);
  _tooltip = createTooltip(shadow);
  document.documentElement.appendChild(hostEl);

  // ── Collapsed strip ──
  const strip = createStrip({
    onExpand: () => { expand(); setCaptureMode(null); _modeBar.updateActive(null); },
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
      _modeBar.updateActive(getCaptureMode());
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

  transport.onEvent('annotation:resolved', (msg) => {
    _bus.emit(EVENTS.ANNOTATION_RESOLVED, { uuid: msg.uuid, resolution: msg.resolution });
  });
  transport.onEvent('audit:results', (msg) => {
    if (msg.audit) _bus.emit(EVENTS.AUDIT_RESULTS, { audit: msg.audit, filename: msg.filename });
  });

  // ── Keyboard shortcuts ──
  startShortcuts({
    onEscape: () => {
      if (help.isVisible()) { help.hide(); return; }
      if (settingsVisible) { hideSettings(); return; }
      if (collapseSuggestions()) return;
      hideMarkers(); stopAnnotate(); destroy();
    },
    onSend: () => { _shadowRoot?.querySelector(`[${ATTR}="send"]`)?.click(); },
    onCopyMd: () => { _shadowRoot?.querySelector(`[${ATTR}="copy-md"]`)?.click(); },
    onDelete: () => {
      const selected = getAnnotations().find((a) => a.selected);
      if (selected) { removeAnnotation(selected.id); refresh(); }
    },
    onSeverity: (sev) => {
      const selected = getAnnotations().find((a) => a.selected);
      if (selected) { updateSeverity(selected.id, sev); refresh(); }
    },
    onToggleCollapse: () => _bus.emit(EVENTS.COLLAPSE_TOGGLE),
    onClose: () => _bus.emit(EVENTS.DESTROY),
  });
}

// ──────────────────────────────────────────────
// Send Logic
// ──────────────────────────────────────────────

/** Execute the actual send-to-agent action. */
function doSend(trustOverride = false) {
  const noteInput = hostEl?.shadowRoot?.querySelector(`[${ATTR}="session-note"]`);
  const sessionNote = noteInput?.value?.trim() || undefined;
  if (noteInput) noteInput.value = '';
  chrome.runtime.sendMessage({ type: 'send-review', includeCapture: true, includeSnapshot: true, sessionNote, trustOverride }, () => {});
  for (const ann of getAnnotations()) {
    if (!ann.resolved) ann.pending = true;
  }
  refresh();
  _footer.flashSend();
}

// ──────────────────────────────────────────────
// Collapse / Expand
// ──────────────────────────────────────────────

export function collapse() {
  if (collapsed || !sidebarEl) return;
  collapsed = true;
  sidebarEl.style.transform = 'translateX(100%)';
  if (badgeEl) {
    badgeEl.style.display = 'flex';
    // Re-append if removed from DOM (some frameworks clean unknown children)
    if (!badgeEl.parentElement) document.documentElement.appendChild(badgeEl);
  }
  updateBadgeCount();
  if (_strip) _strip.updateModeButtons(getCaptureMode());

  // First-time collapse hint (shown once, tracked in storage)
  chrome.storage.local.get('vg_collapse_hint_shown', (data) => {
    if (data.vg_collapse_hint_shown) return;
    chrome.storage.local.set({ vg_collapse_hint_shown: true });
    const toast = document.createElement('div');
    Object.assign(toast.style, {
      position: 'fixed', bottom: '20px', right: '50px', zIndex: '2147483647',
      background: '#1e1e2e', color: COLOR.primaryLight, border: `1px solid ${COLOR.border}`,
      borderRadius: '8px', padding: '8px 14px', fontSize: '12px',
      fontFamily: 'system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      opacity: '0', transition: 'opacity 0.3s',
    });
    toast.textContent = 'Click elements on the page. Tap the strip to expand.';
    document.documentElement.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
  });
}

export function expand() {
  if (!collapsed || !sidebarEl) return;
  collapsed = false;
  sidebarEl.style.transform = 'translateX(0)';
  // Re-append host if removed from DOM
  if (hostEl && !hostEl.parentElement) document.documentElement.appendChild(hostEl);
  if (badgeEl) badgeEl.style.display = 'none';
  refresh();
}

export function isCollapsed() { return collapsed; }

function toggleCollapse() {
  if (collapsed) expand(); else collapse();
}

function updateBadgeCount() {
  if (_strip) _strip.updateCount();
}

// ──────────────────────────────────────────────
// Refresh
// ──────────────────────────────────────────────

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

  // Update bell
  if (_header) _header.updateBell(pendingRequests.length);

  const anns = getAnnotations();

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
        try { await transport.ackRequest(req.id); } catch { /* best effort */ }
        chrome.runtime.sendMessage({ type: 'capture', includeSnapshot: true, keepSidebar: true }, () => {
          entry.style.transition = 'background 0.3s, opacity 0.5s';
          entry.style.background = 'rgba(74, 222, 128, 0.15)';
          capBtn.textContent = '\u2713';
          capBtn.style.background = COLOR.success;
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
        try { await transport.declineRequest(req.id, 'User declined from extension'); } catch { /* best effort */ }
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
    getAnnotationCount: () => getAnnotations().length,
  });

  // Suggestions bar
  if (!_suggestionsCache) _suggestionsCache = scanForSuggestions();
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
  _footer.updateDisabledState(anns.length > 0);
}

// ──────────────────────────────────────────────
// Destroy
// ──────────────────────────────────────────────

/** Test-only accessor for the closed shadow root. */
export function _getShadowRoot() { return _shadowRoot; }

export function destroy() {
  stopShortcuts();
  stopJourney();
  stopRequestPolling();
  stopResolutionPolling();
  transport.reset();
  if (hostEl) { hostEl.remove(); hostEl = null; }
  if (sidebarEl) { sidebarEl = null; }
  _shadowRoot = null;
  if (_tooltip) { _tooltip.destroy(); _tooltip = null; }
  if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  _header = null;
  _footer = null;
  _modeBar = null;
  _strip = null;
  if (_popstateHandler) { window.removeEventListener('popstate', _popstateHandler); _popstateHandler = null; }
  if (_bus) { _bus.destroy(); _bus = null; }
  collapsed = false;
  pendingRequests = [];
  activeFilter = 'open';
  _suggestionsCache = null;
  _trustLevel = null;
}
