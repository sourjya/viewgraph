/**
 * MCP Tool: set_baseline
 *
 * Promotes a capture to the golden baseline for its URL.
 * Subsequent compare_baseline calls will diff against this snapshot.
 *
 * @see #src/baselines.js - baseline storage
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
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
      filename: z.string().describe('Capture filename to promote as baseline'),
    },
    async ({ filename }) => {
      try {
        const result = await setBaseline(capturesDir, filename);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: 'Capture file not found.' }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
