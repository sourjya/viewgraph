/**
 * MCP Tool: get_interactive_elements
 *
 * Returns all clickable/editable elements with their selectors, actions,
 * data-testid, and aria-label. Primary input for test generation workflows.
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { readAndParse, jsonResponse } from '#src/utils/tool-helpers.js';
import { flattenNodes, filterInteractive, getNodeDetails, isInViewport } from '#src/analysis/node-queries.js';
import { wrapCapturedText } from '#src/utils/sanitize.js';

/**
 * Register the get_interactive_elements MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/analysis/node-queries.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_interactive_elements',
    `Return all clickable/editable elements in a ${PROJECT_NAME} capture with selectors and labels. ` +
    'Includes data-testid and aria-label when present. Sorted by salience (high first).',
    {
      filename: z.string().describe('Capture filename'),
    },
    async ({ filename }) => {
      const { ok, parsed, error } = await readAndParse(filename, capturesDir);
      if (!ok) return error;

      const nodes = filterInteractive(flattenNodes(parsed));
      const viewport = parsed.metadata?.viewport;
      const elements = nodes.map((n) => {
        const details = getNodeDetails(parsed, n.id);
        return {
          id: n.id, tag: n.tag, text: wrapCapturedText(n.text), actions: n.actions,
          inViewport: isInViewport(n.bbox, viewport),
          selector: details?.selector,
          'data-testid': details?.attributes?.['data-testid'] ?? null,
          'aria-label': details?.attributes?.['aria-label'] ?? null,
        };
      });
      return jsonResponse(elements);
    },
  );
}
