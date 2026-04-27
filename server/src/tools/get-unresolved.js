/**
 * MCP Tool: get_unresolved
 *
 * Returns unresolved annotations from a single capture or across all indexed
 * captures. Uses the in-memory indexer for cross-capture scans.
 *
 * @see .kiro/specs/unified-review-panel/design.md - cross-capture queries
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, NOTICE_COMMENTS } from '#src/utils/tool-helpers.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { wrapComment } from '#src/utils/sanitize.js';

/**
 * Register the get_unresolved MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir - Absolute path to the captures directory
 * @see .kiro/specs/unified-review-panel/design.md - cross-capture queries
 */
export function register(server, indexer, capturesDir, options = {}) {
  server.tool(
    'get_unresolved',
    `Return unresolved annotations from ${PROJECT_NAME} captures. ` +
    'If filename is provided, returns unresolved from that capture only. ' +
    'If omitted, scans all indexed captures for unresolved annotations.',
    {
      filename: z.string().optional().describe('Capture filename (omit to scan all captures)'),
      limit: z.number().int().min(1).max(200).default(50).optional()
        .describe('Maximum annotations to return'),
    },
    async ({ filename, limit = 50 }) => {
      const files = filename ? [filename] : indexer.list().map((c) => c.filename);
      const results = [];
      const seen = new Set(); // BUG-028: dedup by UUID across captures to handle repeat sends

      for (const f of files) {
        let filePath;
        try { filePath = validateCapturePath(f, capturesDir); } catch { continue; }
        try {
          const raw = await readFile(filePath, 'utf-8');
          const parsed = parseCapture(raw);
          if (!parsed.ok) continue;
          const anns = (parsed.data.annotations || []).filter((a) => !a.resolved);
          for (const a of anns) {
            // Skip annotations already seen from a newer capture (files are newest-first)
            if (a.uuid && seen.has(a.uuid)) continue;
            if (a.uuid) seen.add(a.uuid);
            results.push({ filename: f, ...a, comment: wrapComment(a.comment) });
            if (results.length >= limit) break;
          }
        } catch { continue; }
        if (results.length >= limit) break;
      }

      const summary = `${results.length} unresolved annotation(s)` +
        (filename ? ` in ${filename}` : ` across ${files.length} capture(s)`);

      // Emit status change: agent has acknowledged these annotations
      if (options.onStatusChange && results.length > 0) {
        for (const a of results) {
          options.onStatusChange({ uuid: a.uuid, status: 'queued' });
        }
      }

      return jsonResponse({
        _notice: NOTICE_COMMENTS,
        summary, annotations: results,
      });
    },
  );
}
