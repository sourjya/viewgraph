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
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { diffAnnotations } from '#src/analysis/annotation-diff.js';

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
      const captures = [];
      for (const filename of filenames) {
        try {
          const filePath = validateCapturePath(filename, capturesDir);
          const raw = JSON.parse(await readFile(filePath, 'utf-8'));
          if (raw.annotations?.length > 0) {
            captures.push({
              filename, url: raw.metadata?.url, timestamp: raw.metadata?.timestamp,
              annotations: raw.annotations,
            });
          }
        } catch { continue; }
      }

      if (captures.length < 2) {
        return { content: [{ type: 'text', text: 'Need at least 2 captures with annotations to compare' }], isError: true };
      }

      const result = diffAnnotations(captures);
      return { content: [{ type: 'text', text: JSON.stringify({
        summary: `${result.persistent.length} persistent, ${result.newInLatest.length} new, ${result.resolvedSince.length} resolved`,
        ...result,
      }, null, 2) }] };
    },
  );
}
