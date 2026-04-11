/**
 * MCP Tool: list_baselines
 *
 * Lists all stored baselines with metadata. Supports URL filtering.
 *
 * @see #src/baselines.js - baseline storage
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { listBaselines } from '#src/baselines.js';

/**
 * Register the list_baselines MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/baselines.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'list_baselines',
    `List all stored ${PROJECT_NAME} baselines. Each baseline is a golden capture for a URL.`,
    {
      url_filter: z.string().optional().describe('Filter baselines whose URL contains this substring'),
    },
    async ({ url_filter }) => {
      const baselines = await listBaselines(capturesDir, url_filter);
      return { content: [{ type: 'text', text: JSON.stringify(baselines, null, 2) }] };
    },
  );
}
