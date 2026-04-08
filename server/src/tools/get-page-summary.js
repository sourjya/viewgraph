/**
 * MCP Tool: get_page_summary
 *
 * Returns a compact summary of a capture — URL, title, viewport, layout,
 * styles, element counts, and clusters. Always small enough for LLM context.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME, PROJECT_PREFIX } from '../constants.js';
import { validateCapturePath } from '../utils/validate-path.js';
import { parseSummary } from '../parsers/viewgraph-v2.js';

export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_page_summary',
    `Get a compact summary of a ${PROJECT_NAME} capture: URL, title, viewport, ` +
    'layout description, color/font styles, element counts by salience level, ' +
    'and spatial clusters. Always lightweight — use this for a quick overview ' +
    'before deciding whether to fetch the full capture with get_capture.',
    {
      filename: z.string()
        .describe(`Capture filename (e.g., "${PROJECT_PREFIX}-localhost-2026-04-08T060815.json")`),
    },
    async ({ filename }) => {
      let filePath;
      try {
        filePath = validateCapturePath(filename, capturesDir);
      } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename — ${filename}` }], isError: true };
      }

      try {
        const content = await readFile(filePath, 'utf-8');
        const result = parseSummary(content);
        if (!result.ok) {
          return { content: [{ type: 'text', text: `Error parsing capture: ${result.error}` }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') {
          return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}. Use list_captures to see available files.` }], isError: true };
        }
        return { content: [{ type: 'text', text: `Error reading capture: ${err.message}` }], isError: true };
      }
    },
  );
}
