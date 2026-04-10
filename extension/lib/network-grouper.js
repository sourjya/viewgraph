/**
 * Network Request Grouper
 *
 * Groups raw network requests into categories for the Inspect tab.
 * Extracts smart path display (filename + parent) from URLs.
 *
 * @see lib/annotation-sidebar.js - consumes groups for rendering
 */

// ---------------------------------------------------------------------------
// Category rules - order matters, first match wins
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { name: 'Failed', test: (r) => r.failed },
  { name: 'API', test: (r) => /\/(api|graphql)(\/|\?|$)/i.test(pathOf(r.url)) },
  { name: 'App Sources', test: (r) => pathOf(r.url).startsWith('/src/') },
  { name: 'Dependencies', test: (r) => pathOf(r.url).includes('/node_modules/') },
  { name: 'Static', test: (r) => /\/(favicon|assets|static|public)\b/i.test(pathOf(r.url)) || /\.(svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot)(\?|$)/i.test(pathOf(r.url).split('/').pop()) },
];

/** Strip origin from URL, return path only. */
function pathOf(url) {
  if (!url) return '';
  try { return new URL(url, 'http://localhost').pathname; } catch { return url; }
}

/**
 * Group network requests into categories.
 * Failed requests always sort first. Empty groups are omitted.
 * @param {Array<{method: string, url: string, failed?: boolean, transferSize?: number}>} requests
 * @returns {Array<{name: string, requests: Array, totalSize: number}>}
 */
export function groupRequests(requests) {
  if (!requests || requests.length === 0) return [];

  const buckets = new Map();
  for (const req of requests) {
    const cat = CATEGORIES.find((c) => c.test(req));
    const name = cat ? cat.name : 'Other';
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name).push(req);
  }

  // Build result: Failed first, then in CATEGORIES order, then Other
  const result = [];
  const order = [...CATEGORIES.map((c) => c.name), 'Other'];
  for (const name of order) {
    const reqs = buckets.get(name);
    if (!reqs || reqs.length === 0) continue;
    result.push({
      name,
      requests: reqs,
      totalSize: reqs.reduce((sum, r) => sum + (r.transferSize || 0), 0),
    });
  }
  return result;
}

/**
 * Extract a smart display path from a URL.
 * Returns filename (last segment) and parent (penultimate path segments).
 * @param {string} url - Full or relative URL
 * @returns {{ filename: string, parent: string, full: string }}
 */
export function smartPath(url) {
  if (!url) return { filename: '', parent: '', full: '' };
  const path = pathOf(url);
  // Strip query params
  const clean = path.split('?')[0];
  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 0) return { filename: '', parent: '', full: clean };
  const filename = segments[segments.length - 1];
  // Parent: skip /src/ and /node_modules/ prefixes for brevity
  let parentSegs = segments.slice(0, -1);
  if (parentSegs[0] === 'src') parentSegs = parentSegs.slice(1);
  if (parentSegs[0] === 'node_modules') parentSegs = parentSegs.slice(1);
  return { filename, parent: parentSegs.join('/'), full: clean };
}
