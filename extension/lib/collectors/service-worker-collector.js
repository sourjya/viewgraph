/**
 * Service Worker State Collector
 *
 * Detects active service workers, their state, and cache names.
 * Helps the agent diagnose stale data bugs - when the page shows
 * cached content instead of fresh data from the server.
 *
 * @see docs/ideas/extended-capture-enrichment.md - Tier 2
 */

/**
 * Collect service worker state.
 * @returns {Promise<{ controller: object|null, caches: string[] }>}
 */
export async function collectServiceWorkerState() {
  const result = { controller: null, caches: [] };

  // Check for active service worker controller
  if (navigator.serviceWorker?.controller) {
    const sw = navigator.serviceWorker.controller;
    result.controller = {
      scriptURL: sw.scriptURL,
      state: sw.state,
    };
  }

  // List cache names (reveals what's being cached)
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      result.caches = names.slice(0, 20); // Cap at 20
    }
  } catch { /* caches API not available */ }

  return result;
}
