/**
 * MCP Tool: find_missing_testids
 *
 * Identifies interactive elements that lack a data-testid attribute.
 * Suggests a testid based on tag + text content (kebab-case).
 */

import { PROJECT_NAME } from '#src/constants.js';
import { withCapture, jsonResponse } from '#src/utils/tool-helpers.js';
import { filenameParam } from '#src/utils/shared-params.js';
import { flattenNodes, filterInteractive, getNodeDetails } from '#src/analysis/node-queries.js';
import { wrapCapturedText } from '#src/utils/sanitize.js';

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
      filename: filenameParam,
    },
    async ({ filename }) => {
      return withCapture(filename, capturesDir, (parsed) => {
        const interactive = filterInteractive(flattenNodes(parsed));
        const missing = interactive.filter((n) => {
          const details = getNodeDetails(parsed, n.id);
          return !details?.attributes?.['data-testid'];
        }).map((n) => {
          const details = getNodeDetails(parsed, n.id);
          return {
            id: n.id, tag: n.tag, text: wrapCapturedText(n.text),
            selector: details?.selector,
            suggestedTestId: suggestTestId(n.tag, n.text),
          };
        });
        return jsonResponse(missing);
      });
    },
  );
}
