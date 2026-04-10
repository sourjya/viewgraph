/**
 * Continuous Capture Watcher
 *
 * Watches for DOM mutations and hot-reload events, triggering auto-captures
 * when the page changes during development. Designed for Vite/webpack HMR
 * workflows where the developer wants to see structural diffs automatically.
 *
 * Two detection paths:
 * - MutationObserver: 2s debounce, catches React re-renders and dynamic content
 * - HMR events: 1s debounce, catches Vite/webpack module replacement
 *
 * Rate limited to 1 capture per 5s. Disabled on large pages (>2000 elements).
 * Pauses when tab is backgrounded or user is actively annotating.
 *
 * @see .kiro/specs/continuous-capture/design.md
 */

const ATTR = 'data-vg-annotate';
const MUTATION_DEBOUNCE_MS = 2000;
const HMR_DEBOUNCE_MS = 1000;
const MIN_CAPTURE_INTERVAL_MS = 5000;
const MAX_ELEMENTS_FOR_AUTO = 2000;

let observer = null;
let mutationTimer = null;
let hmrTimer = null;
let lastCaptureTime = 0;
let capturing = false;
let enabled = false;
let onCapture = null;

/**
 * Start watching for DOM changes and HMR events.
 * @param {function} captureCallback - Called when a capture should be triggered.
 *   Receives no arguments. The callback should perform the capture and push.
 */
export function startWatcher(captureCallback) {
  if (enabled) return;
  enabled = true;
  onCapture = captureCallback;

  // Skip large pages - MutationObserver overhead is too high
  if (document.querySelectorAll('*').length > MAX_ELEMENTS_FOR_AUTO) return;

  startMutationObserver();
  startHmrListeners();
  startVisibilityListener();
}

/** Stop watching. Disconnects all observers and listeners. */
export function stopWatcher() {
  enabled = false;
  onCapture = null;
  if (observer) { observer.disconnect(); observer = null; }
  clearTimeout(mutationTimer);
  clearTimeout(hmrTimer);
  document.removeEventListener('vite:afterUpdate', onHmrEvent);
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

/** @returns {boolean} Whether the watcher is currently active. */
export function isWatcherEnabled() { return enabled; }

/** Reset all internal state. Used in tests. */
export function resetWatcher() {
  stopWatcher();
  lastCaptureTime = 0;
  capturing = false;
}

// ---------------------------------------------------------------------------
// MutationObserver - catches React re-renders, dynamic content
// ---------------------------------------------------------------------------

function startMutationObserver() {
  observer = new MutationObserver((mutations) => {
    // Ignore mutations from our own UI
    const relevant = mutations.some((m) => {
      const target = m.target;
      if (target.closest?.(`[${ATTR}]`)) return false;
      if (m.type === 'attributes' && !['data-testid', 'role', 'class'].includes(m.attributeName) && !m.attributeName?.startsWith('aria-')) return false;
      return true;
    });
    if (!relevant) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(triggerCapture, MUTATION_DEBOUNCE_MS);
  });
  observer.observe(document.body, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['data-testid', 'role', 'class', 'aria-label', 'aria-hidden'],
  });
}

// ---------------------------------------------------------------------------
// HMR detection - Vite, webpack, full reload fallback
// ---------------------------------------------------------------------------

/** Shared handler for any HMR-like event. */
function onHmrEvent() {
  clearTimeout(hmrTimer);
  hmrTimer = setTimeout(triggerCapture, HMR_DEBOUNCE_MS);
}

function startHmrListeners() {
  // Vite HMR fires this custom event after module update
  document.addEventListener('vite:afterUpdate', onHmrEvent);

  // Webpack HMR - check if module.hot exists (injected by webpack)
  if (typeof module !== 'undefined' && module.hot) {
    module.hot.addStatusHandler?.((status) => {
      if (status === 'idle') onHmrEvent();
    });
  }
}

// ---------------------------------------------------------------------------
// Visibility - pause when tab is backgrounded
// ---------------------------------------------------------------------------

function onVisibilityChange() {
  if (document.hidden && observer) {
    observer.disconnect();
  } else if (!document.hidden && enabled && !observer) {
    startMutationObserver();
  }
}

function startVisibilityListener() {
  document.addEventListener('visibilitychange', onVisibilityChange);
}

// ---------------------------------------------------------------------------
// Capture trigger with rate limiting
// ---------------------------------------------------------------------------

function triggerCapture() {
  if (!enabled || capturing) return;
  const now = Date.now();
  if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL_MS) return;
  capturing = true;
  lastCaptureTime = now;
  try {
    onCapture?.();
  } finally {
    // Allow next capture after a tick (callback may be async)
    setTimeout(() => { capturing = false; }, 100);
  }
}
