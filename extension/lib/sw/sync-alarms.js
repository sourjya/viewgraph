/**
 * Sync Alarms - Service Worker
 *
 * Periodic background polling via chrome.alarms API. Polls for resolved
 * annotations and pending capture requests even when no sidebar is open.
 * Results written to chrome.storage.local for sidebar consumption.
 *
 * Badge: shows pending request count on the extension icon.
 *
 * @see lib/sw/ws-manager.js - real-time events when sidebar is open
 * @see lib/sidebar/sync.js - sidebar reads from storage
 * @see .kiro/specs/sw-communication/design.md - alarm design
 */

import * as transport from '#lib/transport.js';

/** Alarm name. */
const ALARM_NAME = 'vg-sync';

/** Storage key prefix for resolved annotations (keyed by page URL). */
const RESOLVED_KEY_PREFIX = 'vg-resolved-';

/** Storage key for pending capture requests. */
const PENDING_KEY = 'vg-pending-requests';

/** Storage key for URLs with active annotations (set by sidebar on send). */
const ACTIVE_URLS_KEY = 'vg-active-urls';

/**
 * Start the sync alarm. Fires every 30s (unpacked) / 60s (published).
 */
export function startSync() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
}

/** Stop the sync alarm. */
export function stopSync() {
  chrome.alarms.clear(ALARM_NAME);
}

/**
 * Handle alarm fire. Polls server for resolved annotations and pending
 * requests, writes results to chrome.storage.local, updates badge.
 *
 * @param {{ name: string }} alarm
 */
export async function onAlarm(alarm) {
  if (alarm.name !== ALARM_NAME) return;
  await Promise.all([_pollResolved(), _pollRequests()]);
}

/**
 * Poll resolved annotations for all active page URLs.
 * Reads URL list from storage, polls each, writes results.
 */
async function _pollResolved() {
  try {
    const data = await chrome.storage.local.get(ACTIVE_URLS_KEY);
    const urls = data[ACTIVE_URLS_KEY] || [];
    for (const url of urls) {
      try {
        const { resolved } = await transport.getResolved(url);
        if (resolved?.length) {
          await chrome.storage.local.set({ [RESOLVED_KEY_PREFIX + url]: resolved });
        }
      } catch { /* server offline for this URL */ }
    }
  } catch { /* no active URLs */ }
}

/**
 * Poll pending capture requests. Write to storage and update badge.
 */
async function _pollRequests() {
  try {
    const { requests } = await transport.getPendingRequests();
    const pending = requests || [];
    await chrome.storage.local.set({ [PENDING_KEY]: pending });
    // Update badge
    const text = pending.length > 0 ? String(pending.length) : '';
    chrome.action.setBadgeText({ text });
    if (pending.length > 0) {
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // amber
    }
  } catch {
    // Server offline - clear badge
    try { chrome.action.setBadgeText({ text: '' }); } catch { /* tests */ }
  }
}
