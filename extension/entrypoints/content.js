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
/* global defineContentScript */

import { traverseDOM } from '../lib/traverser.js';
import { scoreAll } from '../lib/salience.js';
import { serialize } from '../lib/serializer.js';
import { captureSnapshot } from '../lib/html-snapshot.js';
import { collectAllEnrichment } from '../lib/enrichment.js';
import { installConsoleInterceptor } from '../lib/console-collector.js';
import { startAutoCapture, stopAutoCapture, isAutoCapturing } from '../lib/auto-capture.js';
import { isRecording, addStep, getCaptureMetadata } from '../lib/session-manager.js';
import {
  start as startAnnotate, stop as stopAnnotate, isActive as isAnnotating,
  getAnnotations, load as loadAnnotations, hideMarkers,
} from '../lib/annotate.js';
import { show as showPanel } from '../lib/annotation-panel.js';
import { create as createSidebar, refresh as refreshSidebar, destroy as destroySidebar } from '../lib/annotation-sidebar.js';
import { cropRegions } from '../lib/screenshot-crop.js';
import { buildReportZip } from '../lib/export-zip.js';

/** Serialize annotations for capture JSON. Used by send-review and annotations-only. */
function serializeAnnotations(annotations) {
  return annotations.map((a) => ({
    id: a.id, uuid: a.uuid, type: a.type, region: a.region,
    comment: a.comment, severity: a.severity || '', category: a.category || '',
    nodeIds: a.nids, ancestor: a.ancestor,
    timestamp: a.timestamp || new Date().toISOString(),
    resolved: a.resolved || false, resolution: a.resolution || null,
    ...(a.diagnostic ? { diagnostic: a.diagnostic } : {}),
  }));
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // Install console interceptor early to catch errors from page scripts
    installConsoleInterceptor();

    // Check if auto-capture is enabled in settings
    chrome.storage.sync.get('viewgraph-settings', (result) => {
      const s = result['viewgraph-settings'] || {};
      if (s.autoCaptureEnabled) {
        startAutoCapture({ debounceMs: s.debounceMs || 1000 });
      }
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

      if (message.type === 'capture') {
        // Exit annotate mode before capturing clean DOM (unless keepSidebar is set)
        if (isAnnotating() && !message.keepSidebar) { hideMarkers(); destroySidebar(); stopAnnotate(); }
        if (isAnnotating() && message.keepSidebar) { hideMarkers(); }
        (async () => {
          try {
            const viewport = { width: window.innerWidth, height: window.innerHeight };
            const { elements, relations } = traverseDOM();
            const scored = scoreAll(elements, viewport);
            const enrichment = await collectAllEnrichment();
            if (isRecording()) {
              addStep(message.sessionNote);
              enrichment.session = getCaptureMetadata();
            }
            const capture = serialize(scored, relations, enrichment);
            const snapshot = message.includeSnapshot ? captureSnapshot() : null;
            sendResponse({ ok: true, capture, snapshot });
          } catch (err) {
            sendResponse({ ok: false, error: err.message });
          }
        })();
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
            const screenshots = message.screenshot ? await cropRegions(message.screenshot, anns, { scrollX: window.scrollX, scrollY: window.scrollY }) : [];
            const enrichment = await collectAllEnrichment();
            const blob = await buildReportZip(anns, meta, screenshots, enrichment);
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
        (async () => {
          const viewport = { width: window.innerWidth, height: window.innerHeight };
          const { elements, relations } = traverseDOM();
          const scored = scoreAll(elements, viewport);
          const enrichment = await collectAllEnrichment();
          if (isRecording()) {
            addStep(message.sessionNote);
            enrichment.session = getCaptureMetadata();
          }
          const capture = serialize(scored, relations, enrichment);
          capture.metadata.captureMode = 'review';
          capture.annotations = serializeAnnotations(getAnnotations());
          sendResponse({ ok: true, capture });
        })();
        return true;
      }

      // Annotations-only send: no DOM capture, just metadata + annotations
      if (message.type === 'send-annotations-only') {
        const capture = {
          metadata: {
            format: 'viewgraph-v2', version: '2.2.0',
            url: location.href, title: document.title,
            timestamp: new Date().toISOString(),
            viewport: { width: window.innerWidth, height: window.innerHeight },
            captureMode: 'annotations-only',
            stats: { totalNodes: 0 },
          },
          nodes: [],
          annotations: serializeAnnotations(getAnnotations()),
        };
        sendResponse({ ok: true, capture });
        return true;
      }

      // Auto-capture control
      if (message.type === 'start-auto-capture') {
        startAutoCapture({ debounceMs: message.debounceMs });
        sendResponse({ ok: true, active: true });
        return false;
      }
      if (message.type === 'stop-auto-capture') {
        stopAutoCapture();
        sendResponse({ ok: true, active: false });
        return false;
      }
      if (message.type === 'auto-capture-status') {
        sendResponse({ ok: true, active: isAutoCapturing() });
        return false;
      }

      return false;
    });
  },
});
