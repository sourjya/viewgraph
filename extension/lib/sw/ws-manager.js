/**
 * WebSocket Manager - Service Worker
 *
 * Maintains a single WebSocket connection to the ViewGraph server.
 * Connects when any sidebar is open (reference counted), disconnects
 * when all sidebars close. Writes incoming events to chrome.storage.local
 * for content script consumption via chrome.storage.onChanged.
 *
 * Keepalive: 20s ping prevents SW termination during active session.
 * Reconnect: exponential backoff (1s, 2s, 4s, max 30s) on abnormal close.
 *
 * @see lib/transport-client.js - content script reads events via onChanged
 * @see .kiro/specs/sw-communication/design.md - WS manager design
 */

import { KEYS } from '#lib/storage.js';

/** Storage key for the circular event buffer. */
const WS_EVENTS_KEY = KEYS.wsEvents;

/** Keepalive interval (ms). Prevents SW termination. */
const KEEPALIVE_MS = 20000;

/** Max reconnect delay (ms). */
const MAX_RECONNECT_MS = 30000;

/** Max events in the circular buffer. */
const MAX_EVENTS = 50;

/**
 * Create a WebSocket manager for a server URL.
 * Factory function allows multiple managers in tests and clean state.
 *
 * @param {string} wsUrl - WebSocket URL (e.g., 'ws://127.0.0.1:9876')
 * @returns {{ sidebarOpened, sidebarClosed, destroy }}
 */
export function createWsManager(wsUrl) {
  /** @type {WebSocket|null} */
  let _ws = null;

  /** Number of open sidebars across tabs. */
  let _sidebarCount = 0;

  /** Keepalive interval ID. */
  let _keepaliveTimer = null;

  /** Current reconnect delay (ms). Doubles on each failure. */
  let _reconnectDelay = 1000;

  /** Reconnect timeout ID. */
  let _reconnectTimer = null;

  /** Whether disconnect was user-initiated (don't reconnect). */
  let _intentionalClose = false;

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /** A sidebar opened - connect if not already connected. */
  function sidebarOpened() {
    _sidebarCount++;
    if (!_ws) _connect();
  }

  /** A sidebar closed - disconnect when all sidebars are closed. */
  function sidebarClosed() {
    _sidebarCount = Math.max(0, _sidebarCount - 1);
    if (_sidebarCount === 0) _disconnect();
  }

  /** Tear down everything. */
  function destroy() {
    _sidebarCount = 0;
    _disconnect();
  }

  // ──────────────────────────────────────────────
  // Connection
  // ──────────────────────────────────────────────

  function _connect() {
    if (_ws) return;
    _intentionalClose = false;
    try {
      _ws = new WebSocket(wsUrl);
      _ws.onopen = () => {
        _reconnectDelay = 1000; // reset backoff on successful connect
        _startKeepalive();
      };
      _ws.onmessage = (e) => _handleEvent(e);
      _ws.onclose = (e) => {
        _ws = null;
        _stopKeepalive();
        // Reconnect on abnormal close if sidebars are still open
        if (!_intentionalClose && _sidebarCount > 0) _scheduleReconnect();
      };
      _ws.onerror = () => { /* onclose will fire after onerror */ };
    } catch (err) {
      console.warn('[ViewGraph] WS connect failed:', err?.message);
      _ws = null; // WS constructor failed - don't crash SW
    }
  }

  function _disconnect() {
    _intentionalClose = true;
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    _stopKeepalive();
    if (_ws) { try { _ws.close(); } catch { /* already closed */ } _ws = null; }
  }

  // ──────────────────────────────────────────────
  // Keepalive
  // ──────────────────────────────────────────────

  function _startKeepalive() {
    _stopKeepalive();
    _keepaliveTimer = setInterval(() => {
      if (_ws?.readyState === 1) _ws.send(JSON.stringify({ type: 'ping' }));
    }, KEEPALIVE_MS);
  }

  function _stopKeepalive() {
    if (_keepaliveTimer) { clearInterval(_keepaliveTimer); _keepaliveTimer = null; }
  }

  // ──────────────────────────────────────────────
  // Reconnect
  // ──────────────────────────────────────────────

  function _scheduleReconnect() {
    if (_reconnectTimer) return;
    _reconnectTimer = setTimeout(() => {
      _reconnectTimer = null;
      _connect();
      _reconnectDelay = Math.min(_reconnectDelay * 2, MAX_RECONNECT_MS);
    }, _reconnectDelay);
  }

  // ──────────────────────────────────────────────
  // Event Handling
  // ──────────────────────────────────────────────

  /**
   * Write incoming WS event to chrome.storage.local circular buffer.
   * Content scripts read via chrome.storage.onChanged.
   */
  function _handleEvent(e) {
    try {
      const event = JSON.parse(e.data);
      // Write to storage as a single-element array (triggers onChanged)
      chrome.storage.local.set({ [WS_EVENTS_KEY]: [event] });
    } catch (err) { console.warn('[ViewGraph] Malformed WS message:', err?.message); }
  }

  return { sidebarOpened, sidebarClosed, destroy };
}
