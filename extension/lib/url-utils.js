/**
 * URL Utilities
 *
 * Pure functions for URL normalization, path extraction, and port parsing.
 * Used by discovery.js for server routing and by trust classification.
 *
 * @see lib/discovery.js - server routing uses these for URL matching
 * @see lib/constants.js - classifyTrust uses isLocalUrl
 */

/**
 * Normalize a URL for consistent matching.
 * - Replaces 127.0.0.1 and 0.0.0.0 with localhost
 * - Replaces [::1] (IPv6 loopback) with localhost
 * - Normalizes Windows file paths (backslash to forward slash)
 * @param {string|null} url
 * @returns {string|null}
 */
export function normalizeUrl(url) {
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
 * Handles platform variations:
 *   Linux/macOS:  file:///home/user/project/index.html
 *   Windows:      file:///C:/Users/user/project/index.html
 *   WSL via Chrome: file://wsl.localhost/Ubuntu/home/user/...
 *
 * @param {string} fileUrl - Normalized file:// URL
 * @returns {string} Filesystem path
 */
export function extractFilePath(fileUrl) {
  let path = decodeURIComponent(fileUrl.replace('file://', ''));
  path = path.replace(/^\/+(?=wsl)/i, '');

  // WSL: strip wsl.localhost/<DistroName> or wsl$/<DistroName> prefix
  const wslMatch = path.match(/^wsl[.$]localhost\/[^/]+(\/.*)/i)
    || path.match(/^wsl\$\/[^/]+(\/.*)/i);
  if (wslMatch) return wslMatch[1];

  // Windows (non-WSL): file:///C:/Users/... -> C:/Users/...
  if (/^\/[A-Za-z]:\//.test(path)) return path.slice(1);

  return path;
}

/**
 * Extract the port number from a URL string.
 * @param {string} url
 * @returns {string|null} Port string or null
 */
export function extractPort(url) {
  const m = url.match(/:(\d{2,5})(\/|$)/);
  return m ? m[1] : null;
}

/**
 * Check if a URL is a local development URL (always trusted).
 * Covers localhost, 127.0.0.1, 0.0.0.0, [::1], file://, wsl.localhost.
 * @param {string} url
 * @returns {boolean}
 */
export function isLocalUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    const h = u.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]' || h === 'wsl.localhost';
  } catch { return false; }
}
