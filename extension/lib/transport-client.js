/**
 * Transport Client - Content Script Proxy
 *
 * Mirrors the transport.js API but routes all calls through the service
 * worker via chrome.runtime.sendMessage. The content script never makes
 * direct HTTP or WebSocket connections to the server.
 *
 * Message protocol:
 *   CS -> SW: { type: 'vg-transport', op: '<method>', args: { ... } }
 *   SW -> CS: { ok: true, result: <data> } | { ok: false, error: '<msg>' }
 *
 * Events are delivered via chrome.storage.onChanged on the 'vg-ws-events'
 * key, written by the service worker's WebSocket manager.
 *
 * Phase 0 of the service worker communication migration (M19).
 * @see lib/transport.js - the real transport (runs in service worker)
 * @see lib/sw/transport-handler.js - service worker message handler
 * @see .kiro/specs/sw-communication/design.md - message protocol spec
 */

import { KEYS } from '#lib/storage.js';

/** Storage key for WebSocket events written by the SW ws-manager. */
const WS_EVENTS_KEY = KEYS.wsEvents;

/** Storage key for the current server URL written by SW discovery. */
const SERVER_URL_KEY = KEYS.serverUrl;

/** @type {Map<string, Set<function>>} Event listeners keyed by event type. */
const _listeners = new Map();

// ──────────────────────────────────────────────
// Internal - message passing
// ──────────────────────────────────────────────

/**
 * Send a message to the service worker and return the result.
 * Rejects on { ok: false } responses or chrome.runtime.lastError.
 *
 * @param {string} op - Operation name (e.g., 'getInfo', 'sendCapture')
 * @param {object} args - Arguments for the operation
 * @returns {Promise<*>} The result from the service worker
 */
function _send(op, args = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'vg-transport', op, args }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!response || !response.ok) {
        return reject(new Error(response?.error || 'Transport request failed'));
      }
      resolve(response.result);
    });
  });
}

// ──────────────────────────────────────────────
// Query Operations (GET-like)
// ──────────────────────────────────────────────

/** Get server info (project root, URL patterns, version). */
export function getInfo() { return _send('getInfo'); }

/** Get server health status. */
export function getHealth() { return _send('getHealth'); }

/** List captures, optionally filtered by URL. */
export function getCaptures(url) { return _send('getCaptures', url ? { url } : {}); }

/** Get resolved annotations for a page URL. */
export function getResolved(pageUrl) { return _send('getResolved', { pageUrl }); }

/** Get pending capture requests from the agent. */
export function getPendingRequests() { return _send('getPendingRequests'); }

/** Get project config. */
export function getConfig() { return _send('getConfig'); }

/** Get baselines for a URL. */
export function getBaselines(url) { return _send('getBaselines', url ? { url } : {}); }

/** Compare baseline for a URL. */
export function compareBaseline(url) { return _send('compareBaseline', { url }); }

// ──────────────────────────────────────────────
// Send Operations (POST/PUT-like)
// ──────────────────────────────────────────────

/** Send a capture to the server. */
export function sendCapture(data, headers = {}) { return _send('sendCapture', { data, headers }); }

/** Send a screenshot to the server. */
export function sendScreenshot(data) { return _send('sendScreenshot', { data }); }

/** Update project config (merge). */
export function updateConfig(data) { return _send('updateConfig', { data }); }

/** Set a baseline. */
export function setBaseline(filename) { return _send('setBaseline', { filename }); }

/** Acknowledge a capture request. */
export function ackRequest(id) { return _send('ackRequest', { id }); }

/** Decline a capture request. */
export function declineRequest(id, reason) { return _send('declineRequest', { id, reason }); }

// ──────────────────────────────────────────────
// Events (via chrome.storage.onChanged)
// ──────────────────────────────────────────────

/**
 * Subscribe to server events (annotation resolved, audit results, etc.).
 * Events arrive via chrome.storage.onChanged when the SW writes to
 * the 'vg-ws-events' key.
 *
 * @param {string} type - Event type (e.g., 'annotation:resolved')
 * @param {function} callback - Called with the event object
 */
export function onEvent(type, callback) {
  if (!_listeners.has(type)) _listeners.set(type, new Set());
  _listeners.get(type).add(callback);
  _ensureStorageListener();
}

/** Remove an event listener. */
export function offEvent(type, callback) {
  _listeners.get(type)?.delete(callback);
}

/** @type {boolean} Whether the storage listener is installed. */
let _storageListenerInstalled = false;

/**
 * Install the chrome.storage.onChanged listener once.
 * Dispatches incoming WS events to registered callbacks by type.
 */
function _ensureStorageListener() {
  if (_storageListenerInstalled) return;
  if (!chrome?.storage?.onChanged?.addListener) return; // Not available (test env)
  _storageListenerInstalled = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const eventsChange = changes[WS_EVENTS_KEY];
    if (!eventsChange?.newValue) return;
    for (const event of eventsChange.newValue) {
      const handlers = _listeners.get(event.type);
      if (handlers) for (const fn of handlers) fn(event);
    }
  });
}

// ──────────────────────────────────────────────
// Server URL
// ──────────────────────────────────────────────

/**
 * Get the current server URL from chrome.storage.local.
 * Written by the service worker's discovery module.
 *
 * @returns {Promise<string|null>}
 */
export async function getServerUrl() {
  const data = await chrome.storage.local.get(SERVER_URL_KEY);
  return data[SERVER_URL_KEY] || null;
}
