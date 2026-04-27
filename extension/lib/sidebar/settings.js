/**
 * Sidebar Settings Screen
 *
 * Overlay screen showing server connection, project mappings, and capture
 * options. Slides over the main sidebar content.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '#lib/selector.js';
import { chevronLeftIcon } from './icons.js';
import * as transport from '#lib/transport-client.js';
import { COLOR, FONT } from './styles.js';
import { svgFromString } from './icons.js';

/**
 * Create the settings screen element.
 * @returns {{ element: HTMLElement, show: function, hide: function, isVisible: function }}
 */
export function createSettings() {
  const screen = document.createElement('div');
  screen.setAttribute(ATTR, 'settings-screen');
  Object.assign(screen.style, {
    display: 'none', padding: '0',
    position: 'absolute', top: '0', left: '0', right: '0', bottom: '42px',
    background: '#1a1a2e', zIndex: '10', overflowY: 'auto',
  });

  // Header with back arrow
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', borderBottom: `1px solid ${COLOR.border}`,
  });
  const backBtn = document.createElement('button');
  backBtn.appendChild(chevronLeftIcon(18, COLOR.primaryLight));
  Object.assign(backBtn.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' });
  backBtn.addEventListener('click', () => hide());
  const title = document.createElement('span');
  title.textContent = 'Settings';
  Object.assign(title.style, { color: COLOR.primaryLight, fontSize: '14px', fontWeight: '600' });
  header.append(backBtn, title);

  // Body
  const body = document.createElement('div');
  Object.assign(body.style, { padding: '12px', fontSize: '12px', color: COLOR.secondary });

  // Single server card: header (status) + body (details) + footer (links)
  const serverCard = document.createElement('div');
  serverCard.setAttribute(ATTR, 'server-card');
  Object.assign(serverCard.style, {
    background: COLOR.bgCard, border: `1px solid ${COLOR.borderLight}`, borderRadius: '8px',
    marginBottom: '10px', overflow: 'hidden',
  });

  // Card header - connection status
  const cardHeader = document.createElement('div');
  Object.assign(cardHeader.style, {
    padding: '8px 10px', borderBottom: `1px solid ${COLOR.borderLight}`,
    display: 'flex', alignItems: 'center', gap: '6px',
  });
  const statusDotEl = document.createElement('span');
  Object.assign(statusDotEl.style, { width: '6px', height: '6px', borderRadius: '50%', background: COLOR.muted, flexShrink: '0' });
  const statusText = document.createElement('span');
  statusText.textContent = 'Checking...';
  Object.assign(statusText.style, { fontSize: '11px', fontWeight: '600', color: COLOR.secondary });
  cardHeader.append(statusDotEl, statusText);

  // Card body - project details (populated by renderProjectInfo)
  const cardBody = document.createElement('div');
  cardBody.setAttribute(ATTR, 'project-details');
  Object.assign(cardBody.style, { padding: '8px 10px', fontSize: '11px' });
  const noDetailsMsg = document.createElement('div');
  noDetailsMsg.textContent = 'No project mapping available. Start a server to see details.';
  Object.assign(noDetailsMsg.style, { color: COLOR.dim, fontStyle: 'italic', fontSize: '10px' });
  cardBody.appendChild(noDetailsMsg);

  // Card footer - help link (left) + advanced settings (right)
  const cardFooter = document.createElement('div');
  Object.assign(cardFooter.style, {
    padding: '6px 10px', borderTop: `1px solid ${COLOR.borderLight}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  });
  const helpLink = document.createElement('a');
  helpLink.replaceChildren(svgFromString('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'), document.createTextNode('URL mapping docs'));
  helpLink.href = 'https://chaoslabz.gitbook.io/viewgraph/getting-started/multi-project';
  helpLink.target = '_blank';
  Object.assign(helpLink.style, { color: COLOR.primaryHover, fontSize: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' });
  helpLink.addEventListener('mouseenter', () => { helpLink.style.textDecoration = 'underline'; });
  helpLink.addEventListener('mouseleave', () => { helpLink.style.textDecoration = 'none'; });
  const advLink = document.createElement('a');
  advLink.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>All servers';
  advLink.href = '#';
  Object.assign(advLink.style, { color: COLOR.primaryHover, fontSize: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' });
  advLink.addEventListener('mouseenter', () => { advLink.style.textDecoration = 'underline'; });
  advLink.addEventListener('mouseleave', () => { advLink.style.textDecoration = 'none'; });

  // Inline all-servers section (collapsible)
  const allServersSection = document.createElement('div');
  allServersSection.setAttribute(ATTR, 'all-servers');
  Object.assign(allServersSection.style, { display: 'none', padding: '8px 10px', borderTop: `1px solid ${COLOR.borderLight}`, fontSize: '11px' });

  advLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (allServersSection.style.display === 'none') {
      allServersSection.style.display = 'block';
      advLink.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><polyline points="18 15 12 9 6 15"/></svg>All servers';
      // Fetch all servers
      allServersSection.textContent = 'Scanning...';
      try {
        const { getAllServers } = await import('#lib/discovery.js');
        const servers = await getAllServers();
        allServersSection.replaceChildren();
        if (servers.length === 0) {
          allServersSection.textContent = 'No servers running.';
        } else {
          for (const s of servers) {
            const row = document.createElement('div');
            Object.assign(row.style, { padding: '4px 0', borderBottom: `1px solid ${COLOR.borderLight}` });
            const port = document.createElement('span');
            const portNum = s.url ? new URL(s.url).port || '9876' : '?';
            port.textContent = `:${portNum}`;
            Object.assign(port.style, { color: COLOR.primary, fontFamily: 'monospace', marginRight: '6px' });
            const root = document.createElement('span');
            root.textContent = s.projectRoot || 'unknown';
            Object.assign(root.style, { color: COLOR.dim, fontFamily: 'monospace', fontSize: '10px' });
            row.append(port, root);
            if (s.urlPatterns?.length) {
              const pats = document.createElement('div');
              pats.textContent = s.urlPatterns.join(', ');
              Object.assign(pats.style, { color: COLOR.muted, fontSize: '9px', marginTop: '2px' });
              row.appendChild(pats);
            }
            allServersSection.appendChild(row);
          }
        }
      } catch { allServersSection.textContent = 'Failed to scan.'; }
    } else {
      allServersSection.style.display = 'none';
      advLink.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>All servers';
    }
  });
  cardFooter.append(helpLink, advLink);

  serverCard.append(cardHeader, cardBody, cardFooter, allServersSection);

  // Capture options
  const captureOpts = document.createElement('div');
  Object.assign(captureOpts.style, { marginTop: '12px', borderTop: `1px solid ${COLOR.border}`, paddingTop: '10px' });
  const optsLabel = document.createElement('div');
  optsLabel.textContent = 'Capture includes:';
  Object.assign(optsLabel.style, { color: COLOR.secondary, fontSize: '11px', marginBottom: '8px', fontWeight: '600' });
  captureOpts.appendChild(optsLabel);

  /** Build a toggle switch row. */
  function createToggleRow(labelText, opts = {}) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0',
      cursor: opts.disabled ? 'default' : 'pointer',
    });
    const text = document.createElement('span');
    text.textContent = labelText;
    Object.assign(text.style, { fontSize: '12px', color: opts.disabled ? COLOR.muted : COLOR.text });
    // Hidden checkbox for state
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = opts.checked || false;
    input.disabled = opts.disabled || false;
    Object.assign(input.style, { display: 'none' });
    // Visual toggle button
    const toggle = document.createElement('span');
    function syncToggle() {
      toggle.textContent = input.checked ? 'ON' : 'OFF';
      Object.assign(toggle.style, {
        borderRadius: '10px', padding: '2px 10px', fontSize: '10px',
        fontWeight: '700', fontFamily: FONT,
        background: input.checked ? COLOR.successDark : COLOR.border,
        color: input.checked ? COLOR.success : COLOR.muted,
        border: 'none',
      });
    }
    syncToggle();
    if (!opts.disabled) {
      row.addEventListener('click', () => { input.checked = !input.checked; syncToggle(); input.dispatchEvent(new Event('change')); });
    }
    row.append(text, input, toggle);
    return { row, input };
  }

  const jsonToggle = createToggleRow('ViewGraph JSON', { checked: true, disabled: true });
  jsonToggle.row.setAttribute('data-tooltip', 'Always included - structured DOM capture');
  const htmlToggle = createToggleRow('HTML snapshot');
  htmlToggle.row.setAttribute('data-tooltip', 'Include raw HTML for fidelity comparison');
  const ssToggle = createToggleRow('Screenshot');
  ssToggle.row.setAttribute('data-tooltip', 'Include viewport screenshot with capture');
  captureOpts.append(jsonToggle.row, htmlToggle.row, ssToggle.row);

  // Load saved settings
  chrome.storage.local.get('vg-settings', (result) => {
    const s = result['vg-settings'] || {};
    htmlToggle.input.checked = !!s.html;
    ssToggle.input.checked = !!s.screenshot;
  });
  function saveSettings() {
    chrome.storage.local.set({ 'vg-settings': { html: htmlToggle.input.checked, screenshot: ssToggle.input.checked } });
  }
  htmlToggle.input.addEventListener('change', saveSettings);
  ssToggle.input.addEventListener('change', saveSettings);

  body.append(serverCard);
  body.appendChild(captureOpts);
  screen.append(header, body);

  // Populate server info async
  function renderProjectInfo(data) {
    cardBody.replaceChildren();
    let hasContent = false;
    const rowStyle = { display: 'flex', gap: '6px', marginBottom: '2px', alignItems: 'baseline' };
    const lblStyle = { color: COLOR.muted, fontSize: '11px', flexShrink: '0' };
    const valStyle = { fontSize: '11px' };
    const pillStyle = { background: 'rgba(99,102,241,0.15)', color: COLOR.primaryLight, padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace' };

    // Version info row
    const extVer = chrome.runtime.getManifest?.()?.version || '?';
    const srvVer = data.serverVersion || '?';
    const port = data._port || '?';
    const verRow = document.createElement('div');
    Object.assign(verRow.style, { ...rowStyle, marginBottom: '6px', paddingBottom: '6px', borderBottom: `1px solid ${COLOR.borderLight}` });
    for (const [label, value] of [['Ext', `v${extVer}`], ['Server', `v${srvVer}`], ['Port', port]]) {
      const lbl = document.createElement('span');
      lbl.textContent = label;
      Object.assign(lbl.style, { ...lblStyle, marginRight: '2px' });
      const val = document.createElement('span');
      val.textContent = value;
      Object.assign(val.style, pillStyle);
      const spacer = document.createElement('span');
      spacer.style.marginRight = '8px';
      verRow.append(lbl, val, spacer);
    }
    cardBody.appendChild(verRow);

    // Idle timeout info
    if (data.idleTimeoutMinutes != null) {
      const idleRow = document.createElement('div');
      Object.assign(idleRow.style, { ...rowStyle, marginBottom: '4px' });
      const idleLbl = document.createElement('span');
      idleLbl.textContent = 'Idle timeout:';
      Object.assign(idleLbl.style, lblStyle);
      const idleVal = document.createElement('span');
      idleVal.textContent = data.idleTimeoutMinutes > 0 ? `${data.idleTimeoutMinutes}min (resets on activity)` : 'disabled';
      Object.assign(idleVal.style, { ...valStyle, color: COLOR.dim });
      idleRow.append(idleLbl, idleVal);
      cardBody.appendChild(idleRow);
    }

    if (data.agent) {
      const row = document.createElement('div');
      Object.assign(row.style, rowStyle);
      const lbl = document.createElement('span');
      lbl.textContent = 'Agent:';
      Object.assign(lbl.style, lblStyle);
      const val = document.createElement('span');
      val.textContent = data.agent;
      Object.assign(val.style, { color: COLOR.success, fontSize: '11px' });
      row.append(lbl, val);
      cardBody.appendChild(row);
      hasContent = true;
    }
    if (data.urlPatterns?.length) {
      const row = document.createElement('div');
      Object.assign(row.style, rowStyle);
      const lbl = document.createElement('span');
      lbl.textContent = 'URL:';
      Object.assign(lbl.style, lblStyle);
      const val = document.createElement('span');
      val.textContent = data.urlPatterns.join(', ');
      Object.assign(val.style, { color: COLOR.primary, fontFamily: 'monospace', fontSize: '11px' });
      row.append(lbl, val);
      cardBody.appendChild(row);
      hasContent = true;
    }
    if (data.projectRoot) {
      const row = document.createElement('div');
      Object.assign(row.style, rowStyle);
      const lbl = document.createElement('span');
      lbl.textContent = 'Root:';
      Object.assign(lbl.style, lblStyle);
      const val = document.createElement('span');
      val.textContent = data.projectRoot;
      Object.assign(val.style, { color: COLOR.dim, fontFamily: 'monospace', fontSize: '11px' });
      row.append(lbl, val);
      cardBody.appendChild(row);
      hasContent = true;
    }
    cardBody.style.display = 'block';
  }

  /** Fetch server info and update the settings display. */
  async function refreshServerInfo() {
    try {
      const info = await transport.getInfo();
      if (!info) throw new Error('no info');
      // Verify this server actually matches the current page URL
      const pageUrl = window.location.href;
      const patterns = info.urlPatterns || [];
      const root = info.projectRoot || '';
      const isFileUrl = pageUrl.startsWith('file://');
      // S5-4: Match hostname+port only, not full URL string
      let isMatch = false;
      if (isFileUrl) {
        isMatch = pageUrl.includes(root.replace(/\\/g, '/'));
      } else {
        try {
          const parsed = new URL(pageUrl);
          const hostPort = `${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
          isMatch = patterns.some((p) => hostPort.includes(p));
        } catch { /* invalid URL */ }
      }
      if (!isMatch) {
        statusDotEl.style.background = COLOR.muted;
        statusText.textContent = 'No matching server for this page';
        statusText.style.color = COLOR.muted;
        cardBody.replaceChildren();
        return;
      }
      const serverUrl = await transport.getServerUrl?.() || '';
      renderProjectInfo({ ...info, _port: serverUrl.match(/:(\d+)/)?.[1] || '?' });
      statusDotEl.style.background = COLOR.success;
      statusText.textContent = 'Server Connected';
      statusText.style.color = COLOR.success;
    } catch {
      statusDotEl.style.background = COLOR.errorLight;
      statusText.textContent = 'Server Not Connected';
      statusText.style.color = COLOR.errorLight;
    }
  }

  let visible = false;
  let _onHide = null;
  function show() { visible = true; screen.style.display = 'block'; refreshServerInfo(); }
  function hide() { visible = false; screen.style.display = 'none'; if (_onHide) _onHide(); }

  return {
    element: screen,
    show,
    hide,
    isVisible() { return visible; },
    set onHide(fn) { _onHide = fn; },
  };
}
