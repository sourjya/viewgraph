/**
 * HMR (Hot Module Replacement) Detection
 *
 * Detects hot-reload events from common dev servers:
 * - Vite: listens for `vite:afterUpdate` custom event
 * - webpack: listens for `webpackHotUpdate` on window
 * - Generic: watches for rapid DOM mutations after WebSocket messages
 *
 * When HMR is detected, fires a callback so the auto-capture controller
 * can trigger a capture. Includes a debounce to avoid capturing during
 * rapid successive updates.
 *
 * @see docs/roadmap/roadmap.md - M14.1
 */

/** Default debounce delay after HMR event before triggering capture. */
const DEFAULT_DEBOUNCE_MS = 1000;

/**
 * Start watching for HMR events.
 * @param {function} onHmr - Callback fired when HMR is detected. Receives { source: string, timestamp: string }.
 * @param {{ debounceMs?: number }} options
 * @returns {{ stop: function }} - Call stop() to remove all listeners.
 */
export function watchHmr(onHmr, options = {}) {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let timer = null;
  let stopped = false;
  const cleanups = [];

  /** Debounced trigger. */
  function trigger(source) {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped) onHmr({ source, timestamp: new Date().toISOString() });
    }, debounceMs);
  }

  // Vite HMR: fires custom event on document after module update
  const viteHandler = () => trigger('vite');
  document.addEventListener('vite:afterUpdate', viteHandler);
  cleanups.push(() => document.removeEventListener('vite:afterUpdate', viteHandler));

  // Vite also fires vite:beforeUpdate
  const viteBeforeHandler = () => trigger('vite');
  document.addEventListener('vite:beforeUpdate', viteBeforeHandler);
  cleanups.push(() => document.removeEventListener('vite:beforeUpdate', viteBeforeHandler));

  // webpack HMR: window.__webpack_hot_middleware__ or webpackHotUpdate
  if (typeof window !== 'undefined') {
    const webpackHandler = () => trigger('webpack');
    window.addEventListener('webpackHotUpdate', webpackHandler);
    cleanups.push(() => window.removeEventListener('webpackHotUpdate', webpackHandler));
  }

  // Generic: watch for WebSocket close/open cycles (dev server restart)
  // and rapid DOM mutations that indicate a hot reload
  const observer = new MutationObserver((mutations) => {
    // Only trigger on significant DOM changes (not attribute-only)
    const significant = mutations.filter((m) => m.type === 'childList' && m.addedNodes.length > 0);
    if (significant.length >= 3) {
      trigger('mutation');
    }
  });
  observer.observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });
  cleanups.push(() => observer.disconnect());

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      for (const fn of cleanups) fn();
    },
  };
}
