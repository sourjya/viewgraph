/**
 * MCP Tool: get_capture_stats
 *
 * Returns aggregate statistics across all captures: total count, date range,
 * unique URLs, annotation counts, average element counts. Gives the agent
 * a quick overview of the capture landscape.
 *
 * @see docs/roadmap/roadmap.md
 */

import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, textResponse } from '#src/utils/tool-helpers.js';
import { validateCapturePath } from '#src/utils/validate-path.js';

/**
 * Register the get_capture_stats MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'get_capture_stats',
    `Aggregate statistics across all ${PROJECT_NAME} captures: count, date range, URLs, annotations.`,
    {},
    async () => {
      const entries = indexer.list();
      if (entries.length === 0) {
        return textResponse('No captures found');
      }

      const urls = new Set();
      let totalAnnotations = 0;
      let openAnnotations = 0;
      let totalElements = 0;
      let oldest = null;
      let newest = null;

      for (const entry of entries) {
        try {
          const filePath = validateCapturePath(entry.filename, capturesDir);
          const raw = JSON.parse(await readFile(filePath, 'utf-8'));
          if (raw.metadata?.url) urls.add(raw.metadata.url);
          if (raw.metadata?.timestamp) {
            const ts = raw.metadata.timestamp;
            if (!oldest || ts < oldest) oldest = ts;
            if (!newest || ts > newest) newest = ts;
          }
          if (raw.annotations) {
            totalAnnotations += raw.annotations.length;
            openAnnotations += raw.annotations.filter((a) => !a.resolved).length;
          }
          totalElements += raw.metadata?.stats?.totalNodes ?? 0;
        } catch { continue; }
      }

      return jsonResponse({
        totalCaptures: entries.length,
        uniqueUrls: urls.size,
        dateRange: { oldest, newest },
        annotations: { total: totalAnnotations, open: openAnnotations },
        averageElements: entries.length > 0 ? Math.round(totalElements / entries.length) : 0,
        urls: [...urls].slice(0, 20),
      });
    },
  );
}
