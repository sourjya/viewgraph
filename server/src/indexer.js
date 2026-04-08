/**
 * In-Memory Capture Indexer
 *
 * Maintains a Map of filename → metadata for all captures in the watched
 * directory. Supports listing with filters, getting the latest capture,
 * and automatic eviction when the index exceeds maxCaptures.
 *
 * Used by the watcher (on file events) and by MCP tool handlers (for queries).
 */

/**
 * Create an indexer instance.
 * @param {{ maxCaptures?: number }} options
 */
export function createIndexer({ maxCaptures = 50 } = {}) {
  /** @type {Map<string, object>} */
  const index = new Map();

  function add(filename, metadata) {
    index.set(filename, { ...metadata, filename });
    evict();
  }

  function remove(filename) {
    index.delete(filename);
  }

  function get(filename) {
    return index.get(filename);
  }

  /**
   * List captures, sorted by timestamp descending.
   * @param {{ limit?: number, urlFilter?: string }} options
   */
  function list({ limit = 20, urlFilter } = {}) {
    let entries = Array.from(index.values());

    if (urlFilter) {
      entries = entries.filter((e) => e.url?.includes(urlFilter));
    }

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return entries.slice(0, Math.min(limit, 100));
  }

  /**
   * Get the most recent capture, optionally filtered by URL substring.
   */
  function getLatest(urlFilter) {
    const matches = list({ limit: 1, urlFilter });
    return matches[0];
  }

  /** Evict oldest entries when index exceeds maxCaptures. */
  function evict() {
    if (index.size <= maxCaptures) return;
    const sorted = Array.from(index.entries())
      .sort(([, a], [, b]) => new Date(a.timestamp) - new Date(b.timestamp));
    while (index.size > maxCaptures) {
      const [oldest] = sorted.shift();
      index.delete(oldest);
    }
  }

  return { add, remove, get, list, getLatest };
}
