/**
 * Server Discovery - Content Script Client
 *
 * Thin client that delegates server discovery to the service worker via
 * chrome.runtime.sendMessage. The SW owns port scanning, registry, auth,
 * and transport initialization. This module maintains the same API surface
 * for backward compatibility with existing consumers.
 *
 * M19: Replaced direct port scanning with message-based delegation.
 * S1-4: Decoupled from transport.js - SW owns transport lifecycle.
 *
 * @see lib/sw/discovery-sw.js - SW discovery (owns the registry)
 * @see lib/constants.js - re-exports discoverServer, getAllServers, etc.
 */

/** Last discovered server URL (cached from SW response). */
let _serverUrl = null;

/** Last agent name from SW response. */
let _agentName = null;

/** Reset the discovery cache. Used in tests and sidebar destroy. */
export function resetServerCache() {
  _serverUrl = null;
  _agentName = null;
}

/** Get the detected agent name. Defaults to "Agent". */
export function getAgentName() {
  return _agentName || 'Agent';
}

/**
 * Get all running servers by asking the SW.
 * @returns {Promise<Array<{ url, capturesDir, projectRoot, agent }>>}
 */
export async function getAllServers() {
  try {
    const response = await _sendToSw('vg-get-server', { pageUrl: null });
    if (response?.url) return [{ url: response.url, agent: response.agentName }];
    return [];
  } catch { return []; }
}

/**
 * Find the best server for a page URL via the service worker.
 * The SW handles transport initialization and auth.
 *
 * @param {string|null} pageUrl - The URL of the page being captured
 * @param {string|null} _targetDir - Unused (kept for API compat)
 * @returns {Promise<string|null>} Server base URL
 */
export async function discoverServer(pageUrl = null, _targetDir = null) {
  try {
    const response = await _sendToSw('vg-get-server', { pageUrl });
    if (response?.url) {
      _serverUrl = response.url;
      _agentName = response.agentName || null;
      return response.url;
    }
  } catch { /* SW not ready */ }
  _serverUrl = null;
  return null;
}

/**
 * Send a message to the service worker and return the response.
 * @param {string} type - Message type
 * @param {object} payload - Message payload
 * @returns {Promise<object>}
 */
function _sendToSw(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}
