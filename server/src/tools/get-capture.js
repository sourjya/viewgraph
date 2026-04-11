/**
 * MCP Tool: get_capture
 *
 * Returns the full capture JSON for a specific file.
 * Validates the filename against the captures directory to prevent path traversal.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME, PROJECT_PREFIX } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';

/**
 * Register the get_capture MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/utils/validate-path.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'get_capture',
    `Retrieve the full ${PROJECT_NAME} DOM capture JSON for a specific file. ` +
    'Returns the complete capture including NODES, SUMMARY, RELATIONS, DETAILS, ' +
    'and ANNOTATIONS sections. For large captures (>100KB), consider using ' +
    'get_page_summary first for an overview. Use list_captures to find filenames.',
    {
      filename: z.string()
        .describe(`Capture filename (e.g., "${PROJECT_PREFIX}-localhost-2026-04-08T060815.json")`),
    },
    async ({ filename }) => {
      let filePath;
      try {
        filePath = validateCapturePath(filename, capturesDir);
      } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename  -  ${filename}` }], isError: true };
      }

      try {
        const content = await readFile(filePath, 'utf-8');
        const size = Buffer.byteLength(content);
        const header = `Capture: ${filename} (${(size / 1024).toFixed(1)} KB)\n\n`;
        return { content: [{ type: 'text', text: header + content }] };
      } catch (err) {
        if (err.code === 'ENOENT') {
          return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}. Use list_captures to see available files.` }], isError: true };
        }
        return { content: [{ type: 'text', text: `Error reading capture: ${err.message}` }], isError: true };
      }
    },
  );
}
