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
import { captureSnapshot } from '../lib/html-snapshot.js';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type !== 'capture') return false;

      try {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const { elements, relations } = traverseDOM();
        const scored = scoreAll(elements, viewport);
        const capture = serialize(scored, relations);
        // HTML snapshot for fidelity measurement (included if requested)
        const snapshot = message.includeSnapshot ? captureSnapshot() : null;
        sendResponse({ ok: true, capture, snapshot });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }

      return true;
    });
  },
});
