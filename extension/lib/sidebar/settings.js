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

  // Single server card: header (status) + body (details) + footer (links)
  const serverCard = document.createElement('div');
  serverCard.setAttribute(ATTR, 'server-card');
  Object.assign(serverCard.style, {
    background: '#16161e', border: '1px solid #2a2a3a', borderRadius: '8px',
    marginBottom: '10px', overflow: 'hidden',
  });

  // Card header - connection status
  const cardHeader = document.createElement('div');
  Object.assign(cardHeader.style, {
    padding: '8px 10px', borderBottom: '1px solid #2a2a3a',
    display: 'flex', alignItems: 'center', gap: '6px',
  });
  const statusDotEl = document.createElement('span');
  Object.assign(statusDotEl.style, { width: '6px', height: '6px', borderRadius: '50%', background: '#666', flexShrink: '0' });
  const statusText = document.createElement('span');
  statusText.textContent = 'Checking...';
  Object.assign(statusText.style, { fontSize: '11px', fontWeight: '600', color: '#9ca3af' });
  cardHeader.append(statusDotEl, statusText);

  // Card body - project details (populated by renderProjectInfo)
  const cardBody = document.createElement('div');
  cardBody.setAttribute(ATTR, 'project-details');
  Object.assign(cardBody.style, { padding: '8px 10px', fontSize: '11px' });
  const noDetailsMsg = document.createElement('div');
  noDetailsMsg.textContent = 'No project mapping available. Start a server to see details.';
  Object.assign(noDetailsMsg.style, { color: '#555', fontStyle: 'italic', fontSize: '10px' });
  cardBody.appendChild(noDetailsMsg);

  // Card footer - help link (left) + advanced settings (right)
  const cardFooter = document.createElement('div');
  Object.assign(cardFooter.style, {
    padding: '6px 10px', borderTop: '1px solid #2a2a3a',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  });
  const helpLink = document.createElement('a');
  helpLink.textContent = 'URL mapping docs';
  helpLink.href = 'https://chaoslabz.gitbook.io/viewgraph/getting-started/multi-project';
  helpLink.target = '_blank';
  Object.assign(helpLink.style, { color: '#666', fontSize: '10px', textDecoration: 'none' });
  helpLink.addEventListener('mouseenter', () => { helpLink.style.color = '#6366f1'; });
  helpLink.addEventListener('mouseleave', () => { helpLink.style.color = '#666'; });
  const advLink = document.createElement('a');
  advLink.textContent = 'All servers \u2192';
  advLink.href = '#';
  Object.assign(advLink.style, { color: '#666', fontSize: '10px', textDecoration: 'none' });
  advLink.addEventListener('mouseenter', () => { advLink.style.color = '#6366f1'; });
  advLink.addEventListener('mouseleave', () => { advLink.style.color = '#666'; });
  advLink.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.sendMessage({ type: 'open-options' }); });
  cardFooter.append(helpLink, advLink);

  serverCard.append(cardHeader, cardBody, cardFooter);

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

  body.append(serverCard);
  body.appendChild(captureOpts);
  screen.append(header, body);

  // Populate server info async
  function renderProjectInfo(data) {
    cardBody.replaceChildren();
    let hasContent = false;
    if (data.agent) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', gap: '6px', marginBottom: '2px' });
      const lbl = document.createElement('span');
      lbl.textContent = 'Agent:';
      Object.assign(lbl.style, { color: '#666' });
      const val = document.createElement('span');
      val.textContent = data.agent;
      Object.assign(val.style, { color: '#4ade80' });
      row.append(lbl, val);
      cardBody.appendChild(row);
      hasContent = true;
    }
    if (data.urlPatterns?.length) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', gap: '6px', marginBottom: '2px' });
      const lbl = document.createElement('span');
      lbl.textContent = 'URL:';
      Object.assign(lbl.style, { color: '#666' });
      const val = document.createElement('span');
      val.textContent = data.urlPatterns.join(', ');
      Object.assign(val.style, { color: '#6366f1', fontFamily: 'monospace', fontSize: '10px' });
      row.append(lbl, val);
      cardBody.appendChild(row);
      hasContent = true;
    }
    if (data.projectRoot) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', gap: '6px' });
      const lbl = document.createElement('span');
      lbl.textContent = 'Root:';
      Object.assign(lbl.style, { color: '#666' });
      const val = document.createElement('span');
      val.textContent = data.projectRoot;
      Object.assign(val.style, { color: '#555', fontFamily: 'monospace', fontSize: '10px' });
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
      if (info) {
        renderProjectInfo(info);
        statusDotEl.style.background = '#4ade80';
        statusText.textContent = 'Server Connected';
        statusText.style.color = '#4ade80';
      } else {
        statusDotEl.style.background = '#f87171';
        statusText.textContent = 'Server Not Connected';
        statusText.style.color = '#f87171';
      }
    } catch {
      statusDotEl.style.background = '#f87171';
      statusText.textContent = 'Server Not Connected';
      statusText.style.color = '#f87171';
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
