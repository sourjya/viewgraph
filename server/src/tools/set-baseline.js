/**
 * MCP Tool: set_baseline
 *
 * Promotes a capture to the golden baseline for its URL.
 * Subsequent compare_baseline calls will diff against this snapshot.
 *
 * @see #src/baselines.js - baseline storage
 */

import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';
import { filenameParam } from '#src/utils/shared-params.js';
import { setBaseline } from '#src/baselines.js';

/**
 * Register the set_baseline MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/baselines.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'set_baseline',
    `Promote a ${PROJECT_NAME} capture to the golden baseline for its URL. ` +
    'Future compare_baseline calls will diff against this snapshot.',
    {
      filename: filenameParam,
    },
    async ({ filename }) => {
      try {
        const result = await setBaseline(capturesDir, filename);
        return jsonResponse(result);
      } catch (err) {
        if (err.code === 'ENOENT') return errorResponse('Capture file not found.');
        return errorResponse(`Error: ${err.message}`);
      }
    },
  );
}
