/**
 * Server Discovery - Content Script Client
 *
 * Thin client that delegates server discovery to the service worker via
 * chrome.runtime.sendMessage. The SW owns port scanning, registry, and
 * auth. This module maintains the same API surface for backward
 * compatibility with existing consumers.
 *
 * M19: Replaced direct port scanning with message-based delegation.
 *
 * @see lib/sw/discovery-sw.js - SW discovery (owns the registry)
 * @see lib/transport.js - initialized by discoverServer() when a server is found
 * @see lib/constants.js - re-exports discoverServer, getAllServers, etc.
 */

import * as transport from '#lib/transport.js';

/** Last discovered server URL (cached from SW response). */
let _serverUrl = null;

/** Last agent name from SW response. */
let _agentName = null;

/** Reset the discovery cache. Used in tests and sidebar destroy. */
export function resetServerCache() {
  _serverUrl = null;
  _agentName = null;
  transport.reset();
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
    // vg-get-server returns a single match; for getAllServers we need the full list.
    // Fall back to the fetch-info proxy for now (background.js handles it).
    if (response?.url) return [{ url: response.url, agent: response.agentName }];
    return [];
  } catch { return []; }
}

/**
 * Find the best server for a page URL via the service worker.
 * Initializes transport.js with the discovered URL.
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
      transport.init(response.url);
      return response.url;
    }
  } catch { /* SW not ready - fall through */ }
  _serverUrl = null;
  transport.reset();
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
