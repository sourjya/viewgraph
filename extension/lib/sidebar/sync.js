/**
 * Sidebar Sync Module
 *
 * Handles resolved annotation sync and storage-based real-time updates.
 * M19: Polling replaced by chrome.storage.onChanged listener. The SW
 * writes events to storage via ws-manager and sync-alarms.
 *
 * @see lib/sw/ws-manager.js - writes WS events to storage
 * @see lib/sw/sync-alarms.js - polls server on alarm, writes to storage
 */

import * as transport from '#lib/transport-client.js';
import { getAnnotations } from '#lib/annotate.js';

/**
 * Sync resolved state from the server. Polls for resolved annotations
 * and updates local annotations that were resolved by the agent.
 * @param {function} onChanged - Called when any annotation was updated
 */
export async function syncResolved(onChanged) {
  try {
    const { resolved } = await transport.getResolved(location.href);
    if (!resolved?.length) return;
    const anns = getAnnotations();
    let changed = false;
    for (const { uuid, resolution } of resolved) {
      const ann = anns.find((a) => a.uuid === uuid && !a.resolved);
      if (ann) {
        ann.resolved = true;
        ann.resolution = resolution;
        // Dim the on-page marker to show it's been fixed
        const { dimResolvedMarker } = await import('#lib/annotate.js');
        dimResolvedMarker(ann.id);
        changed = true;
      }
    }
    if (changed && onChanged) {
      // Persist resolved state so next reload doesn't flash unresolved
      const { save } = await import('#lib/annotate.js');
      await save();
      onChanged();
    }
  } catch { /* server offline - no sync */ }
}

/**
 * Poll for pending capture requests from the agent.
 * @param {function} onRequests - Called with array of pending requests
 */
export async function pollRequests(onRequests) {
  try {
    const { requests } = await transport.getPendingRequests();
    if (onRequests) onRequests(requests || []);
  } catch { /* server offline */ }
}

/**
 * Load resolved annotation history from the server for the current page.
 * Returns enriched entries (comment, type, severity, ancestor, resolution)
 * that can be rendered directly without needing local in-memory annotations.
 * Used by the Resolved tab to show past resolutions after extension reload.
 *
 * @returns {Promise<Array<{ uuid, comment, type, severity, ancestor, resolution }>>}
 */
export async function loadResolvedHistory() {
  try {
    const { resolved } = await transport.getResolved(location.href);
    return resolved || [];
  } catch { return []; }
}

// ──────────────────────────────────────────────
// M19: Storage-based sync (replaces polling when SW is active)
// ──────────────────────────────────────────────

/** Storage key prefix for resolved annotations (keyed by page URL). */
const RESOLVED_KEY_PREFIX = 'vg-resolved-';

/** Storage key for pending capture requests. */
const PENDING_KEY = 'vg-pending-requests';

/** @type {Function|null} Registered storage change listener. */
let _storageListener = null;

/**
 * Initialize storage-based sync. Reads current state from chrome.storage.local
 * and registers a listener for real-time updates via chrome.storage.onChanged.
 *
 * Replaces startResolutionPolling/startRequestPolling when the SW manages
 * the WebSocket connection and writes events to storage.
 *
 * @param {function} onChanged - Called when resolved annotations update
 * @param {function} [onRequests] - Called with pending request array
 */
export async function syncFromStorage(onChanged, onRequests) {
  // Read current resolved state
  const resolvedKey = RESOLVED_KEY_PREFIX + location.href;
  try {
    const data = await chrome.storage.local.get(resolvedKey);
    const resolved = data[resolvedKey] || [];
    if (resolved.length > 0 && onChanged) onChanged(resolved);
  } catch { /* no stored data */ }

  // Read current pending requests
  try {
    const data = await chrome.storage.local.get(PENDING_KEY);
    const requests = data[PENDING_KEY] || [];
    if (onRequests) onRequests(requests);
  } catch {
    if (onRequests) onRequests([]);
  }

  // Listen for real-time updates from the SW's WS manager
  _storageListener = (changes, area) => {
    if (area !== 'local') return;
    // WS events (annotation:resolved, annotation:status, etc.)
    if (changes['vg-ws-events']?.newValue && onChanged) {
      onChanged(changes['vg-ws-events'].newValue);
    }
    // Resolved annotations updated by alarm sync
    if (changes[resolvedKey]?.newValue && onChanged) {
      onChanged(changes[resolvedKey].newValue);
    }
    // Pending requests updated by alarm sync
    if (changes[PENDING_KEY]?.newValue && onRequests) {
      onRequests(changes[PENDING_KEY].newValue);
    }
  };
  chrome.storage.onChanged.addListener(_storageListener);
}

/**
 * Stop storage-based sync. Removes the onChanged listener.
 */
export function stopSync() {
  if (_storageListener) {
    chrome.storage.onChanged.removeListener(_storageListener);
    _storageListener = null;
  }
}
