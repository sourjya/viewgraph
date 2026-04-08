/**
 * Content Script - ViewGraph Capture + Annotate
 *
 * Injected into the active tab on demand. Handles:
 * - Full page capture (from popup Capture button)
 * - Unified annotate mode (from popup Annotate button)
 * - Send annotations bundled with capture to MCP server
 *
 * @see lib/annotate.js - unified hover/click/drag annotation state machine
 * @see docs/decisions/ADR-006-merge-inspect-review.md
 */

import { traverseDOM } from '../lib/traverser.js';
import { scoreAll } from '../lib/salience.js';
import { serialize } from '../lib/serializer.js';
import { captureSnapshot } from '../lib/html-snapshot.js';
import {
  start as startAnnotate, stop as stopAnnotate, isActive as isAnnotating,
  getAnnotations, load as loadAnnotations, hideMarkers,
} from '../lib/annotate.js';
import { show as showPanel } from '../lib/annotation-panel.js';
import { create as createSidebar, refresh as refreshSidebar, destroy as destroySidebar } from '../lib/annotation-sidebar.js';
import { cropRegions } from '../lib/screenshot-crop.js';
import { buildReportZip } from '../lib/export-zip.js';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

      if (message.type === 'capture') {
        // Exit annotate mode before capturing clean DOM
        if (isAnnotating()) { hideMarkers(); destroySidebar(); stopAnnotate(); }
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

      if (message.type === 'toggle-annotate') {
        if (!isAnnotating()) {
          startAnnotate({
            onAdd: (ann) => { showPanel(ann, { onChange: () => refreshSidebar() }); refreshSidebar(); },
            onRemove: () => { refreshSidebar(); },
          });
          loadAnnotations().then(() => {
            destroySidebar();
            createSidebar();
            sendResponse({ ok: true, active: true });
          });
          return true;
        }
        // Already annotating - recreate sidebar with current annotations
        destroySidebar();
        createSidebar();
        sendResponse({ ok: true, active: true });
        return true;
      }

      if (message.type === 'dismiss-annotate') {
        hideMarkers();
        destroySidebar();
        stopAnnotate();
        sendResponse({ ok: true });
        return true;
      }

      if (message.type === 'build-report') {
        (async () => {
          try {
            const anns = getAnnotations();
            const meta = { title: document.title, url: location.href, timestamp: new Date().toISOString() };
            const screenshots = message.screenshot ? await cropRegions(message.screenshot, anns) : [];
            const blob = await buildReportZip(anns, meta, screenshots);
            // Trigger download via object URL
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const host = location.hostname || 'page';
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = `viewgraph-review-${host}-${ts}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            sendResponse({ ok: true });
          } catch (err) {
            sendResponse({ ok: false, error: err.message });
          }
        })();
        return true;
      }

      if (message.type === 'send-review') {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const { elements, relations } = traverseDOM();
        const scored = scoreAll(elements, viewport);
        const capture = serialize(scored, relations);
        capture.metadata.captureMode = 'review';
        capture.annotations = getAnnotations().map((a) => ({
          id: a.id, type: a.type, region: a.region, comment: a.comment,
          nodeIds: a.nids, ancestor: a.ancestor,
        }));
        sendResponse({ ok: true, capture });
        return true;
      }

      return false;
    });
  },
});
