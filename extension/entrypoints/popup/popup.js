/**
 * Popup Script - ViewGraph Capture
 *
 * Handles the Capture Page button click. Sends a message to the background
 * script to initiate the capture flow, then displays the result.
 */

const captureBtn = document.getElementById('captureBtn');
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
