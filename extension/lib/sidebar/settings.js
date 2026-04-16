/**
 * Sidebar Settings Screen
 *
 * Overlay screen showing server connection, project mappings, and capture
 * options. Slides over the main sidebar content.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { ATTR } from '../selector.js';
// import { discoverServer, getAgentName, fetchConfig } from '../constants.js';

/**
 * Create the settings screen element.
 * @returns {{ element: HTMLElement, show: function, hide: function, isVisible: function }}
 */
export function createSettings() {
  const screen = document.createElement('div');
  screen.setAttribute(ATTR, 'settings-screen');
  Object.assign(screen.style, {
    display: 'none', padding: '0',
    position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
    background: '#1e1e2e', zIndex: '10', overflowY: 'auto',
  });

  // Header with back arrow
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', borderBottom: '1px solid #333',
  });
  const backBtn = document.createElement('button');
  backBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  Object.assign(backBtn.style, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' });
  backBtn.addEventListener('click', () => hide());
  const title = document.createElement('span');
  title.textContent = 'Settings';
  Object.assign(title.style, { color: '#a5b4fc', fontSize: '14px', fontWeight: '600' });
  header.append(backBtn, title);

  // Body
  const body = document.createElement('div');
  Object.assign(body.style, { padding: '12px', fontSize: '12px', color: '#9ca3af' });

  // Server status
  const serverLine = document.createElement('div');
  serverLine.textContent = 'Server: checking...';
  Object.assign(serverLine.style, { marginBottom: '6px' });

  // Project mappings (read-only)
  const mappingsSection = document.createElement('div');
  Object.assign(mappingsSection.style, { marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' });
  const mapLabel = document.createElement('div');
  mapLabel.textContent = 'Project Mapping';
  Object.assign(mapLabel.style, { fontWeight: '600', marginBottom: '6px' });
  const autoInfo = document.createElement('div');
  autoInfo.textContent = 'Auto-detected from server. Edit via viewgraph-init --url.';
  Object.assign(autoInfo.style, { color: '#666', fontSize: '11px', marginBottom: '8px' });
  const advLink = document.createElement('button');
  advLink.textContent = 'Advanced Settings \u2192';
  Object.assign(advLink.style, {
    border: '1px solid #333', background: 'transparent', color: '#6366f1', fontSize: '12px',
    cursor: 'pointer', padding: '6px 12px', marginTop: '10px', borderRadius: '6px',
    fontFamily: 'system-ui, sans-serif', fontWeight: '600',
  });
  advLink.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-options' }));
  mappingsSection.append(mapLabel, autoInfo, advLink);

  // Capture options
  const captureOpts = document.createElement('div');
  Object.assign(captureOpts.style, { marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' });
  const optsLabel = document.createElement('div');
  optsLabel.textContent = 'Capture includes:';
  Object.assign(optsLabel.style, { color: '#9ca3af', fontSize: '11px', marginBottom: '8px', fontWeight: '600' });
  captureOpts.appendChild(optsLabel);

  /** Build a toggle switch row. */
  function createToggleRow(labelText, opts = {}) {
    const row = document.createElement('label');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: opts.disabled ? 'default' : 'pointer',
    });
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = opts.checked || false;
    input.disabled = opts.disabled || false;
    const text = document.createElement('span');
    text.textContent = labelText;
    Object.assign(text.style, { fontSize: '12px', color: opts.disabled ? '#666' : '#c8c8d0' });
    row.append(input, text);
    return { row, input };
  }

  const jsonToggle = createToggleRow('ViewGraph JSON', { checked: true, disabled: true });
  const htmlToggle = createToggleRow('HTML snapshot');
  const ssToggle = createToggleRow('Screenshot');
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

  body.append(serverLine, mappingsSection);
  body.appendChild(captureOpts);
  screen.append(header, body);

  // Populate server info async
  function renderProjectInfo(data) {
    if (data.agent) {
      const agentLine = document.createElement('div');
      agentLine.textContent = `Agent: ${data.agent}`;
      Object.assign(agentLine.style, { color: '#9ca3af', fontSize: '11px', marginBottom: '4px' });
      mappingsSection.insertBefore(agentLine, advLink);
    }
    if (data.urlPatterns?.length) {
      for (const p of data.urlPatterns) {
        const patLine = document.createElement('div');
        patLine.textContent = `Pattern: ${p}`;
        Object.assign(patLine.style, { color: '#6366f1', fontSize: '11px', fontFamily: 'monospace', marginBottom: '2px' });
        mappingsSection.insertBefore(patLine, advLink);
      }
    }
  }

  (async () => {
    for (let port = 9876; port <= 9879; port++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          serverLine.innerHTML = `<span style="color:#4ade80">\u25cf</span> Connected (localhost:${port})`;
          try {
            const info = await fetch(`http://127.0.0.1:${port}/info`, { signal: AbortSignal.timeout(2000) }).then((r) => r.json());
            renderProjectInfo(info);
          } catch { /* info failed */ }
          return;
        }
      } catch { /* try next port */ }
    }
    serverLine.innerHTML = '<span style="color:#f87171">\u25cf</span> MCP server offline';
  })();

  let visible = false;
  function show() { visible = true; screen.style.display = 'block'; }
  function hide() { visible = false; screen.style.display = 'none'; }

  return {
    element: screen,
    show,
    hide,
    isVisible() { return visible; },
  };
}
