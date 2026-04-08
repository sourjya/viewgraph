/**
 * Popup Script - ViewGraph Capture
 *
 * Handles the Capture Page button click. Sends a message to the background
 * script to initiate the capture flow, then displays the result.
 */

const captureBtn = document.getElementById('captureBtn');
const inspectBtn = document.getElementById('inspectBtn');
const reviewBtn = document.getElementById('reviewBtn');
const statusEl = document.getElementById('status');

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
    const response = await chrome.runtime.sendMessage({ type: 'capture' });
    if (response?.ok) {
      const { filename, nodeCount } = response;
      showStatus('success', `Captured ${nodeCount} elements\n${filename}`);
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
inspectBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showStatus('error', 'No active tab'); return; }
    // Inject content script if not already loaded, then toggle inspect
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-inspect' });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-inspect' });
    }
    window.close();
  } catch (err) {
    showStatus('error', err.message);
  }
});

/** Toggle review mode on the active tab. */
reviewBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showStatus('error', 'No active tab'); return; }
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-review' });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-review' });
    }
    window.close();
  } catch (err) {
    showStatus('error', err.message);
  }
});
