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
import { KEYS, resolvedKey } from '#lib/storage.js';

/** Alarm name. */
const ALARM_NAME = 'vg-sync';

/** Storage key for pending capture requests. */
const PENDING_KEY = KEYS.pendingRequests;

/** Storage key for URLs with active annotations (set by sidebar on send). */
const ACTIVE_URLS_KEY = KEYS.activeUrls;

/** Badge background color for pending requests (amber). */
const BADGE_COLOR = '#f59e0b';

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
          await chrome.storage.local.set({ [resolvedKey(url)]: resolved });
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
      chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    }
  } catch (err) {
    // Server offline - clear badge
    console.warn('[ViewGraph] Sync poll failed:', err?.message);
    try { chrome.action.setBadgeText({ text: '' }); } catch { /* tests */ }
  }
}
