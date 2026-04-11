/**
 * Safe Collect - Error Boundary for Enrichment Collectors
 *
 * Wraps enrichment collector functions so that if one throws, the capture
 * still succeeds with partial data. Logs the error to console for debugging
 * but never lets a single collector crash the entire capture pipeline.
 *
 * @see extension/entrypoints/content.js - capture pipeline
 */

/**
 * Safely execute a collector function. Returns its result on success,
 * or a fallback value on failure.
 * @param {string} name - Collector name for error reporting
 * @param {function} fn - Collector function to execute
 * @param {*} fallback - Value to return on failure (default: null)
 * @returns {*} Collector result or fallback
 */
export function safeCollect(name, fn, fallback = null) {
  try {
    return fn();
  } catch (err) {
    console.warn(`[ViewGraph] ${name} collector failed:`, err?.message || err);
    return fallback;
  }
}

/**
 * Safely execute an async collector function.
 * @param {string} name - Collector name for error reporting
 * @param {function} fn - Async collector function
 * @param {*} fallback - Value to return on failure (default: null)
 * @returns {Promise<*>} Collector result or fallback
 */
export async function safeCollectAsync(name, fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[ViewGraph] ${name} collector failed:`, err?.message || err);
    return fallback;
  }
}
