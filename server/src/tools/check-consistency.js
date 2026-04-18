/**
 * MCP Tool: check_consistency
 *
 * Compares structurally similar elements across multiple page captures to
 * find style inconsistencies. Detects design system drift: "header has
 * padding:16px on /products but padding:24px on /settings."
 *
 * Takes 2+ capture filenames, matches elements by testid/role/class,
 * and compares their computed styles.
 *
 * @see src/analysis/consistency-checker.js
 * @see docs/architecture/strategic-recommendations.md - R4
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { checkConsistency } from '#src/analysis/consistency-checker.js';

/**
 * Register the check_consistency MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'check_consistency',
    `Compare elements across multiple ${PROJECT_NAME} page captures to find style inconsistencies. ` +
    'Detects design system drift: same component with different styles on different pages. ' +
    'Provide 2+ capture filenames from different pages.',
    {
      filenames: z.array(z.string()).min(2).max(10).describe('Capture filenames to compare (2-10)'),
    },
    async ({ filenames }) => {
      const captures = [];
      for (const filename of filenames) {
        let filePath;
        try { filePath = validateCapturePath(filename, capturesDir); } catch (err) {
          return errorResponse(`Error: ${err.message}`);
        }
        try {
          const raw = await readFile(filePath, 'utf-8');
          const result = parseCapture(raw);
          if (!result.ok) continue;
          captures.push({ url: result.data.metadata.url, title: result.data.metadata.title, parsed: result.data });
        } catch { continue; }
      }

      if (captures.length < 2) {
        return errorResponse('Error: Need at least 2 valid captures to compare');
      }

      const result = checkConsistency(captures);

      return jsonResponse({
        summary: result.inconsistencies.length === 0
          ? `No inconsistencies found across ${result.comparedPages} pages (${result.matchedElements} elements matched)`
          : `${result.inconsistencies.length} inconsistency(ies) across ${result.comparedPages} pages`,
        matchedElements: result.matchedElements,
        inconsistencies: result.inconsistencies.map((inc) => ({
          element: inc.element,
          matchType: inc.matchType,
          pages: [inc.pageA, inc.pageB],
          diffs: inc.diffs.map((d) => `${d.property}: ${d.valueA} vs ${d.valueB}`),
        })),
      });
    },
  );
}
