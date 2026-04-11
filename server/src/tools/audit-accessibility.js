/**
 * MCP Tool: audit_accessibility
 *
 * Runs accessibility audit rules against all nodes in a capture.
 * Returns issues grouped by severity (error, warning).
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes, getNodeDetails } from '#src/analysis/node-queries.js';
import { auditNode } from '#src/analysis/a11y-rules.js';

/**
 * Register the audit_accessibility MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 * @see #src/analysis/a11y-rules.js
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'audit_accessibility',
    `Audit a ${PROJECT_NAME} capture for accessibility issues. ` +
    'Checks for: missing aria-labels, missing alt text, unlabeled form inputs, ' +
    'buttons without accessible names, insufficient contrast ratios. ' +
    'Includes axe-core results (100+ WCAG rules) when available in the capture.',
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

        const nodes = flattenNodes(result.data);
        const allIssues = [];
        for (const node of nodes) {
          const details = getNodeDetails(result.data, node.id);
          allIssues.push(...auditNode(node, details));
        }

        const grouped = {
          errors: allIssues.filter((i) => i.severity === 'error'),
          warnings: allIssues.filter((i) => i.severity === 'warning'),
          total: allIssues.length,
        };

        // Include axe-core results when available in the capture
        if (result.data.axe?.violations) {
          grouped.axe = {
            violations: result.data.axe.violations,
            passes: result.data.axe.passes,
            incomplete: result.data.axe.incomplete,
            source: 'axe-core (captured at scan time)',
          };
          grouped.total += result.data.axe.violations.length;
        }

        return { content: [{ type: 'text', text: JSON.stringify(grouped, null, 2) }] };
      } catch (err) {
        if (err.code === 'ENOENT') return { content: [{ type: 'text', text: `Error: Capture not found: ${filename}` }], isError: true };
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );
}
