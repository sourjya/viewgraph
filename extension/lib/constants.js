/**
 * Shared Constants - Extension
 *
 * Single source of truth for values shared between the extension and
 * the MCP server. Keep in sync with server/src/constants.js.
 *
 * Multi-project support: scans ports 9876-9879 and builds a registry
 * of all running servers with their capturesDir and projectRoot.
 * The background script matches page URLs to the correct server.
 *
 * @see docs/bugs/BUG-009-multi-project-routing.md
 */

/** Default HTTP receiver port for MCP server communication. */
export const DEFAULT_HTTP_PORT = 9876;

/** Max ports to scan when discovering servers. */
export const PORT_SCAN_RANGE = 4;

/** Base URL for the MCP server HTTP receiver. */
export const SERVER_BASE_URL = `http://127.0.0.1:${DEFAULT_HTTP_PORT}`;

/**
 * Server registry - all running ViewGraph servers keyed by port.
 * Each entry: { url, capturesDir, projectRoot, agent, token }
 * Refreshed on every discoverServer() call when cache expires.
 */
let _serverRegistry = new Map();
let _registryExpiry = 0;

/** Cache duration for the server registry (ms). */
const REGISTRY_TTL = 15000;

/** Reset the server discovery cache. Used in tests. */
export function resetServerCache() {
  _serverRegistry = new Map();
  _registryExpiry = 0;
}

/** Get the cached auth token for a specific server URL. */
export function getServerToken(serverUrl) {
  if (!serverUrl) {
    // Return first available token for backward compat
    for (const entry of _serverRegistry.values()) {
      if (entry.token) return entry.token;
    }
    return null;
  }
  return _serverRegistry.get(serverUrl)?.token || null;
}

/** Get the detected agent name. Defaults to "Agent". */
export function getAgentName() {
  for (const entry of _serverRegistry.values()) {
    if (entry.agent) return entry.agent;
  }
  return 'Agent';
}

/**
 * Scan all ports and build the server registry.
 * @returns {Promise<Map>} The server registry
 */
async function refreshRegistry() {
  if (Date.now() < _registryExpiry) return _serverRegistry;

  const newRegistry = new Map();
  const probes = [];

  for (let p = DEFAULT_HTTP_PORT; p < DEFAULT_HTTP_PORT + PORT_SCAN_RANGE; p++) {
    const url = `http://127.0.0.1:${p}`;
    probes.push(
      fetch(`${url}/info`, { signal: AbortSignal.timeout(500) })
        .then((res) => res.ok ? res.json() : null)
        .then((info) => {
          if (info) {
            newRegistry.set(url, {
              url,
              capturesDir: info.capturesDir || null,
              projectRoot: info.projectRoot || null,
              agent: info.agent || null,
              token: null,
            });
          }
        })
        .catch(() => { /* port not responding */ }),
    );
  }

  await Promise.all(probes);

  // Fetch tokens for each server
  try {
    const result = await chrome.storage.local.get('vg-auth-token');
    const token = result['vg-auth-token'] || null;
    for (const entry of newRegistry.values()) {
      entry.token = token;
    }
  } catch { /* no token */ }

  _serverRegistry = newRegistry;
  _registryExpiry = Date.now() + REGISTRY_TTL;
  return _serverRegistry;
}

/**
 * Get all running servers. Refreshes registry if stale.
 * @returns {Promise<Array<{ url, capturesDir, projectRoot, agent }>>}
 */
export async function getAllServers() {
  const reg = await refreshRegistry();
  return [...reg.values()];
}

/**
 * Find the best server for a given page URL.
 *
 * Matching strategy:
 * 1. file:// URLs: match against projectRoot (longest prefix wins)
 * 2. http(s):// URLs: match against projectRoot if URL contains it,
 *    or fall back to the server with a matching capturesDir
 * 3. If no match, return the first available server
 *
 * @param {string|null} pageUrl - The URL of the page being captured
 * @param {string|null} targetDir - Explicit capturesDir override
 * @returns {Promise<string|null>} Server base URL
 */
export async function discoverServer(pageUrl = null, targetDir = null) {
  const reg = await refreshRegistry();
  if (reg.size === 0) return null;

  // Explicit capturesDir match (from manual project mappings)
  if (targetDir) {
    for (const entry of reg.values()) {
      if (entry.capturesDir === targetDir) return entry.url;
    }
  }

  // file:// URL matching - compare against projectRoot
  if (pageUrl?.startsWith('file://')) {
    const filePath = decodeURIComponent(pageUrl.replace('file://', ''));
    let bestMatch = null;
    let bestLen = 0;
    for (const entry of reg.values()) {
      if (entry.projectRoot && filePath.startsWith(entry.projectRoot) && entry.projectRoot.length > bestLen) {
        bestMatch = entry.url;
        bestLen = entry.projectRoot.length;
      }
    }
    if (bestMatch) return bestMatch;
  }

  // localhost URL matching - check if any projectRoot is in the URL path
  // or if the server was started from a project that serves on this port
  if (pageUrl && (pageUrl.includes('localhost') || pageUrl.includes('127.0.0.1'))) {
    // For localhost, we can't match by path. If there's only one server, use it.
    if (reg.size === 1) return [...reg.values()][0].url;
    // Multiple servers: return the one whose capturesDir was explicitly set
    if (targetDir) {
      for (const entry of reg.values()) {
        if (entry.capturesDir === targetDir) return entry.url;
      }
    }
  }

  // Fallback: return first available server
  return [...reg.values()][0].url;
}

/**
 * Build Authorization headers for POST requests to the server.
 * @param {string} [serverUrl] - Specific server URL to get token for
 * @returns {object}
 */
export function authHeaders(serverUrl) {
  const token = getServerToken(serverUrl);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
