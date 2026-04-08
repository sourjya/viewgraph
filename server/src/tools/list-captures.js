/**
 * MCP Tool: list_captures
 *
 * Returns metadata for available captures, sorted newest-first.
 * This is the entry point for Kiro to discover what captures exist.
 */

import { z } from 'zod';

export function register(server, indexer) {
  server.tool(
    'list_captures',
    'List available ViewGraph DOM captures sorted by most recent first. ' +
    'Returns filename, URL, title, timestamp, and node count for each capture. ' +
    'Use this to browse captures before fetching a specific one with get_capture. ' +
    'Supports filtering by URL substring (e.g., "localhost:8040" or "projects").',
    {
      limit: z.number().min(1).max(100).default(20)
        .describe('Maximum number of captures to return (default 20, max 100)'),
      url_filter: z.string().optional()
        .describe('Filter captures whose URL contains this substring'),
    },
    async ({ limit, url_filter: urlFilter }) => {
      const captures = indexer.list({ limit, urlFilter });
      if (captures.length === 0) {
        return { content: [{ type: 'text', text: 'No captures found.' + (urlFilter ? ` Filter: "${urlFilter}"` : '') }] };
      }
      const summary = captures.map((c) => ({
        filename: c.filename,
        url: c.url,
        title: c.title,
        timestamp: c.timestamp,
        node_count: c.nodeCount,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    },
  );
}
