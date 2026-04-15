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

import { SERVER_BASE_URL as SERVER_URL, discoverServer, getAllServers } from '../lib/constants.js';
import { isInjectable, getBlockedReason } from '../lib/url-checks.js';

const PROJECT_MAPPINGS_KEY = 'vg-project-mappings';
const AUTO_MAPPING_KEY = 'vg-auto-mapping';
const OVERRIDE_KEY = 'vg-override-enabled';

/**
 * Fetch /info from ALL running servers and store the mappings.
 * Called on startup and periodically. Replaces the old single-server
 * fetchServerInfo() that only cached one mapping.
 *
 * @see docs/bugs/BUG-009-multi-project-routing.md
 */
async function fetchServerInfo() {
  try {
    const servers = await getAllServers();
    if (servers.length === 0) return;
    // Store all server mappings for lookupCapturesDir
    const mappings = servers.map((s) => ({
      capturesDir: s.capturesDir,
      projectRoot: s.projectRoot,
      urlPatterns: s.urlPatterns || [],
      serverUrl: s.url,
      detectedAt: Date.now(),
    }));
    await chrome.storage.local.set({ [AUTO_MAPPING_KEY]: mappings });
  } catch { /* servers not responding */ }
}

/**
 * Look up the capturesDir for a given page URL.
 * Matches the page URL against all known server projectRoots.
 * Priority: manual overrides > file:// path match > first available.
 *
 * @see docs/bugs/BUG-009-multi-project-routing.md
 */
// eslint-disable-next-line no-unused-vars
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
  // Match against all auto-detected server mappings
  const { [AUTO_MAPPING_KEY]: autoMappings } = await chrome.storage.local.get(AUTO_MAPPING_KEY);
  const mappings = Array.isArray(autoMappings) ? autoMappings : (autoMappings ? [autoMappings] : []);

  // For file:// URLs, match by projectRoot prefix (longest wins)
  if (pageUrl?.startsWith('file://')) {
    const filePath = decodeURIComponent(pageUrl.replace('file://', ''));
    let bestMatch = null;
    let bestLen = 0;
    for (const m of mappings) {
      if (m.projectRoot && filePath.startsWith(m.projectRoot) && m.projectRoot.length > bestLen) {
        bestMatch = m.capturesDir;
        bestLen = m.projectRoot.length;
      }
    }
    if (bestMatch) return bestMatch;
  }

  // For localhost/remote URLs, match by urlPatterns
  if (pageUrl) {
    for (const m of mappings) {
      for (const pattern of m.urlPatterns || []) {
        if (pageUrl.includes(pattern)) return m.capturesDir;
      }
    }
  }

  // Fallback: return first available
  return mappings[0]?.capturesDir || null;
}

/**
 * Read the shared secret from chrome.storage. Returns null if not set.
 * The user configures this in the extension options page after starting
 * the MCP server (which logs the token to stderr).
 */

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
    const serverUrl = await discoverServer(pageUrl, capturesDir) || SERVER_URL;
    console.log('[viewgraph] pushToServer: url', serverUrl);
    const headers = { 'content-type': 'application/json' };
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
    await fetch(`${SERVER_URL}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'text/html', 'x-capture-filename': filenameStem },
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
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[viewgraph] send-review: tab', tab?.url, 'includeCapture:', message.includeCapture);
        if (!tab?.id) { sendResponse({ ok: false, error: 'No active tab' }); return; }

        // Ask content script for annotations (and optionally a full capture)
        const msgType = message.includeCapture ? 'send-review' : 'send-annotations-only';
        const result = await chrome.tabs.sendMessage(tab.id, { type: msgType, sessionNote: message.sessionNote });
        console.log('[viewgraph] send-review: content script result', result?.ok);
        if (!result?.ok) { sendResponse({ ok: false, error: result?.error }); return; }

        const pushResult = await pushToServer(result.capture);
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
        const captureMsg = { type: 'capture', includeSnapshot: message.includeSnapshot !== false, keepSidebar: !!message.keepSidebar };
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
