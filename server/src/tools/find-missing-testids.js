/**
 * MCP Tool: find_missing_testids
 *
 * Identifies interactive elements that lack a data-testid attribute.
 * Suggests a testid based on tag + text content (kebab-case).
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes, filterInteractive, getNodeDetails } from '#src/analysis/node-queries.js';

/** Generate a suggested testid from tag and text content. */
function suggestTestId(tag, text) {
  const base = (text || tag).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base ? `${tag}-${base}` : tag;
}

/**
 * Register the find_missing_testids MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/analysis/node-queries.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'find_missing_testids',
    `Find interactive elements in a ${PROJECT_NAME} capture that lack data-testid attributes. ` +
    'Returns elements with suggested testid values for test coverage improvement.',
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

        const interactive = filterInteractive(flattenNodes(result.data));
        const missing = interactive.filter((n) => {
          const details = getNodeDetails(result.data, n.id);
          return !details?.attributes?.['data-testid'];
        }).map((n) => {
          const details = getNodeDetails(result.data, n.id);
          return {
            id: n.id, tag: n.tag, text: n.text,
            selector: details?.selector,
            suggestedTestId: suggestTestId(n.tag, n.text),
          };
        });
        return { content: [{ type: 'text', text: JSON.stringify(missing, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
