/**
 * Network Collector
 *
 * Reads completed network requests from the Performance API at capture time.
 * Returns a structured summary for inclusion in ViewGraph captures.
 *
 * Runs in content script context. Uses performance.getEntriesByType('resource')
 * which is available in all modern browsers without special permissions.
 *
 * @see .kiro/specs/network-console-capture/design.md
 */

const MAX_ENTRIES = 100;
const MAX_URL_LENGTH = 200;

/**
 * Collect network request state from the Performance API.
 * @returns {{ requests: Array, summary: object }}
 */
export function collectNetworkState() {
  if (!globalThis.performance?.getEntriesByType) {
    return { requests: [], summary: { total: 0, failed: 0, byType: {} } };
  }

  const entries = performance.getEntriesByType('resource');
  const byType = {};
  let failed = 0;

  const mapped = entries.map((e) => {
    const type = e.initiatorType || 'other';
    byType[type] = (byType[type] || 0) + 1;
    // A request failed if nothing was transferred AND nothing was decoded.
    // transferSize: 0 alone is not failure - cached or dev-server resources
    // report 0 transfer but still have decodedBodySize > 0.
    const isFailed = e.transferSize === 0 && e.decodedBodySize === 0 && e.duration > 0;
    if (isFailed) failed++;
    return {
      url: e.name.length > MAX_URL_LENGTH ? e.name.slice(0, MAX_URL_LENGTH) : e.name,
      initiatorType: type,
      duration: Math.round(e.duration),
      transferSize: e.transferSize,
      startTime: Math.round(e.startTime),
      failed: isFailed,
    };
  });

  // Sort by startTime descending (most recent first), cap at MAX_ENTRIES
  mapped.sort((a, b) => b.startTime - a.startTime);
  const requests = mapped.slice(0, MAX_ENTRIES);

  return { requests, summary: { total: entries.length, failed, byType } };
}
