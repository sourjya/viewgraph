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
import { PROJECT_NAME } from '#src/constants.js';
import { readAndParse, jsonResponse } from '#src/utils/tool-helpers.js';
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
      const { ok, parsed, error } = await readAndParse(filename, capturesDir);
      if (!ok) return error;
      const layout = analyzeLayout(parsed);
      return jsonResponse(layout);
    },
  );
}
