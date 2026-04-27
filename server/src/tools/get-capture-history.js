/**
 * MCP Tool: get_capture_history
 *
 * Groups captures by URL and returns a timeline per page. Shows how many
 * captures exist for each URL, with timestamps and node count changes.
 * Useful for tracking page evolution over time.
 *
 * M9.1: Capture history timeline.
 *
 * @see server/src/tools/list-captures.js - flat list (this tool groups by URL)
 */

export function register(server, indexer) {
  server.tool(
    'get_capture_history',
    'Group captures by URL into timelines. Shows capture count, date range, and element count changes per page.',
    { url_filter: { type: 'string', description: 'Filter to URLs containing this substring' } },
    async ({ url_filter }) => {
      const all = indexer.list({ limit: 200, urlFilter: url_filter });
      if (!all.length) {
        return { content: [{ type: 'text', text: 'No captures found.' }] };
      }

      // Group by normalized URL (strip query params and hash)
      const groups = new Map();
      for (const cap of all) {
        let key;
        try { const u = new URL(cap.url); key = `${u.origin}${u.pathname}`; } catch { key = cap.url; }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(cap);
      }

      // Sort each group by timestamp (oldest first) and build timeline
      const history = [];
      for (const [url, caps] of groups) {
        caps.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const timeline = caps.map((c, i) => {
          const entry = {
            filename: c.filename,
            timestamp: c.timestamp,
            nodeCount: c.node_count,
          };
          if (i > 0) {
            const prev = caps[i - 1];
            entry.nodeCountDelta = c.node_count - prev.node_count;
          }
          return entry;
        });
        history.push({
          url,
          captureCount: caps.length,
          firstCapture: caps[0].timestamp,
          lastCapture: caps[caps.length - 1].timestamp,
          timeline,
        });
      }

      // Sort groups by most recent capture
      history.sort((a, b) => new Date(b.lastCapture) - new Date(a.lastCapture));

      return { content: [{ type: 'text', text: JSON.stringify(history, null, 2) }] };
    },
  );
}
