/**
 * Background Service Worker - ViewGraph Capture
 *
 * Orchestrates the capture flow:
 * 1. Receives "capture" message from popup
 * 2. Sends "capture" message to content script in active tab
 * 3. Takes a screenshot via captureVisibleTab
 * 4. POSTs the capture JSON to the MCP server HTTP receiver
 * 5. Returns the result to the popup
 *
 * Runs as a MV3 service worker - no persistent state. Uses chrome.storage
 * for anything that must survive termination.
 */
/* global defineBackground */

import { SERVER_BASE_URL as SERVER_URL } from '../lib/constants.js';
import { isInjectable, getBlockedReason } from '../lib/url-checks.js';
import { handleTransportMessage } from '../lib/sw/transport-handler.js';
import * as discoverySw from '../lib/sw/discovery-sw.js';
import { authenticate as swAuthenticate, restoreSession } from '../lib/sw/auth-sw.js';
import { createWsManager } from '../lib/sw/ws-manager.js';
import * as syncAlarms from '../lib/sw/sync-alarms.js';
import * as transport from '../lib/transport.js';

/** @type {ReturnType<typeof createWsManager>|null} */
let _wsManager = null;

// M19: fetchServerInfo() removed - replaced by discoverySw.restoreRegistry()
// and discoverySw.discover() in the vg-get-server handler.

/**
 * Push a capture to the MCP server. Routes to the correct server
 * based on the capture's URL and capturesDir.
 * @param {object} capture - ViewGraph JSON capture
 * @param {string|null} capturesDir - Override captures directory from project mapping
 * @returns {Promise<{ filename: string } | null>}
 */
async function pushToServer(capture, capturesDir = null) {
  try {
    const pageUrl = capture.metadata?.url || null;
    // M19: Use SW discovery instead of content script's discoverServer.
    // Falls back to SERVER_URL if no server matched.
    const serverUrl = await discoverySw.discover(pageUrl) || SERVER_URL;
    if (serverUrl) transport.init(serverUrl);
    console.log('[viewgraph] pushToServer: url', serverUrl);
    const headers = { 'content-type': 'application/json' };
    if (capturesDir) headers['x-captures-dir'] = capturesDir;
    const res = await fetch(`${serverUrl}/captures`, {
      method: 'POST',
      headers,
      body: JSON.stringify(capture),
    });
    console.log('[viewgraph] pushToServer: response', res.status);
    if (res.ok) return { ...(await res.json()), _serverUrl: serverUrl };
    const err = await res.text();
    console.error('[viewgraph] pushToServer: error', res.status, err);
  } catch (e) {
    console.error('[viewgraph] pushToServer: fetch failed', e.message);
  }
  return null;
}

/**
 * Push an HTML snapshot to the MCP server. Fails silently if server is not running.
 * @param {string} html - HTML snapshot content
 * @param {string} filenameStem - Filename without extension (matches JSON capture)
 */
async function pushSnapshot(html, filenameStem, serverUrl = SERVER_URL) {
  try {
    await fetch(`${serverUrl}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html', 'x-capture-filename': filenameStem },
      body: html,
    });
  } catch {
    // Server not running - snapshot not saved, that's fine
  }
}

/**
 * Push a screenshot PNG to the MCP server. Converts data URL to binary.
 * @param {string} dataUrl - Base64 PNG data URL from captureVisibleTab
 * @param {string} filename - Screenshot filename (e.g., viewgraph-host-ts.png)
 * @param {string} serverUrl - Server base URL
 */
async function pushScreenshot(dataUrl, filename, serverUrl = SERVER_URL) {
  try {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    await fetch(`${serverUrl}/screenshots`, {
      method: 'POST',
      headers: { 'content-type': 'image/png', 'x-capture-filename': filename },
      body: bytes,
    });
  } catch { /* server not running */ }
}

/**
 * Capture a screenshot of the visible tab area.
 * @param {number} tabId
 * @returns {Promise<string|null>} Base64 PNG data URL, or null on failure
 */
async function captureScreenshot(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch {
    return null;
  }
}

export default defineBackground(() => {
  // ---------------------------------------------------------------------------
  // Clear default popup on startup so chrome.action.onClicked fires.
  // WXT auto-sets default_popup from the popup/ entrypoint. We override it
  // to empty so icon clicks go through our onClicked handler instead.
  // The popup HTML is still available for dynamic use on non-injectable pages.
  // ---------------------------------------------------------------------------
  chrome.action.setPopup({ popup: '' });

  // M19: Restore cached server registry and auth session from storage on SW startup.
  // This enables instant server lookups before the first port scan completes.
  discoverySw.restoreRegistry();
  restoreSession();

  // M19: Start alarm-based background sync (polls resolved + pending even when sidebar closed)
  syncAlarms.startSync();
  if (chrome.alarms?.onAlarm) chrome.alarms.onAlarm.addListener(syncAlarms.onAlarm);

  // ---------------------------------------------------------------------------
  // Panic capture - instant mid-action snapshot via keyboard shortcut (Ctrl+Shift+V)
  // Captures DOM + screenshot without opening sidebar or moving focus.
  // @see docs/ideas/panic-capture.md
  // ---------------------------------------------------------------------------
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'panic-capture') return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !isInjectable(tab.url)) return;

      // Inject content script if not already loaded
      let result;
      try {
        result = await chrome.tabs.sendMessage(tab.id, { type: 'capture', includeSnapshot: true, keepSidebar: true });
      } catch {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-scripts/content.js'] });
        result = await chrome.tabs.sendMessage(tab.id, { type: 'capture', includeSnapshot: true, keepSidebar: true });
      }
      if (!result?.ok) return;

      const capture = result.capture;
      capture.metadata.captureMode = 'panic';

      // Screenshot
      const screenshot = await captureScreenshot(tab.id);
      if (screenshot) {
        const hostname = new URL(capture.metadata.url).hostname;
        const ts = capture.metadata.timestamp.replace(/[:.]/g, '').replace('T', '-').slice(0, 17);
        capture.metadata.screenshot = `viewgraph-${hostname}-${ts}.png`;
      }

      // Push to server
      const pushResult = await pushToServer(capture);
      if (screenshot && pushResult?.filename) {
        const snapshotStem = pushResult.filename.replace(/\.json$/, '');
        await pushScreenshot(screenshot, snapshotStem, pushResult._serverUrl);
      }

      // Visual feedback: brief flash via content script
      chrome.tabs.sendMessage(tab.id, { type: 'panic-flash' }).catch(() => {});
    } catch { /* best effort - don't crash on shortcut */ }
  });

  // ---------------------------------------------------------------------------
  // Extension icon click - open sidebar directly, or fallback popup for
  // non-injectable pages (chrome://, about:, etc.)
  // ---------------------------------------------------------------------------
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab?.url || !isInjectable(tab.url)) {
      // Non-injectable page: show fallback popup with error
      const reason = getBlockedReason(tab?.url);
      await chrome.storage.local.set({ 'vg-blocked-reason': reason });
      await chrome.action.setPopup({ popup: 'popup/index.html' });
      // Open the popup programmatically by simulating the action
      // Note: chrome.action.openPopup() requires Chrome 127+
      try { await chrome.action.openPopup(); } catch { /* older Chrome */ }
      return;
    }

    // Injectable page: clear popup so onClicked fires next time, then open sidebar
    await chrome.action.setPopup({ popup: '' });
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-annotate' });
    } catch {
      // Content script not injected yet - inject and retry
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-annotate' });
    }
  });

  // Reset popup to empty on tab change so onClicked fires for injectable pages
  chrome.tabs.onActivated.addListener(async () => {
    await chrome.action.setPopup({ popup: '' });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // M19: Route transport messages from content scripts to the transport handler.
    // Content scripts use transport-client.js which sends these messages instead
    // of making direct HTTP/WS calls. The handler delegates to transport.js.
    if (message.type === 'vg-transport') {
      handleTransportMessage(message, sendResponse);
      return true; // async sendResponse
    }

    // M19: Content script requests server info for a page URL.
    // SW discovery owns the registry; content script is a thin client.
    if (message.type === 'vg-get-server') {
      (async () => {
        const url = await discoverySw.discover(message.pageUrl);
        if (url) {
          // Initialize transport with discovered URL so transport-handler can use it
          transport.init(url);
          // Attempt HMAC auth if not already authenticated
          const isNative = await transport.isNative();
          if (!isNative) {
            try { await swAuthenticate(url); } catch { /* unsigned mode */ }
          }
        }
        sendResponse({
          url,
          agentName: discoverySw.getAgentName(),
        });
      })();
      return true; // async sendResponse
    }

    // M19: Return full server list for multi-project detection (12.9)
    if (message.type === 'vg-get-all-servers') {
      (async () => {
        const servers = await discoverySw.getAllServers();
        sendResponse({ servers });
      })();
      return true;
    }

    // M19: Sidebar lifecycle - connect/disconnect WebSocket via ws-manager
    if (message.type === 'vg-sidebar-opened') {
      if (!_wsManager) {
        const url = discoverySw.getServerUrl();
        if (url) _wsManager = createWsManager(url.replace('http', 'ws'));
      }
      _wsManager?.sidebarOpened();
      if (sendResponse) sendResponse({ ok: true });
      return false;
    }
    if (message.type === 'vg-sidebar-closed') {
      _wsManager?.sidebarClosed();
      if (sendResponse) sendResponse({ ok: true });
      return false;
    }

    // Open extension options page from sidebar settings
    if (message.type === 'open-options') {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      return false;
    }

    // Proxy /info fetch for content scripts (bypasses page CSP)
    if (message.type === 'fetch-info') {
      (async () => {
        try {
          const res = await fetch(`${message.serverUrl}/info`, { signal: AbortSignal.timeout(2000) });
          if (!res.ok) { sendResponse({ ok: false }); return; }
          const data = await res.json();
          sendResponse({ ok: true, ...data });
        } catch { sendResponse({ ok: false }); }
      })();
      return true; // async sendResponse
    }

    // Handle subtree capture from inspector - just push to server
    if (message.type === 'inspect-capture') {
      (async () => {
        const [_tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const result = await pushToServer(message.capture);
        sendResponse({ ok: true, pushed: !!result, filename: result?.filename });
      })();
      return true;
    }

    // Handle auto-capture from HMR detection
    if (message.type === 'auto-capture') {
      (async () => {
        const result = await pushToServer(message.capture);
        console.log(`[viewgraph] auto-capture #${message.captureNumber} (${message.hmrSource}): pushed=${!!result}`);
        sendResponse({ ok: true, pushed: !!result, filename: result?.filename });
      })();
      return true;
    }

    // Handle review-mode send - push annotated capture to server
    if (message.type === 'send-review') {
      (async () => {
        const [_tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[viewgraph] send-review: tab', _tab?.url, 'includeCapture:', message.includeCapture);
        if (!_tab?.id) { sendResponse({ ok: false, error: 'No active tab' }); return; }

        // Ask content script for annotations (and optionally a full capture with snapshot)
        const msgType = message.includeCapture ? 'send-review' : 'send-annotations-only';
        const result = await chrome.tabs.sendMessage(_tab.id, {
          type: msgType, sessionNote: message.sessionNote,
          includeSnapshot: message.includeSnapshot !== false,
        });
        console.log('[viewgraph] send-review: content script result', result?.ok);
        if (!result?.ok) { sendResponse({ ok: false, error: result?.error }); return; }

        const pushResult = await pushToServer(result.capture);

        // Push HTML snapshot if available
        if (result.snapshot && pushResult?.filename) {
          const snapshotStem = pushResult.filename.replace(/\.json$/, '');
          await pushSnapshot(result.snapshot, snapshotStem, pushResult._serverUrl);
        }

        sendResponse({ ok: true, pushed: !!pushResult, filename: pushResult?.filename });
      })();
      return true;
    }

    // Handle download report - capture viewport screenshot and send to content script for cropping
    if (message.type === 'download-report') {
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) { sendResponse({ ok: false, error: 'No active tab' }); return; }
          const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
          await chrome.tabs.sendMessage(tab.id, { type: 'build-report', screenshot: dataUrl });
          sendResponse({ ok: true });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
      })();
      return true;
    }

    if (message.type !== 'capture') return false;

    (async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse({ ok: false, error: 'No active tab' });
          return;
        }

        // Send capture message to content script, injecting it first if needed
        const captureMsg = { type: 'capture', includeSnapshot: message.includeSnapshot !== false, keepSidebar: !!message.keepSidebar, requestId: message.requestId || null };
        let result;
        try {
          result = await chrome.tabs.sendMessage(tab.id, captureMsg);
        } catch {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/content.js'],
          });
          result = await chrome.tabs.sendMessage(tab.id, captureMsg);
        }
        if (!result?.ok) {
          sendResponse({ ok: false, error: result?.error || 'Content script capture failed' });
          return;
        }

        const capture = result.capture;

        // Take screenshot and attach filename to metadata
        const screenshot = await captureScreenshot(tab.id);
        if (screenshot) {
          // Generate screenshot filename matching capture convention
          const hostname = new URL(capture.metadata.url).hostname;
          const ts = capture.metadata.timestamp.replace(/[:.]/g, '').replace('T', '-').slice(0, 17);
          capture.metadata.screenshot = `viewgraph-${hostname}-${ts}.png`;
        }

        // Push to MCP server
        const pushResult = await pushToServer(capture);
        const filename = pushResult?.filename || `viewgraph-capture-${Date.now()}.json`;

        // Push HTML snapshot if available
        if (result.snapshot && pushResult?.filename) {
          const snapshotStem = pushResult.filename.replace(/\.json$/, '');
          await pushSnapshot(result.snapshot, snapshotStem, pushResult._serverUrl);
        }

        // Push screenshot PNG if captured
        if (screenshot && capture.metadata.screenshot) {
          await pushScreenshot(screenshot, capture.metadata.screenshot, pushResult?._serverUrl);
        }
        sendResponse({
          ok: true,
          filename,
          nodeCount: capture.metadata.stats.totalNodes,
          pushed: !!pushResult,
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();

    // Return true for async sendResponse
    return true;
  });
});
