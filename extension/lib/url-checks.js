/**
 * URL injection checks
 *
 * Determines whether a page URL supports content script injection.
 * Chrome restricts injection on system pages, extension pages, the Web Store,
 * and special protocol URLs. Used by the background script to decide whether
 * to open the sidebar directly or show a fallback error popup.
 *
 * @see .kiro/specs/unified-review-panel/design.md - Non-injectable pages table
 */

/** URL prefixes where content scripts cannot be injected. */
const BLOCKED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'about:',
  'view-source:',
  'devtools://',
  'data:',
];

/** URL substrings for specific blocked sites. */
const BLOCKED_SITES = [
  'chrome.google.com/webstore',
  'chromewebstore.google.com',
];

/**
 * Check if a URL supports content script injection.
 * @param {string} url - page URL to check
 * @returns {boolean} true if injectable
 */
export function isInjectable(url) {
  if (!url) return false;
  for (const prefix of BLOCKED_PREFIXES) {
    if (url.startsWith(prefix)) return false;
  }
  for (const site of BLOCKED_SITES) {
    if (url.includes(site)) return false;
  }
  return true;
}

/**
 * Get a user-friendly reason why a URL can't be inspected.
 * @param {string} url - blocked page URL
 * @returns {string} human-readable error message
 */
export function getBlockedReason(url) {
  if (!url) return 'Navigate to a web page to start reviewing.';
  if (url.startsWith('chrome://')) return "Chrome system pages can't be inspected. Navigate to a web page.";
  if (url.startsWith('chrome-extension://')) return "Extension pages can't be inspected. Navigate to a web page.";
  if (url.startsWith('about:')) return "Browser internal pages can't be inspected. Navigate to a web page.";
  if (url.startsWith('view-source:')) return "Source view pages can't be inspected. Navigate to a web page.";
  if (url.startsWith('devtools://')) return "DevTools pages can't be inspected. Navigate to a web page.";
  if (url.startsWith('data:')) return "Data URLs can't be inspected. Navigate to a web page.";
  if (url.includes('chrome.google.com/webstore') || url.includes('chromewebstore.google.com')) {
    return "The Chrome Web Store can't be inspected. Navigate to a web page.";
  }
  return 'Navigate to a web page to start reviewing.';
}
