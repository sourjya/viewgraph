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
import { start as startInspect, stop as stopInspect, isActive as isInspecting } from '../lib/inspector.js';
import { start as startReview, stop as stopReview, isActive as isReviewing, getAnnotations as getReviewAnnotations, load as loadAnnotations, hideMarkers } from '../lib/review.js';
import { show as showPanel } from '../lib/annotation-panel.js';
import { create as createSidebar, refresh as refreshSidebar, destroy as destroySidebar } from '../lib/annotation-sidebar.js';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'capture') {
        try {
          const viewport = { width: window.innerWidth, height: window.innerHeight };
          const { elements, relations } = traverseDOM();
          const scored = scoreAll(elements, viewport);
          const capture = serialize(scored, relations);
          const snapshot = message.includeSnapshot ? captureSnapshot() : null;
          sendResponse({ ok: true, capture, snapshot });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        return true;
      }

      if (message.type === 'toggle-inspect') {
        if (isInspecting()) { stopInspect(); } else { startInspect(); }
        sendResponse({ ok: true, active: isInspecting() });
        return true;
      }

      if (message.type === 'toggle-review') {
        if (!isReviewing()) {
          startReview({
            onAdd: (ann) => { showPanel(ann, { onChange: () => refreshSidebar() }); refreshSidebar(); },
            onRemove: () => { refreshSidebar(); },
          });
          await loadAnnotations();
        }
        destroySidebar();
        createSidebar();
        sendResponse({ ok: true, active: isReviewing() });
        return true;
      }

      if (message.type === 'dismiss-review') {
        hideMarkers();
        destroySidebar();
        stopReview();
        sendResponse({ ok: true });
        return true;
      }

      if (message.type === 'send-review') {
        // Bundle annotations with a full page capture
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const { elements, relations } = traverseDOM();
        const scored = scoreAll(elements, viewport);
        const capture = serialize(scored, relations);
        capture.metadata.captureMode = 'review';
        capture.annotations = getReviewAnnotations().map((a) => ({
          id: a.id, region: a.region, comment: a.comment, nodeIds: a.nids,
        }));
        destroySidebar();
        stopReview();
        sendResponse({ ok: true, capture });
        return true;
      }

      return false;
    });
  },
});
