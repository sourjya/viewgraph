/**
 * MCP Tool: get_latest_capture
 *
 * Returns the most recent capture, optionally filtered by URL.
 * If the capture is large (>100KB), returns a summary instead.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseSummary } from '#src/parsers/viewgraph-v2.js';
import { errorResponse, textResponse, NOTICE_CAPTURE } from '#src/utils/tool-helpers.js';

const MAX_INLINE_SIZE = 100 * 1024;

/**
 * Register the get_latest_capture MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 * @see #src/parsers/viewgraph-v2.js
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'get_latest_capture',
    `Get the most recent ${PROJECT_NAME} DOM capture. Returns full JSON if under 100KB, otherwise a compact summary.`,
    {
      url_filter: z.string().optional()
        .describe('Filter to captures whose URL contains this substring'),
    },
    async ({ url_filter: urlFilter }) => {
      const latest = indexer.getLatest(urlFilter);
      if (!latest) {
        return errorResponse('No captures found.' + (urlFilter ? ` Filter: "${urlFilter}"` : ''));
      }

      let filePath;
      try {
        filePath = validateCapturePath(latest.filename, capturesDir);
      } catch {
        return errorResponse(`Error: Invalid path for ${latest.filename}`);
      }

      try {
        const content = await readFile(filePath, 'utf-8');
        const size = Buffer.byteLength(content);

        if (size > MAX_INLINE_SIZE) {
          const summary = parseSummary(content);
          const text = summary.ok
            ? `Latest capture: ${latest.filename} (${(size / 1024).toFixed(1)} KB  -  too large for inline, showing summary)\n\n${JSON.stringify(summary.data, null, 2)}\n\nUse get_capture("${latest.filename}") for the full data.`
            : `Latest capture: ${latest.filename} (${(size / 1024).toFixed(1)} KB). Could not parse summary. Use get_capture for full data.`;
          return textResponse(text);
        }

        const notice = NOTICE_CAPTURE + '\n\n';
        return textResponse(notice + `Latest capture: ${latest.filename}\n\n${content}`);
      } catch (err) {
        return errorResponse(`Error reading capture: ${err.message}`);
      }
    },
  );
}
