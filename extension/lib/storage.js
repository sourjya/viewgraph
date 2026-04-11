/**
 * Unified Storage Wrapper
 *
 * Single interface for all chrome.storage operations. Centralizes key names
 * so they're discoverable and grep-able instead of scattered magic strings.
 *
 * Uses chrome.storage.local for all keys except projectMappings which uses
 * sync (shared across devices).
 *
 * @see extension/entrypoints/background.js - auto-mapping writes
 * @see extension/lib/annotate.js - annotation persistence
 */

// ---------------------------------------------------------------------------
// Key registry - every storage key in the extension lives here
// ---------------------------------------------------------------------------

export const KEYS = {
  autoMapping: 'vg-auto-mapping',
  overrideEnabled: 'vg-override-enabled',
  projectMappings: 'vg-project-mappings',
  settings: 'vg-settings',
  blockedReason: 'vg-blocked-reason',
  pendingRequests: 'vg-pending-requests',
  // Per-page annotation keys use a dynamic prefix - see annotationKey()
};

/** Annotation storage key for a given URL. */
export function annotationKey(url) {
  return `vg-annotations-${url}`;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Read a value from local storage.
 * @param {string} key - Raw key string (use KEYS.xxx or annotationKey())
 * @returns {Promise<any>} Stored value or null
 */
export async function get(key) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

/**
 * Write a value to local storage.
 * @param {string} key - Raw key string
 * @param {any} value - JSON-serializable value
 */
export async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

/**
 * Remove a key from local storage.
 * @param {string} key - Raw key string
 */
export async function remove(key) {
  await chrome.storage.local.remove(key);
}
