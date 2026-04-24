/**
 * Extension Auth Module
 *
 * Handles HMAC handshake and request signing for authenticated
 * communication with the ViewGraph MCP server.
 *
 * The server includes the session key in the handshake response.
 * The extension uses it to sign all subsequent requests.
 * Security comes from: challenge-response (proves liveness),
 * HMAC signatures (proves possession of key), timestamps (prevents replay).
 *
 * @see docs/decisions/ADR-015-hmac-signed-localhost.md
 */

let _sessionId = null;
let _secret = null;
let _authenticated = false;

/**
 * Perform the handshake with the server.
 * @param {string} serverUrl - Base URL (e.g., http://127.0.0.1:9876)
 * @returns {Promise<boolean>} true if authenticated
 */
export async function authenticate(serverUrl) {
  try {
    // Step 1: Get challenge + key from server
    const res = await fetch(`${serverUrl}/handshake`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const { challenge, key } = await res.json();
    if (!challenge || !key) return false;

    // Step 2: Compute HMAC response to prove we received the challenge
    const response = await hmacSign(key, `HANDSHAKE\n${challenge}\n\n`);

    // Step 3: Verify with server
    const verifyRes = await fetch(`${serverUrl}/handshake/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ response }),
      signal: AbortSignal.timeout(3000),
    });
    if (!verifyRes.ok) return false;
    const result = await verifyRes.json();
    if (!result.sessionId) return false;

    _sessionId = result.sessionId;
    _secret = key;
    _authenticated = true;
    return true;
  } catch (err) {
    console.error('[ViewGraph] Auth handshake failed:', err?.message || err);
    _authenticated = false;
    return false;
  }
}

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
  const bodyHash = await sha256(body || '');
  const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = await hmacSign(_secret, message);
  return {
    'x-vg-session': _sessionId,
    'x-vg-timestamp': timestamp,
    'x-vg-signature': signature,
  };
}

/** @returns {boolean} */
export function isAuthenticated() { return _authenticated; }

/** Clear auth state. Called on sidebar destroy. */
export function clearAuth() {
  _sessionId = null;
  _secret = null;
  _authenticated = false;
}

// ──────────────────────────────────────────────
// Web Crypto helpers
// ──────────────────────────────────────────────

async function hmacSign(key, message) {
  if (!crypto?.subtle) return ''; // Not available in test environment
  const keyBytes = hexToBytes(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(sig));
}

async function sha256(data) {
  if (!crypto?.subtle) return '';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return bytesToHex(new Uint8Array(hash));
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
