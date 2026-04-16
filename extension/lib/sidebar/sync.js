/**
 * Sidebar Sync Module
 *
 * Handles periodic polling for resolved annotations and pending capture
 * requests. Runs independently of the sidebar UI.
 *
 * @see docs/architecture/modularity-audit.md - F14 sidebar decomposition
 */

import { discoverServer } from '#lib/constants.js';
import { getAnnotations } from '#lib/annotate.js';
// import { ATTR } from '#lib/selector.js';

/** Polling interval for resolution sync (5 seconds). */
const RESOLUTION_POLL_MS = 5000;
/** Polling interval for capture requests (3 seconds). */
const REQUEST_POLL_MS = 3000;

let resolutionPollTimer = null;
let requestPollTimer = null;

/**
 * Sync resolved state from the server. Polls /annotations/resolved for the
 * current page URL and updates local annotations that were resolved by Kiro.
 * @param {function} onChanged - Called when any annotation was updated
 */
export async function syncResolved(onChanged) {
  try {
    const serverUrl = await discoverServer(window.location.href);
    if (!serverUrl) return;
    const pageUrl = encodeURIComponent(location.href);
    const res = await fetch(`${serverUrl}/annotations/resolved?url=${pageUrl}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const { resolved } = await res.json();
    if (!resolved?.length) return;
    const anns = getAnnotations();
    let changed = false;
    for (const { uuid, resolution } of resolved) {
      const ann = anns.find((a) => a.uuid === uuid && !a.resolved);
      if (ann) {
        ann.resolved = true;
        ann.resolution = resolution;
        changed = true;
      }
    }
    if (changed && onChanged) onChanged();
  } catch { /* server offline - no sync */ }
}

/**
 * Poll for pending capture requests from the agent.
 * @param {function} onRequests - Called with array of pending requests
 */
export async function pollRequests(onRequests) {
  try {
    const serverUrl = await discoverServer(window.location.href);
    if (!serverUrl) return;
    const res = await fetch(`${serverUrl}/requests/pending`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const { requests } = await res.json();
    if (onRequests) onRequests(requests || []);
  } catch { /* server offline */ }
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
