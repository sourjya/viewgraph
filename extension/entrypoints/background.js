/**
 * Background Service Worker — ViewGraph Capture Extension
 *
 * Orchestrates capture flow: receives messages from popup/content scripts,
 * coordinates DOM traversal + screenshot capture, and handles output
 * (disk write + MCP push). Runs as a MV3 service worker — no persistent
 * state, use chrome.storage for anything that must survive termination.
 */

export default defineBackground(() => {
  console.log('ViewGraph Capture background service worker started');
});
