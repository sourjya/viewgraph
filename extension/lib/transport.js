/**
 * Transport Abstraction Layer
 *
 * Wraps extension-to-server communication. Uses Chrome native messaging
 * when available (cryptographic caller identity), falls back to HTTP.
 * All extension code should use this instead of direct fetch() calls.
 *
 * @see ADR-013 native messaging transport
 * @see .kiro/specs/native-messaging/design.md
 */

/** Native messaging host name (must match manifest). */
const HOST_NAME = 'com.viewgraph.host';

/**
 * Create a transport instance for a given server URL.
 * @param {string} serverUrl - HTTP base URL (e.g., 'http://127.0.0.1:9876')
 * @returns {{ send: function, query: function, isNative: function }}
 */
export function createTransport(serverUrl) {
  let _nativeAvailable = null; // null = untested, true/false = cached

  /**
   * Check if native messaging is available. Result is cached.
   * @returns {Promise<boolean>}
   */
  async function isNative() {
    if (_nativeAvailable !== null) return _nativeAvailable;
    if (typeof chrome?.runtime?.sendNativeMessage !== 'function') {
      _nativeAvailable = false;
      return false;
    }
    try {
      const res = await nativeRequest({ type: 'health' });
      _nativeAvailable = res?.status === 'ok';
    } catch {
      _nativeAvailable = false;
    }
    return _nativeAvailable;
  }

  /**
   * Send a native messaging request and return the response.
   * @param {object} msg - Message to send
   * @returns {Promise<object>}
   */
  function nativeRequest(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendNativeMessage(HOST_NAME, msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Query the server (GET-like operation).
   * @param {string} endpoint - e.g., 'health', 'info', 'captures'
   * @param {object} [params] - Query parameters
   * @returns {Promise<object>}
   */
  async function query(endpoint, params = {}) {
    if (await isNative()) {
      return nativeRequest({ type: endpoint, ...params });
    }
    // HTTP fallback
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `${serverUrl}/${endpoint}${qs ? '?' + qs : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.json();
  }

  /**
   * Send data to the server (POST-like operation).
   * @param {string} endpoint - e.g., 'captures', 'screenshots'
   * @param {object} data - Payload to send
   * @param {object} [headers] - Additional headers
   * @returns {Promise<object>}
   */
  async function send(endpoint, data, headers = {}) {
    if (await isNative()) {
      return nativeRequest({ type: endpoint, payload: data });
    }
    // HTTP fallback
    const res = await fetch(`${serverUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    return res.json();
  }

  return { send, query, isNative };
}
