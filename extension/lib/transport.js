/**
 * Transport Abstraction Layer
 *
 * Single module that owns ALL extension-to-server communication.
 * Extension code calls high-level methods (sendCapture, getInfo, etc.)
 * and the transport handles native messaging vs HTTP vs WebSocket internally.
 *
 * No other extension module should import fetch, WebSocket, or know about
 * ports, URLs, or transport protocols.
 *
 * @see ADR-013 native messaging transport
 * @see .kiro/specs/native-messaging/design.md
 */

// F21: Auth imported lazily to avoid test environment issues (no crypto.subtle in jsdom)
let _authModule = null;
async function getAuth() {
  if (!_authModule) {
    try { _authModule = await import('./auth.js'); } catch { _authModule = { signRequest: async () => ({}), isAuthenticated: () => false }; }
  }
  return _authModule;
}

/** Native messaging host name (must match manifest). */
const HOST_NAME = 'com.viewgraph.host';

/** @type {string|null} Server base URL for HTTP fallback. */
let _serverUrl = null;

/** @type {boolean|null} null = untested, true/false = cached. */
let _nativeAvailable = null;

/** @type {WebSocket|null} */
let _ws = null;

/** @type {Map<string, Set<function>>} Event listeners. */
const _listeners = new Map();

// ──────────────────────────────────────────────
// Initialization
// ──────────────────────────────────────────────

/**
 * Initialize the transport with a discovered server URL.
 * Must be called after discoverServer resolves.
 * @param {string} serverUrl - e.g., 'http://127.0.0.1:9876'
 */
export function init(serverUrl) {
  _serverUrl = serverUrl;
  _nativeAvailable = null; // re-detect on next call
}

/** Reset transport state. Called on sidebar destroy. */
export function reset() {
  _serverUrl = null;
  _nativeAvailable = null;
  if (_ws) { try { _ws.close(); } catch { /* */ } _ws = null; }
  _listeners.clear();
}

/** Get the current server URL. */
export function getServerUrl() { return _serverUrl; }

/**
 * Check if native messaging is available. Result is cached.
 * @returns {Promise<boolean>}
 */
export async function isNative() {
  if (_nativeAvailable !== null) return _nativeAvailable;
  if (typeof chrome?.runtime?.sendNativeMessage !== 'function') {
    _nativeAvailable = false;
    return false;
  }
  try {
    const res = await _nativeRequest({ type: 'health' });
    _nativeAvailable = res?.status === 'ok';
  } catch {
    _nativeAvailable = false;
  }
  return _nativeAvailable;
}

// ──────────────────────────────────────────────
// High-level API - extension code calls these
// ──────────────────────────────────────────────

/** Get server info (project root, URL patterns, trusted patterns, version). */
export async function getInfo() {
  return _query('info');
}

/** Get server health status. */
export async function getHealth() {
  return _query('health');
}

/** List captures, optionally filtered by URL. */
export async function getCaptures(url) {
  return _query('captures', url ? { url } : {});
}

/** Get resolved annotations for a page URL. */
export async function getResolved(pageUrl) {
  return _query(`annotations/resolved`, { url: pageUrl });
}

/** Get pending capture requests from the agent. */
export async function getPendingRequests() {
  return _query('requests/pending');
}

/** Get project config. */
export async function getConfig() {
  return _query('config');
}

/** Get baselines for a URL. */
export async function getBaselines(url) {
  return _query('baselines', url ? { url } : {});
}

/** Compare baseline for a URL. */
export async function compareBaseline(url) {
  return _query('baselines/compare', { url });
}

/** Send a capture to the server. */
export async function sendCapture(data, headers = {}) {
  return _send('captures', data, headers);
}

/** Send a screenshot to the server. */
export async function sendScreenshot(data) {
  return _send('screenshots', data);
}

/** Update project config (merge). */
export async function updateConfig(data) {
  return _send('config', data, {}, 'PUT');
}

/** Set a baseline. */
export async function setBaseline(filename) {
  return _send('baselines', { filename });
}

/** Acknowledge a capture request. */
export async function ackRequest(id) {
  return _send(`requests/${id}/ack`, {});
}

/** Decline a capture request. */
export async function declineRequest(id, reason) {
  return _send(`requests/${id}/decline`, { reason });
}

// ──────────────────────────────────────────────
// Events (WebSocket handled internally)
// ──────────────────────────────────────────────

/**
 * Subscribe to server events (annotation resolved, audit results, etc.).
 * @param {string} type - Event type (e.g., 'annotation:resolved')
 * @param {function} callback - Called with event data
 */
export function onEvent(type, callback) {
  if (!_listeners.has(type)) _listeners.set(type, new Set());
  _listeners.get(type).add(callback);
  _ensureEventConnection();
}

/** Remove an event listener. */
export function offEvent(type, callback) {
  _listeners.get(type)?.delete(callback);
}

// ──────────────────────────────────────────────
// Internal - transport selection
// ──────────────────────────────────────────────

/** Send a native messaging request. */
function _nativeRequest(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, msg, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

/** Query (GET-like) via native messaging or HTTP. */
async function _query(endpoint, params = {}) {
  if (await isNative()) {
    const type = endpoint.replace(/\//g, ':');
    return _nativeRequest({ type, ...params });
  }
  if (!_serverUrl) return null;
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${_serverUrl}/${endpoint}${qs ? '?' + qs : ''}`;
  const authHeaders = (await getAuth()).isAuthenticated() ? await (await getAuth()).signRequest('GET', `/${endpoint}`) : {};
  const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: authHeaders });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Send (POST/PUT-like) via native messaging or HTTP. */
async function _send(endpoint, data, headers = {}, method = 'POST') {
  if (await isNative()) {
    const type = endpoint.replace(/\//g, ':');
    return _nativeRequest({ type, payload: data });
  }
  if (!_serverUrl) return null;
  const body = JSON.stringify(data);
  const authHeaders = (await getAuth()).isAuthenticated() ? await (await getAuth()).signRequest(method, `/${endpoint}`, body) : {};
  const res = await fetch(`${_serverUrl}/${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers, ...authHeaders },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Ensure WebSocket connection for events (HTTP fallback only). */
function _ensureEventConnection() {
  if (_ws || !_serverUrl) return;
  try {
    const wsUrl = _serverUrl.replace('http', 'ws');
    _ws = new WebSocket(wsUrl);
    _ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const handlers = _listeners.get(msg.type);
        if (handlers) for (const fn of handlers) fn(msg);
      } catch { /* malformed message */ }
    };
    _ws.onclose = () => { _ws = null; };
    _ws.onerror = () => { _ws = null; };
  } catch { /* WS not available */ }
}
