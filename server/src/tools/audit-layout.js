/**
 * MCP Tool: audit_layout
 *
 * Detects layout issues in a ViewGraph capture: elements overflowing
 * their parent, sibling overlaps, and viewport overflows.
 *
 * @see server/src/analysis/layout-analysis.js - core detection logic
 * @see .kiro/specs/audit-layout/requirements.md FR-4
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { analyzeLayout } from '#src/analysis/layout-analysis.js';

/**
 * Register the audit_layout MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/analysis/layout-analysis.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'audit_layout',
    `Audit a ${PROJECT_NAME} capture for layout issues: elements overflowing their ` +
    'parent container, sibling elements that overlap, and elements extending beyond ' +
    'the viewport. Returns issues with element IDs, selectors, and measurements in pixels.',
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
        const layout = analyzeLayout(result.data);
        return { content: [{ type: 'text', text: JSON.stringify(layout, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
