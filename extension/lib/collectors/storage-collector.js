/**
 * Client-Side Storage Collector
 *
 * Captures localStorage, sessionStorage key/value pairs and first-party cookies.
 * Helps agents diagnose "why is the UI showing X" by exposing app state that
 * drives rendering: auth tokens, feature flags, user prefs, A/B assignments.
 *
 * Privacy: values matching token/key/secret patterns are redacted to '[REDACTED]'.
 * Only captures first-party cookies (document.cookie).
 *
 * @see docs/ideas/extended-capture-enrichment.md - Tier 1
 */

/** Patterns that indicate sensitive values - redact these. */
const SENSITIVE_PATTERNS = /token|secret|key|password|auth|session|jwt|csrf|api.?key/i;

/** Max entries per storage type to prevent oversized captures. */
const MAX_ENTRIES = 50;

/** Max value length before truncation. */
const MAX_VALUE_LENGTH = 200;

/**
 * Redact sensitive values, truncate long ones.
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
function sanitizeValue(key, value) {
  if (SENSITIVE_PATTERNS.test(key)) return '[REDACTED]';
  if (value && value.length > MAX_VALUE_LENGTH) return value.slice(0, MAX_VALUE_LENGTH) + '...';
  return value;
}

/**
 * Read all entries from a Storage object (localStorage or sessionStorage).
 * @param {Storage} storage
 * @returns {Array<{ key: string, value: string }>}
 */
function readStorage(storage) {
  const entries = [];
  try {
    for (let i = 0; i < Math.min(storage.length, MAX_ENTRIES); i++) {
      const key = storage.key(i);
      if (key) entries.push({ key, value: sanitizeValue(key, storage.getItem(key)) });
    }
  } catch { /* storage access blocked */ }
  return entries;
}

/**
 * Parse document.cookie into key/value pairs (first-party only).
 * @returns {Array<{ key: string, value: string }>}
 */
function readCookies() {
  try {
    const raw = document.cookie;
    if (!raw) return [];
    return raw.split(';').slice(0, MAX_ENTRIES).map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return { key: key.trim(), value: sanitizeValue(key.trim(), rest.join('=')) };
    });
  } catch { return []; }
}

/**
 * Collect client-side storage state.
 * @returns {{ localStorage: Array, sessionStorage: Array, cookies: Array, summary: { local: number, session: number, cookies: number } }}
 */
export function collectStorage() {
  const local = readStorage(window.localStorage);
  const session = readStorage(window.sessionStorage);
  const cookies = readCookies();

  return {
    localStorage: local,
    sessionStorage: session,
    cookies,
    summary: { local: local.length, session: session.length, cookies: cookies.length },
  };
}
