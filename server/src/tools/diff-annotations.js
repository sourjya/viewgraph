/**
 * MCP Tool: diff_annotations
 *
 * Compares annotations across multiple captures to track persistent issues,
 * new issues, and resolved issues over time. Shows which bugs keep coming back.
 *
 * @see src/analysis/annotation-diff.js
 * @see docs/roadmap/roadmap.md - M10.4
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { wrapComment } from '#src/utils/sanitize.js';
import { diffAnnotations } from '#src/analysis/annotation-diff.js';
import { jsonResponse, errorResponse, readAndParseMulti } from '#src/utils/tool-helpers.js';

/**
 * Register the diff_annotations MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'diff_annotations',
    `Compare annotations across multiple ${PROJECT_NAME} captures to track persistent issues. ` +
    'Shows which issues are new, which persist across deploys, and which were resolved.',
    {
      filenames: z.array(z.string()).min(2).max(20).describe('Capture filenames to compare (2-20, chronological order preferred)'),
    },
    async ({ filenames }) => {
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

      if (captures.length < 2) {
        return errorResponse('Need at least 2 captures with annotations to compare');
      }

      const result = diffAnnotations(captures);
      return jsonResponse({
        summary: `${result.persistent.length} persistent, ${result.newInLatest.length} new, ${result.resolvedSince.length} resolved`,
        ...result,
      });
    },
  );
}
