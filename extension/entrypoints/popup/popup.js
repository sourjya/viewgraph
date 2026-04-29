/**
 * Popup Script - ViewGraph Capture
 *
 * Two modes:
 * 1. Fallback mode: shown on non-injectable pages with a blocked reason message
 * 2. Normal mode: Capture/Annotate buttons (legacy, kept for compatibility)
 */

// Check if we're in fallback mode (non-injectable page)
chrome.storage.local.get('vg-blocked-reason', (result) => {
  const reason = result['vg-blocked-reason'];
  if (reason) {
    // Clear the reason so it doesn't persist
    chrome.storage.local.remove('vg-blocked-reason');
    // Show blocked message instead of normal UI
    const container = document.querySelector('.container');
    container.replaceChildren();
    const header = document.createElement('div');
    header.className = 'header';
    const img = document.createElement('img');
    img.src = '/icon-48.png'; img.width = 20; img.height = 20; img.alt = '';
    const h1 = document.createElement('h1');
    h1.textContent = 'ViewGraph';
    header.append(img, h1);
    const msg = document.createElement('div');
    Object.assign(msg.style, { padding: '8px 0', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' });
    msg.textContent = reason;
    container.append(header, msg);
    // Reset popup so next click on injectable page goes through onClicked
    chrome.action.setPopup({ popup: '' });
    return;
  }
});

const captureBtn = document.getElementById('captureBtn');
const annotateBtn = document.getElementById('annotateBtn');
const statusEl = document.getElementById('status');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const captureHtml = document.getElementById('captureHtml');
const captureScreenshot = document.getElementById('captureScreenshot');

// Settings toggle
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('visible');
});

// Load saved settings
chrome.storage.local.get('vg-settings', (result) => {
  const s = result['vg-settings'] || {};
  captureHtml.checked = !!s.html;
  captureScreenshot.checked = !!s.screenshot;
});

// Save on change
function saveSettings() {
  chrome.storage.local.set({ 'vg-settings': { html: captureHtml.checked, screenshot: captureScreenshot.checked } });
}
captureHtml.addEventListener('change', saveSettings);
captureScreenshot.addEventListener('change', saveSettings);

/** Show a status message with a given type (info, success, error). */
function showStatus(type, message) {
  statusEl.className = `status visible ${type}`;
  statusEl.textContent = message;
}

captureBtn.addEventListener('click', async () => {
  captureBtn.disabled = true;
  captureBtn.textContent = 'Capturing...';
  showStatus('info', 'Traversing DOM...');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'capture',
      includeSnapshot: captureHtml.checked,
      includeScreenshot: captureScreenshot.checked,
    });
    if (response?.ok) {
      const { nodeCount } = response;
      showStatus('success', `Captured ${nodeCount} elements`);
    } else {
      showStatus('error', response?.error || 'Capture failed');
    }
  } catch (err) {
    showStatus('error', err.message);
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = 'Capture Page';
  }
});

/** Toggle inspect mode on the active tab. */
annotateBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showStatus('error', 'No active tab'); return; }
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-annotate' });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-annotate' });
    }
    window.close();
  } catch (err) {
    showStatus('error', err.message);
  }
});

// ---------------------------------------------------------------------------
// Connection status - ping MCP server health endpoint on popup open
// ---------------------------------------------------------------------------

import { discoverServer } from '../../lib/constants.js';

const connDot = document.getElementById('connDot');
const connText = document.getElementById('connText');

(async () => {
  try {
    const serverUrl = await discoverServer();
    if (!serverUrl) throw new Error('No server found');
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    const port = new URL(serverUrl).port;
    connDot.className = 'conn-dot connected';
    connText.textContent = data.writable ? 'MCP connected' : 'Connected (dir not writable)';
    connText.title = `Server: localhost:${port}\nCaptures: ${data.capturesDir || 'unknown'}`;
  } catch {
    connDot.className = 'conn-dot failed';
    connText.textContent = 'MCP server offline';
  }
})();
