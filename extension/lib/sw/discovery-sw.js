/**
 * Service Worker Discovery
 *
 * Port scans 9876-9879, builds a server registry, and matches page URLs
 * to the correct server. Runs in the service worker context only.
 * Content scripts get server info via chrome.runtime.sendMessage.
 *
 * Registry is persisted to chrome.storage.local so it survives SW
 * termination. On cold start, restoreRegistry() loads the cached
 * registry before the first port scan completes.
 *
 * Replaces: discovery.js (content script) + fetchServerInfo() (background.js)
 *
 * @see lib/discovery.js - content script version (being replaced)
 * @see lib/constants.js - DEFAULT_HTTP_PORT, PORT_SCAN_RANGE, SERVER_HOST
 * @see .kiro/specs/sw-communication/design.md - discovery design
 */

import { normalizeUrl, extractFilePath, extractPort } from '#lib/url-utils.js';
import { DEFAULT_HTTP_PORT, PORT_SCAN_RANGE, SERVER_HOST } from '#lib/constants.js';

/** chrome.storage.local key for the persisted registry. */
const REGISTRY_KEY = 'vg-server-registry';

/** chrome.storage.local key for the current server URL (read by transport-client). */
const SERVER_URL_KEY = 'vg-server-url';

/** Cache duration for the server registry (ms). */
const REGISTRY_TTL = 15000;

/**
 * Server registry - all running ViewGraph servers.
 * Each entry: { url, capturesDir, projectRoot, urlPatterns, agent, cachedAt }
 * @type {Array<object>}
 */
let _registry = [];

/** Timestamp when the registry was last refreshed. */
let _registryExpiry = 0;

/** Last matched server URL (set by discover()). */
let _serverUrl = null;

/** Last matched agent name. */
let _agentName = null;

// ──────────────────────────────────────────────
// Port Scanning
// ──────────────────────────────────────────────

/**
 * Scan all ports and build the server registry.
 * Persists results to chrome.storage.local.
 * @returns {Promise<Array>} The server registry entries
 */
async function refreshRegistry() {
  if (Date.now() < _registryExpiry && _registry.length > 0) return _registry;

  const entries = [];
  const probes = [];

  for (let p = DEFAULT_HTTP_PORT; p < DEFAULT_HTTP_PORT + PORT_SCAN_RANGE; p++) {
    const url = `http://${SERVER_HOST}:${p}`;
    probes.push(
      fetch(`${url}/info`, { signal: AbortSignal.timeout(1000) })
        .then((res) => res.ok ? res.json() : null)
        .then((info) => {
          if (info) {
            entries.push({
              url,
              capturesDir: info.capturesDir || null,
              projectRoot: info.projectRoot || null,
              urlPatterns: info.urlPatterns || [],
              agent: info.agent || null,
              cachedAt: Date.now(),
            });
          }
        })
        .catch(() => { /* port not responding */ }),
    );
  }

  await Promise.all(probes);
  _registry = entries;
  _registryExpiry = Date.now() + REGISTRY_TTL;
  await persistRegistry();
  return _registry;
}

// ──────────────────────────────────────────────
// URL Matching
// ──────────────────────────────────────────────

/**
 * Find the best server for a page URL. Initializes transport with the
 * matched server URL and writes it to chrome.storage.local for the
 * content script's transport-client to read.
 *
 * @param {string|null} pageUrl - The URL of the page being captured
 * @returns {Promise<string|null>} Server base URL or null
 */
export async function discover(pageUrl = null, targetDir = null) {
  const reg = await refreshRegistry();
  if (reg.length === 0) {
    _serverUrl = null;
    return null;
  }

  const url = _matchUrl(pageUrl, reg, targetDir);
  _serverUrl = url;
  if (url) {
    const entry = reg.find((e) => e.url === url);
    _agentName = entry?.agent || null;
    try { await chrome.storage.local.set({ [SERVER_URL_KEY]: url }); } catch { /* tests */ }
  }
  return url;
}

/**
 * Match a page URL against the registry.
 * @param {string|null} pageUrl
 * @param {Array} reg - Registry entries
 * @returns {string|null} Matched server URL
 */
function _matchUrl(pageUrl, reg, targetDir = null) {
  // Explicit capturesDir match
  if (targetDir) {
    for (const entry of reg) {
      if (entry.capturesDir === targetDir) return entry.url;
    }
  }

  if (!pageUrl) return null;

  const normalized = normalizeUrl(pageUrl);

  // file:// URLs - match against projectRoot (longest prefix wins)
  if (normalized?.startsWith('file://')) {
    const filePath = extractFilePath(normalized);
    let best = null;
    let bestLen = 0;
    for (const entry of reg) {
      const root = entry.projectRoot?.replace(/\\/g, '/');
      if (root && filePath.startsWith(root) && root.length > bestLen) {
        best = entry.url;
        bestLen = root.length;
      }
    }
    if (best) return best;
    if (reg.length === 1) return reg[0].url;
  }

  // http(s):// URLs - match against urlPatterns + port-only fallback
  if (normalized) {
    const urlPort = extractPort(normalized);
    for (const entry of reg) {
      for (const pattern of entry.urlPatterns || []) {
        if (normalized.includes(pattern)) return entry.url;
        if (urlPort && pattern.includes(':') && pattern.endsWith(':' + urlPort)) return entry.url;
      }
    }
  }

  // Single server + localhost URL: auto-match
  if (reg.length === 1) {
    try {
      const u = new URL(pageUrl);
      if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(u.hostname)) {
        return reg[0].url;
      }
    } catch { /* invalid URL */ }
  }

  return null;
}

// ──────────────────────────────────────────────
// Registry Persistence
// ──────────────────────────────────────────────

/**
 * Persist the current registry to chrome.storage.local.
 * Called after every successful port scan.
 */
async function persistRegistry() {
  try { await chrome.storage.local.set({ [REGISTRY_KEY]: _registry }); } catch { /* tests */ }
}

/**
 * Restore the registry from chrome.storage.local.
 * Called on service worker cold start before the first port scan.
 */
export async function restoreRegistry() {
  try {
    const data = await chrome.storage.local.get(REGISTRY_KEY);
    if (data[REGISTRY_KEY]?.length) {
      _registry = data[REGISTRY_KEY];
      // Don't set _registryExpiry - next discover() will refresh from network
    }
  } catch { /* no cached registry */ }
}

// ──────────────────────────────────────────────
// Accessors
// ──────────────────────────────────────────────

/**
 * Get all running servers. Refreshes registry if stale.
 * @returns {Promise<Array>}
 */
export async function getAllServers() {
  if (_registry.length === 0) await refreshRegistry();
  return [..._registry];
}

/** Get the last matched server URL. */
export function getServerUrl() { return _serverUrl; }

/** Get the agent name from the last matched server. Defaults to 'Agent'. */
export function getAgentName() { return _agentName || 'Agent'; }
