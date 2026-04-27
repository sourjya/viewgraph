/**
 * Shared Constants - Extension
 *
 * Single source of truth for values shared between the extension and
 * the MCP server. Keep in sync with server/src/constants.js.
 *
 * After decomposition, this module contains:
 * - Port/host constants
 * - Transport accessor
 * - Config helpers (fetchConfig, updateConfig)
 * - Trust classification (classifyTrust)
 *
 * Server discovery moved to lib/discovery.js.
 * URL utilities moved to lib/url-utils.js.
 *
 * @see lib/discovery.js - discoverServer, getAllServers, resetServerCache, getAgentName
 * @see lib/url-utils.js - normalizeUrl, extractFilePath, extractPort, isLocalUrl
 */

import * as transport from './transport-client.js';
import { isLocalUrl } from './url-utils.js';

// Re-export discovery functions for backward compatibility.
// Consumers should migrate to importing from discovery.js directly.
export { discoverServer, getAllServers, resetServerCache, getAgentName } from './discovery.js';

/**
 * Get the transport module for server communication.
 * @returns {typeof transport}
 */
export function getTransport() { return transport; }

/** Default HTTP receiver port for MCP server communication. */
export const DEFAULT_HTTP_PORT = 9876;

/** Max ports to scan when discovering servers. */
export const PORT_SCAN_RANGE = 4;

/** Localhost bind address for all server connections. */
export const SERVER_HOST = '127.0.0.1';

/** Base URL for the MCP server HTTP receiver. */
export const SERVER_BASE_URL = `http://${SERVER_HOST}:${DEFAULT_HTTP_PORT}`;

// ──────────────────────────────────────────────
// Project Config Helpers
// ──────────────────────────────────────────────

/** Cache key for config in chrome.storage.local. */
const CONFIG_CACHE_KEY = 'vg_project_config';

/**
 * Fetch project config from the server via transport, with local cache fallback.
 * @returns {Promise<Object>} Config object (empty {} if unavailable)
 */
export async function fetchConfig() {
  try {
    const config = await transport.getConfig();
    if (config) {
      try { await chrome.storage.local.set({ [CONFIG_CACHE_KEY]: config }); } catch { /* tests */ }
      return config;
    }
    const data = await chrome.storage.local.get(CONFIG_CACHE_KEY);
    return data[CONFIG_CACHE_KEY] || {};
  } catch {
    try {
      const data = await chrome.storage.local.get(CONFIG_CACHE_KEY);
      return data[CONFIG_CACHE_KEY] || {};
    } catch { return {}; }
  }
}

/**
 * Update project config on the server and refresh local cache.
 * @param {Object} updates - Key-value pairs to merge into config
 * @returns {Promise<Object>} Updated config object
 */
export async function updateConfig(updates) {
  const config = await transport.updateConfig(updates);
  if (config) {
    try { await chrome.storage.local.set({ [CONFIG_CACHE_KEY]: config }); } catch { /* tests */ }
  }
  return config;
}

// ──────────────────────────────────────────────
// F17: URL Trust Classification
// ──────────────────────────────────────────────

/**
 * Classify a URL's trust level for send-to-agent gating.
 * @param {string} pageUrl - The current page URL
 * @param {string[]} [trustedPatterns] - From config.json trustedPatterns
 * @returns {{ level: 'trusted'|'configured'|'untrusted', reason: string }}
 */
export function classifyTrust(pageUrl, trustedPatterns = []) {
  if (!pageUrl) return { level: 'untrusted', reason: 'Empty URL' };
  if (isLocalUrl(pageUrl)) return { level: 'trusted', reason: 'Localhost' };
  // S5-6: Match hostname+port only, not full URL (prevents query param bypass)
  try {
    const parsed = new URL(pageUrl);
    const hostPort = `${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
    for (const pattern of trustedPatterns) {
      if (hostPort.includes(pattern)) return { level: 'configured', reason: pattern };
    }
  } catch { /* invalid URL */ }
  return { level: 'untrusted', reason: 'Remote URL' };
}
