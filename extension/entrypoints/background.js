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

import { SERVER_BASE_URL as SERVER_URL, discoverServer } from '../lib/constants.js';
import { isInjectable, getBlockedReason } from '../lib/url-checks.js';

const PROJECT_MAPPINGS_KEY = 'vg-project-mappings';
const AUTO_MAPPING_KEY = 'vg-auto-mapping';
const OVERRIDE_KEY = 'vg-override-enabled';

/**
 * Fetch /info from the connected server and store the auto-detected
 * project mapping. Called on startup and after successful server discovery.
 */
async function fetchServerInfo() {
  try {
    const serverUrl = await discoverServer();
    if (!serverUrl) return;
    const res = await fetch(`${serverUrl}/info`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return;
    const info = await res.json();
    await chrome.storage.local.set({ [AUTO_MAPPING_KEY]: { capturesDir: info.capturesDir, projectRoot: info.projectRoot, serverUrl, detectedAt: Date.now() } });
  } catch { /* server not responding */ }
}

/**
 * Look up the capturesDir for a given page URL.
 * Priority: manual overrides (if enabled) > auto-detected from server /info.
 * Returns null if no mapping found (server uses its default).
 */
async function lookupCapturesDir(pageUrl) {
  // Check if manual overrides are enabled
  const { [OVERRIDE_KEY]: overrideEnabled } = await chrome.storage.local.get(OVERRIDE_KEY);
  if (overrideEnabled) {
    const result = await chrome.storage.sync.get(PROJECT_MAPPINGS_KEY);
    const mappings = result[PROJECT_MAPPINGS_KEY] || [];
    for (const { pattern, dir } of mappings) {
      if (pattern === '*' || pageUrl.includes(pattern)) return dir;
    }
  }
  // Fall back to auto-detected mapping
  const { [AUTO_MAPPING_KEY]: auto } = await chrome.storage.local.get(AUTO_MAPPING_KEY);
  return auto?.capturesDir || null;
}

/**
 * Read the shared secret from chrome.storage. Returns null if not set.
 * The user configures this in the extension options page after starting
 * the MCP server (which logs the token to stderr).
 */
async function getSecret() {
  try {
    const { httpSecret } = await chrome.storage.local.get('httpSecret');
    return httpSecret || null;
  } catch {
    return null;
  }
}

/**
 * Build auth headers. Includes Bearer token when a secret is configured.
 */
async function authHeaders() {
  const secret = await getSecret();
  return secret ? { authorization: `Bearer ${secret}` } : {};
}

/**
 * Push a capture to the MCP server. Fails silently if server is not running.
 * @param {object} capture - ViewGraph JSON capture
 * @param {string|null} capturesDir - Override captures directory from project mapping
 * @returns {Promise<{ filename: string } | null>}
 */
async function pushToServer(capture, capturesDir = null) {
  try {
    const serverUrl = await discoverServer(capturesDir) || SERVER_URL;
    console.log('[viewgraph] pushToServer: url', serverUrl, 'capturesDir', capturesDir);
    const auth = await authHeaders();
    const headers = { 'content-type': 'application/json', ...auth };
    if (capturesDir) headers['x-captures-dir'] = capturesDir;
    const res = await fetch(`${serverUrl}/captures`, {
      method: 'POST',
      headers,
      body: JSON.stringify(capture),
    });
    console.log('[viewgraph] pushToServer: response', res.status);
    if (res.ok) return await res.json();
    const err = await res.text();
    console.error('[viewgraph] pushToServer: error', res.status, err);
  } catch (e) {
    console.error('[viewgraph] pushToServer: fetch failed', e.message);
  }
  return null;
}

/**
 * Capture a screenshot of the visible tab area.
 * @param {number} tabId
/**
 * Push an HTML snapshot to the MCP server. Fails silently if server is not running.
 * @param {string} html - HTML snapshot content
 * @param {string} filenameStem - Filename without extension (matches JSON capture)
 */
async function pushSnapshot(html, filenameStem) {
  try {
    const auth = await authHeaders();
    await fetch(`${SERVER_URL}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html', 'x-capture-filename': filenameStem, ...auth },
      body: html,
    });
  } catch {
    // Server not running - snapshot not saved, that's fine
  }
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

  // Auto-detect project mapping from server on startup
  fetchServerInfo();

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
    // Open extension options page from sidebar settings
    if (message.type === 'open-options') {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      return false;
    }

    // Handle subtree capture from inspector - just push to server
    if (message.type === 'inspect-capture') {
      (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dir = tab?.url ? await lookupCapturesDir(tab.url) : null;
        const result = await pushToServer(message.capture, dir);
        sendResponse({ ok: true, pushed: !!result, filename: result?.filename });
      })();
      return true;
    }

    // Handle review-mode send - push annotated capture to server
    if (message.type === 'send-review') {
      (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[viewgraph] send-review: tab', tab?.url, 'includeCapture:', message.includeCapture);
        if (!tab?.id) { sendResponse({ ok: false, error: 'No active tab' }); return; }

        // Ask content script for annotations (and optionally a full capture)
        const msgType = message.includeCapture ? 'send-review' : 'send-annotations-only';
        const result = await chrome.tabs.sendMessage(tab.id, { type: msgType });
        console.log('[viewgraph] send-review: content script result', result?.ok);
        if (!result?.ok) { sendResponse({ ok: false, error: result?.error }); return; }

        const dir = tab.url ? await lookupCapturesDir(tab.url) : null;
        const pushResult = await pushToServer(result.capture, dir);
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
        const captureMsg = { type: 'capture', includeSnapshot: true };
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
        const dir = tab.url ? await lookupCapturesDir(tab.url) : null;
        const pushResult = await pushToServer(capture, dir);
        const filename = pushResult?.filename || `viewgraph-capture-${Date.now()}.json`;

        // Push HTML snapshot if available
        if (result.snapshot && pushResult?.filename) {
          const snapshotStem = pushResult.filename.replace(/\.json$/, '');
          await pushSnapshot(result.snapshot, snapshotStem);
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
