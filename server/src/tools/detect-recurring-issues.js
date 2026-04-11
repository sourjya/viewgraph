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
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { detectRecurringIssues } from '#src/analysis/recurring-issues.js';

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
      const captures = [];
      for (const entry of indexer.list()) {
        try {
          const filePath = validateCapturePath(entry.filename, capturesDir);
          const raw = JSON.parse(await readFile(filePath, 'utf-8'));
          if (raw.annotations?.length > 0) {
            captures.push({
              filename: entry.filename, url: raw.metadata?.url, timestamp: raw.metadata?.timestamp,
              annotations: raw.annotations,
            });
          }
        } catch { continue; }
      }

      if (captures.length === 0) {
        return { content: [{ type: 'text', text: 'No annotated captures found' }] };
      }

      const result = detectRecurringIssues(captures, { minOccurrences: min_occurrences });
      return { content: [{ type: 'text', text: JSON.stringify({
        capturesScanned: captures.length,
        hotspots: result.hotspots.length,
        details: result.hotspots,
      }, null, 2) }] };
    },
  );
}
