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
import * as transport from '#lib/transport.js';

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
  backBtn.appendChild(chevronLeftIcon(18, '#a5b4fc'));
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
  // Server + project status (single box, no redundant headers)
  const serverLine = document.createElement('div');
  serverLine.setAttribute(ATTR, 'server-status');
  Object.assign(serverLine.style, { display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' });
  const srvLabel = document.createElement('span');
  srvLabel.textContent = 'Server:';
  Object.assign(srvLabel.style, { color: '#666' });
  const srvValue = document.createElement('span');
  srvValue.textContent = 'checking...';
  Object.assign(srvValue.style, { color: '#9ca3af' });
  serverLine.append(srvLabel, srvValue);

  const mappingsSection = document.createElement('div');
  Object.assign(mappingsSection.style, {
    background: '#16161e', border: '1px solid #2a2a3a', borderRadius: '6px',
    padding: '10px', marginBottom: '8px',
  });

  // Info box with code-styled command and help link
  const infoBox = document.createElement('div');
  Object.assign(infoBox.style, {
    background: '#16161e', border: '1px solid #2a2a3a', borderRadius: '6px',
    padding: '8px 10px', marginBottom: '8px', fontSize: '11px', color: '#9ca3af', lineHeight: '1.5',
  });
  const infoText = document.createElement('span');
  infoText.textContent = 'Auto-detected from server. Edit via ';
  const codeEl = document.createElement('code');
  codeEl.textContent = 'viewgraph-init --url';
  Object.assign(codeEl.style, { background: '#1e1e2e', padding: '1px 4px', borderRadius: '3px', color: '#a5b4fc', fontSize: '10px' });
  infoBox.append(infoText, codeEl);
  const helpLink = document.createElement('a');
  helpLink.textContent = 'Multi-project setup guide';
  helpLink.href = 'https://chaoslabz.gitbook.io/viewgraph/getting-started/multi-project';
  helpLink.target = '_blank';
  Object.assign(helpLink.style, { display: 'block', marginTop: '4px', color: '#6366f1', fontSize: '10px', textDecoration: 'none' });
  infoBox.appendChild(helpLink);

  // Project details box (agent, patterns rendered here)
  const detailsBox = document.createElement('div');
  detailsBox.setAttribute(ATTR, 'project-details');
  Object.assign(detailsBox.style, {
    background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '6px',
    padding: '8px 10px', marginBottom: '8px', display: 'none',
  });

  const advLink = document.createElement('button');
  advLink.textContent = 'Advanced Settings →';
  Object.assign(advLink.style, {
    border: '1px solid #333', background: 'transparent', color: '#6366f1', fontSize: '12px',
    cursor: 'pointer', padding: '6px 12px', marginTop: '10px', borderRadius: '6px',
    fontFamily: 'system-ui, sans-serif', fontWeight: '600',
  });
  advLink.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-options' }));
  mappingsSection.append(serverLine, infoBox, detailsBox, advLink);

  // Capture options
  const captureOpts = document.createElement('div');
  Object.assign(captureOpts.style, { marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' });
  const optsLabel = document.createElement('div');
  optsLabel.textContent = 'Capture includes:';
  Object.assign(optsLabel.style, { color: '#9ca3af', fontSize: '11px', marginBottom: '8px', fontWeight: '600' });
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
    Object.assign(text.style, { fontSize: '12px', color: opts.disabled ? '#666' : '#c8c8d0' });
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
        fontWeight: '700', fontFamily: 'system-ui, sans-serif',
        background: input.checked ? '#166534' : '#333',
        color: input.checked ? '#4ade80' : '#666',
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

  body.append(mappingsSection);
  body.appendChild(captureOpts);
  screen.append(header, body);

  // Populate server info async
  function renderProjectInfo(data) {
    detailsBox.replaceChildren();
    let hasContent = false;
    if (data.agent) {
      const agentLine = document.createElement('div');
      agentLine.textContent = `Agent: ${data.agent}`;
      Object.assign(agentLine.style, { color: '#9ca3af', fontSize: '11px', marginBottom: '4px' });
      detailsBox.appendChild(agentLine);
      hasContent = true;
    }
    if (data.urlPatterns?.length) {
      for (const p of data.urlPatterns) {
        const patLine = document.createElement('div');
        patLine.textContent = `Pattern: ${p}`;
        Object.assign(patLine.style, { color: '#6366f1', fontSize: '11px', fontFamily: 'monospace', marginBottom: '2px' });
        detailsBox.appendChild(patLine);
        hasContent = true;
      }
    }
    if (data.projectRoot) {
      const rootLine = document.createElement('div');
      rootLine.textContent = `Root: ${data.projectRoot}`;
      Object.assign(rootLine.style, { color: '#666', fontSize: '10px', marginTop: '4px', fontFamily: 'monospace' });
      detailsBox.appendChild(rootLine);
      hasContent = true;
    }
    detailsBox.style.display = hasContent ? 'block' : 'none';
  }

  /** Fetch server info and update the settings display. */
  async function refreshServerInfo() {
    try {
      const info = await transport.getInfo();
      if (info) {
        renderProjectInfo(info);
        srvValue.textContent = 'Connected'; srvValue.style.color = '#4ade80';
      } else {
        srvValue.textContent = 'Not connected'; srvValue.style.color = '#f87171';
      }
    } catch {
      srvValue.textContent = 'Not connected'; srvValue.style.color = '#f87171';
    }
  }

  let visible = false;
  function show() { visible = true; screen.style.display = 'block'; refreshServerInfo(); }
  function hide() { visible = false; screen.style.display = 'none'; }

  return {
    element: screen,
    show,
    hide,
    isVisible() { return visible; },
  };
}
