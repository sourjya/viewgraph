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

/** Default MCP server HTTP receiver URL. */
const SERVER_URL = 'http://127.0.0.1:9876';

/**
 * Push a capture to the MCP server. Fails silently if server is not running.
 * @param {object} capture - ViewGraph JSON capture
 * @returns {Promise<{ filename: string } | null>}
 */
async function pushToServer(capture) {
  try {
    const res = await fetch(`${SERVER_URL}/captures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
    if (message.type !== 'capture') return false;

    (async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse({ ok: false, error: 'No active tab' });
          return;
        }

        // Send capture message to content script
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'capture' });
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
          const ts = capture.metadata.timestamp.replace(/[:.]/g, '').replace('T', '-').slice(0, 15);
          capture.metadata.screenshot = `viewgraph-${hostname}-${ts}.png`;
        }

        // Push to MCP server
        const pushResult = await pushToServer(capture);
        const filename = pushResult?.filename || `viewgraph-capture-${Date.now()}.json`;

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
