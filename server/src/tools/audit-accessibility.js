/**
 * MCP Tool: audit_accessibility
 *
 * Runs accessibility audit rules against all nodes in a capture.
 * Returns issues grouped by severity (error, warning).
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { readAndParse } from '#src/utils/tool-helpers.js';
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
      const { ok, parsed, error } = await readAndParse(filename, capturesDir);
      if (!ok) return error;

      const nodes = flattenNodes(parsed);
      const allIssues = [];
      for (const node of nodes) {
        const details = getNodeDetails(parsed, node.id);
        allIssues.push(...auditNode(node, details));
      }

      const grouped = {
        errors: allIssues.filter((i) => i.severity === 'error'),
        warnings: allIssues.filter((i) => i.severity === 'warning'),
        total: allIssues.length,
      };

      // Include axe-core results when available in the capture
      if (parsed.axe?.violations) {
        grouped.axe = {
          violations: parsed.axe.violations,
          passes: parsed.axe.passes,
          incomplete: parsed.axe.incomplete,
          source: 'axe-core (captured at scan time)',
        };
        grouped.total += parsed.axe.violations.length;
      }

      return { content: [{ type: 'text', text: JSON.stringify(grouped, null, 2) }] };
    },
  );
}
