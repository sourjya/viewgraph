/**
 * MCP Tool: get_page_summary
 *
 * Returns a compact summary of a capture  -  URL, title, viewport, layout,
 * styles, element counts, and clusters. Always small enough for LLM context.
 */

import { z } from 'zod';
import { PROJECT_NAME, PROJECT_PREFIX } from '#src/constants.js';
import { readAndParse } from '#src/utils/tool-helpers.js';

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
    `Get a compact summary of a ${PROJECT_NAME} capture: URL, title, viewport, ` +
    'layout description, color/font styles, element counts by salience level, ' +
    'and spatial clusters. Always lightweight  -  use this for a quick overview ' +
    'before deciding whether to fetch the full capture with get_capture.',
    {
      filename: z.string()
        .describe(`Capture filename (e.g., "${PROJECT_PREFIX}-localhost-2026-04-08T060815.json")`),
    },
    async ({ filename }) => {
      const { ok, parsed, error } = await readAndParse(filename, capturesDir, 'summary');
      if (!ok) return error;
      return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
    },
  );
}
