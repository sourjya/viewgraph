/**
 * Auto-Capture Controller
 *
 * Manages automatic capture on HMR events. When enabled, watches for
 * hot-reload events and triggers a capture + diff against the previous
 * capture. Sends the diff summary to the background script for push
 * to the MCP server.
 *
 * Lifecycle:
 * 1. Content script calls `startAutoCapture()` when enabled in settings
 * 2. HMR detector fires callback on hot-reload
 * 3. Controller captures DOM, diffs against previous, sends to background
 * 4. Background pushes to server
 * 5. Content script calls `stopAutoCapture()` when disabled or page unloads
 *
 * @see lib/hmr-detector.js
 * @see docs/roadmap/roadmap.md - M14.1
 */

import { watchHmr } from './hmr-detector.js';
import { traverseDOM } from './traverser.js';
import { scoreAll } from './salience.js';
import { serialize } from './serializer.js';
import { collectNetworkState } from './network-collector.js';
import { getConsoleState } from './console-collector.js';
import { collectBreakpoints } from './breakpoint-collector.js';
import { collectStackingContexts } from './stacking-collector.js';
import { collectFocusChain } from './focus-collector.js';
import { collectScrollContainers } from './scroll-collector.js';
import { collectLandmarks } from './landmark-collector.js';
import { collectComponents } from './component-collector.js';
import { collectEventListeners } from './event-listener-collector.js';
import { collectPerformance } from './performance-collector.js';
import { collectAnimations } from './animation-collector.js';
import { collectIntersectionState } from './intersection-collector.js';

let watcher = null;
let previousCapture = null;
let captureCount = 0;

/**
 * Start auto-capture mode. Watches for HMR events and captures on each.
 * @param {{ debounceMs?: number, onCapture?: function }} options
 */
export function startAutoCapture(options = {}) {
  if (watcher) return; // Already running

  watcher = watchHmr((event) => {
    captureCount++;
    const capture = buildCapture(event);

    // Send to background for push to server
    chrome.runtime.sendMessage({
      type: 'auto-capture',
      capture,
      hmrSource: event.source,
      captureNumber: captureCount,
      hasPrevious: previousCapture !== null,
    });

    previousCapture = capture;
    if (options.onCapture) options.onCapture(capture, event);
  }, { debounceMs: options.debounceMs });
}

/**
 * Stop auto-capture mode.
 */
export function stopAutoCapture() {
  if (watcher) {
    watcher.stop();
    watcher = null;
  }
  previousCapture = null;
  captureCount = 0;
}

/**
 * Check if auto-capture is currently active.
 * @returns {boolean}
 */
export function isAutoCapturing() {
  return watcher !== null;
}

/**
 * Build a capture from the current DOM state.
 * @param {{ source: string, timestamp: string }} event
 * @returns {object}
 */
function buildCapture(event) {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const { elements, relations } = traverseDOM();
  const scored = scoreAll(elements, viewport);
  const enrichment = {
    network: collectNetworkState(),
    console: getConsoleState(),
    breakpoints: collectBreakpoints(),
    stacking: collectStackingContexts(),
    focus: collectFocusChain(),
    scroll: collectScrollContainers(),
    landmarks: collectLandmarks(),
    components: collectComponents(),
    eventListeners: collectEventListeners(),
    performance: collectPerformance(),
    animations: collectAnimations(),
    intersection: collectIntersectionState(),
  };
  const capture = serialize(scored, relations, enrichment);
  capture.metadata.captureMode = 'auto';
  capture.metadata.hmrSource = event.source;
  capture.metadata.autoCapture = { number: captureCount, source: event.source, timestamp: event.timestamp };
  return capture;
}
