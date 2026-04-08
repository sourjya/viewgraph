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

import { SERVER_BASE_URL as SERVER_URL } from '../lib/constants.js';

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
 * @returns {Promise<{ filename: string } | null>}
 */
async function pushToServer(capture) {
  try {
    const auth = await authHeaders();
    const res = await fetch(`${SERVER_URL}/captures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify(capture),
    });
    if (res.ok) return await res.json();
  } catch {
    // Server not running - that's fine, capture still succeeded locally
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
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle subtree capture from inspector - just push to server
    if (message.type === 'inspect-capture') {
      pushToServer(message.capture).then((result) => {
        sendResponse({ ok: true, pushed: !!result, filename: result?.filename });
      });
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
