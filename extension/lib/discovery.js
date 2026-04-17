/**
 * Server Discovery
 *
 * Scans localhost ports 9876-9879 to find running ViewGraph MCP servers.
 * Builds a registry of all servers with their project roots and URL patterns,
 * then routes page URLs to the correct server.
 *
 * This module uses direct fetch() for port scanning because it runs before
 * the transport layer is initialized. Once a server is found, it initializes
 * transport.js for all subsequent communication.
 *
 * @see lib/transport.js - initialized by discoverServer() when a server is found
 * @see lib/constants.js - DEFAULT_HTTP_PORT, PORT_SCAN_RANGE, SERVER_HOST
 * @see docs/bugs/BUG-009-multi-project-routing.md
 */

import * as transport from '#lib/transport.js';
import { DEFAULT_HTTP_PORT, PORT_SCAN_RANGE, SERVER_HOST } from '#lib/constants.js';
import { normalizeUrl, extractFilePath, extractPort } from '#lib/url-utils.js';

/**
 * Server registry - all running ViewGraph servers keyed by URL.
 * Each entry: { url, capturesDir, projectRoot, urlPatterns, agent }
 * Refreshed when cache expires (REGISTRY_TTL).
 */
let _serverRegistry = new Map();
let _registryExpiry = 0;

/** Cache duration for the server registry (ms). */
const REGISTRY_TTL = 15000;

/** Reset the server discovery cache. Used in tests and sidebar destroy. */
export function resetServerCache() {
  _serverRegistry = new Map();
  _registryExpiry = 0;
  transport.reset();
}

/** Get the detected agent name from the first server with one. Defaults to "Agent". */
export function getAgentName() {
  for (const entry of _serverRegistry.values()) {
    if (entry.agent) return entry.agent;
  }
  return 'Agent';
}

/**
 * Scan all ports and build the server registry.
 * Uses direct fetch() because transport is not yet initialized.
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
 * Find the best server for a given page URL and initialize transport.
 *
 * Matching strategy:
 * 1. file:// URLs: match against projectRoot (longest prefix wins)
 * 2. http(s):// URLs: match against urlPatterns
 * 3. Single server + localhost URL: auto-match
 * 4. No match: return null
 *
 * @param {string|null} pageUrl - The URL of the page being captured
 * @param {string|null} targetDir - Explicit capturesDir override
 * @returns {Promise<string|null>} Server base URL
 */
export async function discoverServer(pageUrl = null, targetDir = null) {
  const url = await _discoverServerImpl(pageUrl, targetDir);
  if (url) transport.init(url);
  else transport.reset();
  return url;
}

/** Internal implementation - finds the best server URL without side effects. */
async function _discoverServerImpl(pageUrl = null, targetDir = null) {
  const reg = await refreshRegistry();
  if (reg.size === 0) return null;

  const normalizedUrl = normalizeUrl(pageUrl);

  // Explicit capturesDir match
  if (targetDir) {
    for (const entry of reg.values()) {
      if (entry.capturesDir === targetDir) return entry.url;
    }
  }

  // file:// URLs - match against projectRoot (longest prefix wins)
  if (normalizedUrl?.startsWith('file://')) {
    const filePath = extractFilePath(normalizedUrl);
    let bestMatch = null;
    let bestLen = 0;
    for (const entry of reg.values()) {
      const normRoot = entry.projectRoot?.replace(/\\/g, '/');
      if (normRoot && filePath.startsWith(normRoot) && normRoot.length > bestLen) {
        bestMatch = entry.url;
        bestLen = normRoot.length;
      }
    }
    if (bestMatch) return bestMatch;
  }

  // localhost/remote URLs - match against urlPatterns
  if (normalizedUrl) {
    const urlPort = extractPort(normalizedUrl);
    for (const entry of reg.values()) {
      for (const pattern of entry.urlPatterns || []) {
        if (normalizedUrl.includes(pattern)) return entry.url;
        if (urlPort && pattern.includes(':') && pattern.endsWith(':' + urlPort)) return entry.url;
      }
    }
  }

  // Single server + file:// URL: auto-match
  if (reg.size === 1 && pageUrl?.startsWith('file://')) return [...reg.values()][0].url;

  // Single server + localhost URL: auto-match
  if (reg.size === 1) {
    try {
      const u = new URL(pageUrl);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0' || u.hostname === '[::1]') {
        return [...reg.values()][0].url;
      }
    } catch { /* invalid URL */ }
  }

  return null;
}
