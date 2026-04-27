/**
 * Sidebar Sync Module
 *
 * Handles periodic polling for resolved annotations and pending capture
 * requests. Uses transport abstraction for server communication.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import * as transport from '#lib/transport.js';
import { getAnnotations } from '#lib/annotate.js';

/** Polling interval for resolution sync (5 seconds). */
const RESOLUTION_POLL_MS = 5000;
/** Polling interval for capture requests (3 seconds). */
const REQUEST_POLL_MS = 3000;

let resolutionPollTimer = null;
let requestPollTimer = null;

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

/** Start periodic polling for resolved annotations. */
export function startResolutionPolling(onChanged) {
  stopResolutionPolling();
  resolutionPollTimer = setInterval(() => syncResolved(onChanged), RESOLUTION_POLL_MS);
}

/** Stop periodic resolution polling. */
export function stopResolutionPolling() {
  if (resolutionPollTimer) { clearInterval(resolutionPollTimer); resolutionPollTimer = null; }
}

/** Start periodic polling for capture requests. */
export function startRequestPolling(onRequests) {
  stopRequestPolling();
  requestPollTimer = setInterval(() => pollRequests(onRequests), REQUEST_POLL_MS);
}

/** Stop request polling. */
export function stopRequestPolling() {
  if (requestPollTimer) { clearInterval(requestPollTimer); requestPollTimer = null; }
}
