/**
 * MCP Tool: get_elements_by_role
 *
 * Filters capture nodes by semantic role (button, link, input, heading, etc.).
 * Useful for targeted queries like "show me all buttons on this page".
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { withCapture, jsonResponse } from '#src/utils/tool-helpers.js';
import { flattenNodes, filterByRole, getNodeDetails, isInViewport } from '#src/analysis/node-queries.js';
import { wrapCapturedText } from '#src/utils/sanitize.js';

/**
 * Register the get_elements_by_role MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/analysis/node-queries.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_elements_by_role',
    `Filter ${PROJECT_NAME} capture nodes by role: buttons, links, inputs, headings, images, tables, nav, forms. ` +
    'Returns matching elements with id, tag, text, bbox, selector, and attributes.',
    {
      filename: z.string().describe('Capture filename'),
      role: z.enum(['button', 'link', 'input', 'heading', 'image', 'table', 'nav', 'form'])
        .describe('Element role to filter by'),
    },
    async ({ filename, role }) => {
      return withCapture(filename, capturesDir, (parsed) => {
        const nodes = filterByRole(flattenNodes(parsed), role);
        const viewport = parsed.metadata?.viewport;
        const elements = nodes.map((n) => {
          const details = getNodeDetails(parsed, n.id);
          return {
            id: n.id, tag: n.tag, text: wrapCapturedText(n.text), bbox: n.bbox,
            inViewport: isInViewport(n.bbox, viewport),
            selector: details?.selector, attributes: details?.attributes,
          };
        });
        return jsonResponse(elements);
      });
    },
  );
}
