/**
 * MCP Tool: list_archived
 *
 * Lists archived captures from the archive/index.json with optional
 * date range and URL filters. Returns lightweight metadata without
 * reading individual capture files.
 *
 * @see server/src/archive.js - archive module
 * @see docs/ideas/rolling-archive.md - design rationale
 */

import { z } from 'zod';
import path from 'node:path';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse } from '#src/utils/tool-helpers.js';
import { readArchiveIndex } from '#src/archive.js';

/**
 * Register the list_archived MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {string} capturesDir - Absolute path to the captures directory
 */
export function register(server, capturesDir) {
  server.tool(
    'list_archived',
    `List archived ${PROJECT_NAME} captures. Archived captures have all annotations resolved and are older than the age threshold. ` +
    'Returns metadata from the archive index without reading individual files. Use get_capture with the original filename to retrieve full content.',
    {
      url_filter: z.string().optional().describe('Filter captures whose URL contains this substring'),
      from: z.string().optional().describe('Start date (ISO or YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (ISO or YYYY-MM-DD)'),
      limit: z.number().int().min(1).max(200).default(50).optional().describe('Maximum results'),
    },
    async ({ url_filter, from, to, limit = 50 }) => {
      const archiveDir = path.join(path.dirname(capturesDir), 'archive');
      const index = readArchiveIndex(archiveDir);
      let results = index.captures || [];

      if (url_filter) {
        results = results.filter((c) => (c.url || '').includes(url_filter));
      }
      if (from) {
        const fromDate = new Date(from);
        results = results.filter((c) => new Date(c.timestamp) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        results = results.filter((c) => new Date(c.timestamp) <= toDate);
      }

      results = results.slice(0, limit);

      return jsonResponse({
        summary: `${results.length} archived capture(s)` + (index.captures.length > results.length ? ` (${index.captures.length} total)` : ''),
        captures: results.map((c) => ({
          filename: c.originalPath,
          url: c.url,
          title: c.title,
          timestamp: c.timestamp,
          nodeCount: c.nodeCount,
          annotations: c.annotations,
          archivedAt: c.archivedAt,
        })),
      });
    },
  );
}
