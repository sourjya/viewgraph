/**
 * MCP Tool: analyze_journey
 *
 * Analyzes a recorded user journey (session) for issues: broken navigation,
 * missing elements between steps, accessibility regressions, and performance
 * degradation across the flow.
 *
 * @see docs/roadmap/roadmap.md - M14.2
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes } from '#src/analysis/node-queries.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';

/**
 * Register the analyze_journey MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'analyze_journey',
    `Analyze a recorded user journey for issues across steps. ` +
    `Checks for missing elements, a11y regressions, and performance changes between ${PROJECT_NAME} captures.`,
    {
      filenames: z.array(z.string()).min(2).max(20).describe('Capture filenames in step order'),
    },
    async ({ filenames }) => {
      const steps = [];
      for (const filename of filenames) {
        try {
          const filePath = validateCapturePath(filename, capturesDir);
          const raw = await readFile(filePath, 'utf-8');
          const result = parseCapture(raw);
          if (!result.ok) continue;
          steps.push({ filename, data: result.data });
        } catch { continue; }
      }

      if (steps.length < 2) {
        return errorResponse('Need at least 2 valid captures to analyze a journey');
      }

      const issues = [];
      for (let i = 0; i < steps.length - 1; i++) {
        const from = steps[i];
        const to = steps[i + 1];
        const fromNodes = flattenNodes(from.data);
        const toNodes = flattenNodes(to.data);

        // Check for interactive elements that disappeared
        const fromTestids = new Set(fromNodes.filter((n) => n.attributes?.['data-testid']).map((n) => n.attributes['data-testid']));
        const toTestids = new Set(toNodes.filter((n) => n.attributes?.['data-testid']).map((n) => n.attributes['data-testid']));
        const missing = [...fromTestids].filter((id) => !toTestids.has(id));
        if (missing.length > 0) {
          issues.push({ step: i + 1, type: 'missing-elements', severity: 'warning', details: `${missing.length} testid elements disappeared: ${missing.slice(0, 5).join(', ')}` });
        }

        // Check for performance degradation
        const fromLoad = from.data.performance?.navigation?.loadEvent;
        const toLoad = to.data.performance?.navigation?.loadEvent;
        if (fromLoad && toLoad && toLoad > fromLoad * 2) {
          issues.push({ step: i + 1, type: 'performance', severity: 'warning', details: `Page load doubled: ${fromLoad}ms -> ${toLoad}ms` });
        }

        // Check for console errors appearing
        const fromErrors = from.data.console?.errors?.length || 0;
        const toErrors = to.data.console?.errors?.length || 0;
        if (toErrors > fromErrors) {
          issues.push({ step: i + 1, type: 'console-errors', severity: 'error', details: `${toErrors - fromErrors} new console error(s) appeared` });
        }
      }

      const summary = steps.map((s, i) => ({
        step: i + 1,
        filename: s.filename,
        url: s.data.metadata?.url,
        title: s.data.metadata?.title,
        elements: flattenNodes(s.data).length,
      }));

      return jsonResponse({
        steps: summary.length,
        issueCount: issues.length,
        journey: summary,
        issues: issues,
      });
    },
  );
}
