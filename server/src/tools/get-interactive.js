/**
 * MCP Tool: get_interactive_elements
 *
 * Returns all clickable/editable elements with their selectors, actions,
 * data-testid, and aria-label. Primary input for test generation workflows.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes, filterInteractive, getNodeDetails, isInViewport } from '#src/analysis/node-queries.js';

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
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${filename}` }], isError: true };
      }
      try {
        const content = await readFile(filePath, 'utf-8');
        const result = parseCapture(content);
        if (!result.ok) return { content: [{ type: 'text', text: `Error: ${result.error}` }], isError: true };

        const nodes = filterInteractive(flattenNodes(result.data));
        const viewport = result.data.metadata?.viewport;
        const elements = nodes.map((n) => {
          const details = getNodeDetails(result.data, n.id);
          return {
            id: n.id, tag: n.tag, text: n.text, actions: n.actions,
            inViewport: isInViewport(n.bbox, viewport),
            selector: details?.selector,
            'data-testid': details?.attributes?.['data-testid'] ?? null,
            'aria-label': details?.attributes?.['aria-label'] ?? null,
          };
        });
        return { content: [{ type: 'text', text: JSON.stringify(elements, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
