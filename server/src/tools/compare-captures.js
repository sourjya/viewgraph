/**
 * MCP Tool: compare_captures
 *
 * Diffs two captures to detect added/removed elements, layout shifts,
 * and testid changes. Core tool for visual regression workflows.
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, errorResponse, readAndParsePair } from '#src/utils/tool-helpers.js';
import { diffCaptures } from '#src/analysis/capture-diff.js';

/**
 * Register the compare_captures MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/analysis/capture-diff.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'compare_captures',
    `Diff two ${PROJECT_NAME} captures to detect changes: added/removed elements, ` +
    'layout shifts, and testid changes. Use for visual regression.',
    {
      file_a: z.string().describe('First capture filename (before)'),
      file_b: z.string().describe('Second capture filename (after)'),
    },
    async ({ file_a, file_b }) => {
      const { ok, a, b, error } = await readAndParsePair(file_a, file_b, capturesDir);
      if (!ok) return error;
      try {
        const diff = diffCaptures(a, b);
        const summary = {
          added: diff.added.map((n) => ({ id: n.id, tag: n.tag, text: n.text })),
          removed: diff.removed.map((n) => ({ id: n.id, tag: n.tag, text: n.text })),
          moved: diff.moved,
          testidChanges: diff.testidChanges,
        };
        return jsonResponse(summary);
      } catch (err) {
        if (err.code === 'ENOENT') return errorResponse('Error: Capture not found. Use list_captures to see available files.');
        return errorResponse(`Error: ${err.message}`);
      }
    },
  );
}
