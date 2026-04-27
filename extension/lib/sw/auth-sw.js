/**
 * Service Worker Auth
 *
 * Handles HMAC handshake and request signing in the service worker context.
 * Session state is stored in chrome.storage.session which survives SW
 * termination but is cleared on browser restart.
 *
 * The SW owns auth because it owns all HTTP connections. Content scripts
 * never see the session secret or make direct server requests.
 *
 * @see lib/auth.js - content script version (being replaced)
 * @see docs/decisions/ADR-015-hmac-signed-localhost.md
 * @see .kiro/specs/sw-communication/design.md - auth state in storage.session
 */

import { KEYS } from '#lib/storage.js';

/** chrome.storage.session key for auth state. */
const AUTH_KEY = KEYS.authState;

/** In-memory auth state (restored from storage on cold start). */
let _sessionId = null;
let _secret = null;
let _authenticated = false;

// ──────────────────────────────────────────────
// Handshake
// ──────────────────────────────────────────────

/**
 * Perform the HMAC handshake with the server.
 * On success, stores session in chrome.storage.session.
 *
 * @param {string} serverUrl - Base URL (e.g., http://127.0.0.1:9876)
 * @returns {Promise<boolean>} true if authenticated
 */
export async function authenticate(serverUrl) {
  try {
    // Step 1: Get challenge + key from server
    const res = await fetch(`${serverUrl}/handshake`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) { _clearState(); return false; }
    const { challenge, key } = await res.json();
    if (!challenge || !key) { _clearState(); return false; }

    // Step 2: Compute HMAC response
    const response = await _hmacSign(key, `HANDSHAKE\n${challenge}\n\n`);

    // Step 3: Verify with server
    const verifyRes = await fetch(`${serverUrl}/handshake/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ response }),
      signal: AbortSignal.timeout(3000),
    });
    if (!verifyRes.ok) { _clearState(); return false; }
    const result = await verifyRes.json();
    if (!result.sessionId) { _clearState(); return false; }

    _sessionId = result.sessionId;
    _secret = key;
    _authenticated = true;
    await _persistState();
    return true;
  } catch (err) {
    console.warn('[ViewGraph] Auth handshake failed:', err?.message);
    _clearState();
    return false;
  }
}

// ──────────────────────────────────────────────
// Session Persistence
// ──────────────────────────────────────────────

/**
 * Restore auth session from chrome.storage.session.
 * Called on service worker cold start.
 */
export async function restoreSession() {
  try {
    const data = await chrome.storage.session.get(AUTH_KEY);
    const state = data[AUTH_KEY];
    if (state?.authenticated && state?.sessionId && state?.secret) {
      _sessionId = state.sessionId;
      _secret = state.secret;
      _authenticated = true;
    }
  } catch { /* no stored session */ }
}

/** Persist current auth state to chrome.storage.session. */
async function _persistState() {
  try {
    await chrome.storage.session.set({
      [AUTH_KEY]: { sessionId: _sessionId, secret: _secret, authenticated: _authenticated },
    });
  } catch { /* tests */ }
}

/** Clear auth state from memory and storage. */
function _clearState() {
  _sessionId = null;
  _secret = null;
  _authenticated = false;
  try { chrome.storage.session.remove(AUTH_KEY); } catch { /* tests */ }
}

// ──────────────────────────────────────────────
// Request Signing
// ──────────────────────────────────────────────

/**
 * Get HMAC signing headers for a request.
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} [body] - Request body
 * @returns {Promise<object>} Headers object or empty if not authenticated
 */
export async function signRequest(method, path, body = '') {
  if (!_authenticated || !_secret || !_sessionId) return {};
  const timestamp = String(Date.now());
  const bodyHash = await _sha256(body || '');
  const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = await _hmacSign(_secret, message);
  return {
    'x-vg-session': _sessionId,
    'x-vg-timestamp': timestamp,
    'x-vg-signature': signature,
  };
}

/** @returns {boolean} */
export function isAuthenticated() { return _authenticated; }

// ──────────────────────────────────────────────
// Web Crypto helpers
// ──────────────────────────────────────────────

async function _hmacSign(key, message) {
  if (!crypto?.subtle) return '';
  const keyBytes = _hexToBytes(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return _bytesToHex(new Uint8Array(sig));
}

async function _sha256(data) {
  if (!crypto?.subtle) return '';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return _bytesToHex(new Uint8Array(hash));
}

function _hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function _bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
