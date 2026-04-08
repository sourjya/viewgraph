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

const MAX_INLINE_SIZE = 100 * 1024;

export function register(server, indexer, capturesDir) {
  server.tool(
    'get_latest_capture',
    `Get the most recent ${PROJECT_NAME} DOM capture. Returns the full capture JSON ` +
    'if under 100KB, otherwise returns a compact summary. Use url_filter to ' +
    'narrow to a specific site (e.g., "localhost:8040").',
    {
      url_filter: z.string().optional()
        .describe('Filter to captures whose URL contains this substring'),
    },
    async ({ url_filter: urlFilter }) => {
      const latest = indexer.getLatest(urlFilter);
      if (!latest) {
        return { content: [{ type: 'text', text: 'No captures found.' + (urlFilter ? ` Filter: "${urlFilter}"` : '') }], isError: true };
      }

      let filePath;
      try {
        filePath = validateCapturePath(latest.filename, capturesDir);
      } catch {
        return { content: [{ type: 'text', text: `Error: Invalid path for ${latest.filename}` }], isError: true };
      }

      try {
        const content = await readFile(filePath, 'utf-8');
        const size = Buffer.byteLength(content);

        if (size > MAX_INLINE_SIZE) {
          const summary = parseSummary(content);
          const text = summary.ok
            ? `Latest capture: ${latest.filename} (${(size / 1024).toFixed(1)} KB  -  too large for inline, showing summary)\n\n${JSON.stringify(summary.data, null, 2)}\n\nUse get_capture("${latest.filename}") for the full data.`
            : `Latest capture: ${latest.filename} (${(size / 1024).toFixed(1)} KB). Could not parse summary. Use get_capture for full data.`;
          return { content: [{ type: 'text', text }] };
        }

        return { content: [{ type: 'text', text: `Latest capture: ${latest.filename}\n\n${content}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error reading capture: ${err.message}` }], isError: true };
      }
    },
  );
}
