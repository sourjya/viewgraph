/**
 * MCP Tool: get_annotations
 *
 * Returns the ANNOTATIONS section from review-mode captures.
 * Returns empty array for non-review captures (not an error).
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '../constants.js';
import { validateCapturePath } from '../utils/validate-path.js';
import { parseCapture } from '../parsers/viewgraph-v2.js';

export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_annotations',
    `Return human annotations from a ${PROJECT_NAME} review-mode capture. ` +
    'Each annotation includes a comment, selected node IDs, and optional region. ' +
    'Returns empty array for non-review captures.',
    {
      filename: z.string().describe('Capture filename'),
    },
    async ({ filename }) => {
      let filePath;
      try { filePath = validateCapturePath(filename, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${filename}` }], isError: true };
      }
      try {
        const content = await readFile(filePath, 'utf-8');
        const result = parseCapture(content);
        if (!result.ok) return { content: [{ type: 'text', text: `Error: ${result.error}` }], isError: true };

        const annotations = result.data.annotations || [];
        return { content: [{ type: 'text', text: JSON.stringify(annotations, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
