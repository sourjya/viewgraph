/**
 * MCP Tool: detect_recurring_issues
 *
 * Scans all annotated captures to find UI elements that are flagged
 * repeatedly. Identifies "hot spots" that keep generating issues.
 *
 * @see src/analysis/recurring-issues.js
 * @see docs/roadmap/roadmap.md - M10.5
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { wrapComment } from '#src/utils/sanitize.js';
import { detectRecurringIssues } from '#src/analysis/recurring-issues.js';
import { jsonResponse, textResponse, readAndParseMulti } from '#src/utils/tool-helpers.js';

/**
 * Register the detect_recurring_issues MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'detect_recurring_issues',
    `Scan all annotated ${PROJECT_NAME} captures to find UI elements flagged repeatedly. ` +
    'Identifies hot spots that keep generating issues across sessions.',
    {
      min_occurrences: z.number().min(2).max(50).optional().describe('Minimum times an element must be flagged (default 2)'),
    },
    async ({ min_occurrences }) => {
      const filenames = indexer.list().map((e) => e.filename);
      const results = await readAndParseMulti(filenames, capturesDir);
      const captures = [];
      for (const { filename, parsed } of results) {
        if (parsed.annotations?.length > 0) {
          captures.push({
            filename, url: parsed.metadata?.url, timestamp: parsed.metadata?.timestamp,
            annotations: parsed.annotations.map((a) => ({ ...a, comment: wrapComment(a.comment) })),
          });
        }
      }

      if (captures.length === 0) {
        return textResponse('No annotated captures found');
      }

      const result = detectRecurringIssues(captures, { minOccurrences: min_occurrences });
      return jsonResponse({
        capturesScanned: captures.length,
        hotspots: result.hotspots.length,
        details: result.hotspots,
      });
    },
  );
}
