/**
 * MCP Tool: list_captures
 *
 * Returns metadata for available captures, sorted newest-first.
 * This is the entry point for Kiro to discover what captures exist.
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';

/**
 * Register the list_captures MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 */
export function register(server, indexer) {
  server.tool(
    'list_captures',
    `List available ${PROJECT_NAME} DOM captures sorted by most recent first. ` +
    'Returns filename, URL, title, timestamp, node count. Supports URL substring filter. ' +
    'WHEN TO USE: To discover what captures exist. Call get_session_status first for a quick count. ' +
    'NEXT: Use get_page_summary for overview, or get_capture for full details.',
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
