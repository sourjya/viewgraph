/**
 * MCP Tool: get_elements_by_role
 *
 * Filters capture nodes by semantic role (button, link, input, heading, etc.).
 * Useful for targeted queries like "show me all buttons on this page".
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes, filterByRole, getNodeDetails, isInViewport } from '#src/analysis/node-queries.js';

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
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${filename}` }], isError: true };
      }
      try {
        const content = await readFile(filePath, 'utf-8');
        const result = parseCapture(content);
        if (!result.ok) return { content: [{ type: 'text', text: `Error: ${result.error}` }], isError: true };

        const nodes = filterByRole(flattenNodes(result.data), role);
        const viewport = result.data.metadata?.viewport;
        const elements = nodes.map((n) => {
          const details = getNodeDetails(result.data, n.id);
          return {
            id: n.id, tag: n.tag, text: n.text, bbox: n.bbox,
            inViewport: isInViewport(n.bbox, viewport),
            selector: details?.selector, attributes: details?.attributes,
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
