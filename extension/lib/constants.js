/**
 * Shared Constants - Extension
 *
 * Single source of truth for values shared between the extension and
 * the MCP server. Keep in sync with server/src/constants.js.
 */

/** Default HTTP receiver port for MCP server communication. */
export const DEFAULT_HTTP_PORT = 9876;

/** Max ports to scan when discovering the server. */
export const PORT_SCAN_RANGE = 4;

/** Base URL for the MCP server HTTP receiver. */
export const SERVER_BASE_URL = `http://127.0.0.1:${DEFAULT_HTTP_PORT}`;

/**
 * Discover the active MCP server by probing ports 9876-9879.
 * Caches the result for 30s to avoid repeated scans.
 * @param {string|null} targetDir - If set, find the server whose capturesDir matches
 * @returns {Promise<string|null>} Base URL of the server, or null
 */
let _cachedUrl = null;
let _cacheExpiry = 0;
export async function discoverServer(targetDir = null) {
  if (_cachedUrl && Date.now() < _cacheExpiry) return _cachedUrl;
  let fallback = null;
  for (let p = DEFAULT_HTTP_PORT; p < DEFAULT_HTTP_PORT + PORT_SCAN_RANGE; p++) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/health`, { signal: AbortSignal.timeout(500) });
      const data = await res.json();
      if (data.status === 'ok') {
        if (!targetDir || data.capturesDir === targetDir) {
          _cachedUrl = `http://127.0.0.1:${p}`;
          _cacheExpiry = Date.now() + 30000;
          return _cachedUrl;
        }
        if (!fallback) fallback = `http://127.0.0.1:${p}`;
      }
    } catch { /* port not responding */ }
  }
  // No exact match - use any healthy server
  if (fallback) { _cachedUrl = fallback; _cacheExpiry = Date.now() + 30000; }
  return fallback;
}
