/**
 * Content Script - ViewGraph Capture
 *
 * Injected into the active tab on demand (not on every page load).
 * Listens for a "capture" message from the background script, runs
 * DOM traversal + salience scoring + serialization, and returns the
 * ViewGraph v2.1 JSON capture.
 *
 * This is a WXT content script entrypoint. WXT handles the registration
 * and injection lifecycle.
 */

import { traverseDOM } from '../lib/traverser.js';
import { scoreAll } from '../lib/salience.js';
import { serialize } from '../lib/serializer.js';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // Listen for capture requests from the background script
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type !== 'capture') return false;

      try {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const { elements, relations } = traverseDOM();
        const scored = scoreAll(elements, viewport);
        const capture = serialize(scored, relations);
        sendResponse({ ok: true, capture });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }

      // Return true to indicate async response
      return true;
    });
  },
});
