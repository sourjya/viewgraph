/**
 * Shared Constants - Extension
 *
 * Single source of truth for values shared between the extension and
 * the MCP server. Keep in sync with server/src/constants.js.
 */

import { createTransport } from './transport.js';

/** Singleton transport instance, created when server is discovered. */
let _transport = null;

/**
 * Get the transport for the current server connection.
 * Returns null if no server has been discovered yet.
 */
export function getTransport() { return _transport; }

/**
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

/** Localhost bind address for all server connections. */
export const SERVER_HOST = '127.0.0.1';

/** Base URL for the MCP server HTTP receiver. */
export const SERVER_BASE_URL = `http://${SERVER_HOST}:${DEFAULT_HTTP_PORT}`;

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
  _transport = null;
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
    const url = `http://${SERVER_HOST}:${p}`;
    probes.push(
      fetch(`${url}/info`, { signal: AbortSignal.timeout(1000) })
        .then((res) => res.ok ? res.json() : null)
        .then((info) => {
          if (info) {
            newRegistry.set(url, {
              url,
              capturesDir: info.capturesDir || null,
              projectRoot: info.projectRoot || null,
              urlPatterns: info.urlPatterns || [],
              agent: info.agent || null,
            });
          }
        })
        .catch(() => { /* port not responding */ }),
    );
  }

  await Promise.all(probes);

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
 * Normalize a URL for consistent matching.
 * - Replaces 127.0.0.1 and 0.0.0.0 with localhost
 * - Replaces [::1] (IPv6 loopback) with localhost
 * - Normalizes Windows file paths (backslash to forward slash)
 * @param {string|null} url
 * @returns {string|null}
 */
function normalizeUrl(url) {
  if (!url) return null;
  return url
    .replace(/\/\/127\.0\.0\.1([:/])/g, '//localhost$1')
    .replace(/\/\/0\.0\.0\.0([:/])/g, '//localhost$1')
    .replace(/\/\/\[::1\]([:/])/g, '//localhost$1')
    .replace(/\\/g, '/');
}

/**
 * Extract the filesystem path from a file:// URL.
 *
 * File URLs vary by platform:
 *   Linux/macOS:  file:///home/user/project/index.html
 *   Windows:      file:///C:/Users/user/project/index.html
 *   WSL via Chrome on Windows: file://wsl.localhost/Ubuntu/home/user/...
 *                            or file://wsl$/Ubuntu/home/user/...
 *
 * The WSL case is special: Chrome on Windows accesses WSL filesystems
 * through a UNC-style path (\\wsl.localhost\DistroName\...). The distro
 * name can be anything - Ubuntu, Debian, AmazonWSL, kali-linux, etc.
 * The server inside WSL reports projectRoot as /home/user/project, so
 * we must strip the wsl.localhost/DistroName prefix to get the Linux
 * path that matches.
 *
 * For non-WSL users (direct Windows, macOS, Linux), this function is
 * a simple passthrough - it just strips the file:// protocol prefix.
 *
 * @param {string} fileUrl - Normalized file:// URL
 * @returns {string} Filesystem path
 */
function extractFilePath(fileUrl) {
  let path = decodeURIComponent(fileUrl.replace('file://', ''));

  // Strip leading slashes that vary by browser:
  // Chrome: file://wsl.localhost/...  -> wsl.localhost/...
  // Firefox: file://///wsl.localhost/... -> ///wsl.localhost/...
  // Normalize to no leading slashes before the host/path
  path = path.replace(/^\/+(?=wsl)/i, '');

  // WSL detection: Chrome on Windows shows WSL paths as
  // file://wsl.localhost/<DistroName>/home/... or file://wsl$/<DistroName>/home/...
  // where <DistroName> is any installed WSL distribution (Ubuntu, Debian,
  // AmazonWSL, kali-linux, openSUSE-Leap-15.4, etc.)
  // We strip everything up to and including the distro name to get the
  // Linux-native path that matches the server's projectRoot.
  const wslMatch = path.match(/^wsl[.$]localhost\/[^/]+(\/.*)/i)
    || path.match(/^wsl\$\/[^/]+(\/.*)/i);
  if (wslMatch) return wslMatch[1];

  // Windows (non-WSL): file:///C:/Users/... -> C:/Users/...
  if (/^\/[A-Za-z]:\//.test(path)) return path.slice(1);

  // Linux/macOS: file:///home/user/... -> /home/user/... (no change needed)
  return path;
}

/**
 * Extract the port number from a URL string.
 * @param {string} url
 * @returns {string|null} Port string or null
 */
function extractPort(url) {
  const m = url.match(/:(\d{2,5})(\/|$)/);
  return m ? m[1] : null;
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
  const url = await _discoverServerImpl(pageUrl, targetDir);
  // F11: Create transport singleton when server is found
  if (url && !_transport) _transport = createTransport(url);
  if (!url) _transport = null;
  return url;
}

/** Internal implementation - finds the best server URL. */
async function _discoverServerImpl(pageUrl = null, targetDir = null) {
  const reg = await refreshRegistry();
  if (reg.size === 0) return null;

  // Normalize the page URL for consistent matching
  const normalizedUrl = normalizeUrl(pageUrl);

  // Explicit capturesDir match (from manual project mappings)
  if (targetDir) {
    for (const entry of reg.values()) {
      if (entry.capturesDir === targetDir) return entry.url;
    }
  }

  // Mode 1: file:// URLs - match against projectRoot (longest prefix wins)
  if (normalizedUrl?.startsWith('file://')) {
    const filePath = extractFilePath(normalizedUrl);
    let bestMatch = null;
    let bestLen = 0;
    for (const entry of reg.values()) {
      // Normalize projectRoot: backslash to forward slash for Windows compat
      const normRoot = entry.projectRoot?.replace(/\\/g, '/');
      if (normRoot && filePath.startsWith(normRoot) && normRoot.length > bestLen) {
        bestMatch = entry.url;
        bestLen = normRoot.length;
      }
    }
    if (bestMatch) return bestMatch;
  }

  // Mode 2 & 3: localhost / remote URLs - match against urlPatterns
  if (normalizedUrl) {
    // Extract port from URL for port-only fallback matching
    const urlPort = extractPort(normalizedUrl);

    for (const entry of reg.values()) {
      for (const pattern of entry.urlPatterns || []) {
        // Direct substring match
        if (normalizedUrl.includes(pattern)) return entry.url;
        // Port-only fallback: pattern "localhost:3000" matches any host on :3000
        if (urlPort && pattern.includes(':') && pattern.endsWith(':' + urlPort)) return entry.url;
      }
    }
  }

  // Single server with file:// URL: auto-match (local development)
  if (reg.size === 1 && pageUrl?.startsWith('file://')) return [...reg.values()][0].url;

  // Single server with localhost URL: auto-match (local development)
  if (reg.size === 1) {
    try {
      const u = new URL(pageUrl);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0' || u.hostname === '[::1]') {
        return [...reg.values()][0].url;
      }
    } catch { /* invalid URL */ }
  }

  // Remote URLs with no matching pattern: do NOT route to any server
  return null;
}



// ──────────────────────────────────────────────
// Project Config Helpers
// ──────────────────────────────────────────────

/** Cache key for config in chrome.storage.local. */
const CONFIG_CACHE_KEY = 'vg_project_config';

/**
 * Fetch project config from the server and cache in chrome.storage.local.
 * Returns cached value if server is unreachable.
 * @param {string} serverUrl - Base URL of the ViewGraph server
 * @returns {Promise<Object>} Config object (empty {} if unavailable)
 */
export async function fetchConfig(serverUrl) {
  try {
    const res = await fetch(`${serverUrl}/config`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const config = await res.json();
    try { await chrome.storage.local.set({ [CONFIG_CACHE_KEY]: config }); } catch { /* tests */ }
    return config;
  } catch {
    // Server offline - return cached value
    try {
      const data = await chrome.storage.local.get(CONFIG_CACHE_KEY);
      return data[CONFIG_CACHE_KEY] || {};
    } catch { return {}; }
  }
}

/**
 * Update project config on the server and refresh local cache.
 * @param {string} serverUrl - Base URL of the ViewGraph server
 * @param {Object} updates - Key-value pairs to merge into config
 * @returns {Promise<Object>} Updated config object
 */
export async function updateConfig(serverUrl, updates) {
  const res = await fetch(`${serverUrl}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const config = await res.json();
  try { await chrome.storage.local.set({ [CONFIG_CACHE_KEY]: config }); } catch { /* tests */ }
  return config;
}

// ──────────────────────────────────────────────
// F17: URL Trust Classification
// ──────────────────────────────────────────────

/**
 * Check if a URL is a local development URL (always trusted).
 * Covers localhost, 127.0.0.1, 0.0.0.0, [::1], file://, wsl.localhost.
 */
function isLocalUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    const h = u.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]' || h === 'wsl.localhost';
  } catch { return false; }
}

/**
 * Classify a URL's trust level for send-to-agent gating.
 * @param {string} pageUrl - The current page URL
 * @param {string[]} [trustedPatterns] - From config.json trustedPatterns
 * @returns {{ level: 'trusted'|'configured'|'untrusted', reason: string }}
 */
export function classifyTrust(pageUrl, trustedPatterns = []) {
  if (!pageUrl) return { level: 'untrusted', reason: 'empty URL' };
  if (isLocalUrl(pageUrl)) return { level: 'trusted', reason: 'localhost' };
  for (const pattern of trustedPatterns) {
    if (pageUrl.includes(pattern)) return { level: 'configured', reason: pattern };
  }
  return { level: 'untrusted', reason: 'remote URL' };
}
