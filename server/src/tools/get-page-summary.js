/**
 * MCP Tool: get_page_summary
 *
 * Returns a compact summary of a capture  -  URL, title, viewport, layout,
 * styles, element counts, and clusters. Always small enough for LLM context.
 */

import { z } from 'zod';
import { PROJECT_NAME, PROJECT_PREFIX } from '#src/constants.js';
import { withCapture, jsonResponse, NOTICE_PAGE_DATA } from '#src/utils/tool-helpers.js';

/**
 * Register the get_page_summary MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/parsers/viewgraph-v2.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_page_summary',
    `Get a compact summary of a ${PROJECT_NAME} capture: URL, title, viewport, layout, styles, element counts, clusters. ~500 tokens vs ~50K for full capture.`,
    {
      filename: z.string()
        .describe(`Capture filename (e.g., "${PROJECT_PREFIX}-localhost-2026-04-08T060815.json")`),
    },
    async ({ filename }) => {
      return withCapture(filename, capturesDir, (parsed) => {
        const result = { _notice: NOTICE_PAGE_DATA, ...parsed };
        return jsonResponse(result);
      }, { level: 'summary' });
    },
  );
}
