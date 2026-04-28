/**
 * MCP Tool: verify_fix
 *
 * Composite smoke test tool. Runs all checks on a capture in one call:
 * accessibility audit, layout audit, console errors, network failures,
 * and optional regression diff against a previous capture.
 *
 * Returns a structured pass/fail with per-category results. Designed
 * for the post-fix verification loop: fix code → capture → verify_fix.
 *
 * @see docs/ideas/token-efficiency-experiments.md - agent workflow optimization
 * @see server/src/analysis/post-capture-audit.js - reuses same audit logic
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { readAndParse, readAndParsePair, errorResponse, jsonResponse } from '#src/utils/tool-helpers.js';
import { flattenNodes, filterInteractive, getNodeDetails } from '#src/analysis/node-queries.js';
import { auditNode } from '#src/analysis/a11y-rules.js';
import { analyzeLayout } from '#src/analysis/layout-analysis.js';
import { diffCaptures } from '#src/analysis/capture-diff.js';

/**
 * Register the verify_fix MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {object} indexer - Capture indexer
 * @param {string} capturesDir - Captures directory path
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'verify_fix',
    `Smoke test a ${PROJECT_NAME} capture: a11y audit, layout check, console errors, network failures, and regression diff. ` +
    `Returns structured pass/fail. Use after fixing code to verify no regressions. ` +
    `If previous_filename provided, also diffs against it for structural changes.`,
    {
      filename: z.string().optional().describe('Capture to verify. If omitted, uses latest capture.'),
      previous_filename: z.string().optional().describe('Previous capture to diff against (for regression detection)'),
      url: z.string().optional().describe('URL filter to find latest capture (used when filename omitted)'),
    },
    async ({ filename, previous_filename, url }) => {
      // Resolve the capture to verify
      let targetFile = filename;
      if (!targetFile) {
        const latest = indexer.getLatest(url);
        if (!latest) return errorResponse('No captures found. Capture the page first.');
        targetFile = latest.filename;
      }

      const result = await readAndParse(targetFile, capturesDir);
      if (!result.parsed) return errorResponse(`Cannot read capture: ${targetFile}`);
      const parsed = result.parsed;

      // ── A11y Audit ──
      const nodes = flattenNodes(parsed);
      const a11yIssues = [];
      for (const node of nodes) {
        const details = getNodeDetails(parsed, node.id);
        const issues = auditNode(node, details);
        for (const issue of issues) {
          a11yIssues.push({ rule: issue.rule, severity: issue.severity, element: `${node.tag}#${node.id}` });
        }
      }
      // Include axe-core violations if present
      const axeViolations = parsed.axe?.violations?.length || 0;

      // ── Layout Audit ──
      const layout = analyzeLayout(parsed);
      const layoutIssues = (layout.overflows?.length || 0) + (layout.overlaps?.length || 0) + (layout.viewportOverflows?.length || 0);

      // ── Console Errors ──
      const consoleErrors = parsed.console?.errors?.length || 0;
      const consoleWarnings = parsed.console?.warnings?.length || 0;

      // ── Network Failures ──
      const networkData = parsed.network || {};
      const failedRequests = networkData.failed?.length || 0;
      const totalRequests = networkData.total || 0;

      // ── Missing Testids ──
      const interactive = filterInteractive(nodes);
      let missingTestids = 0;
      for (const el of interactive) {
        const details = getNodeDetails(parsed, el.id);
        if (!details?.attributes?.['data-testid']) missingTestids++;
      }

      // ── Regression Diff (optional) ──
      let regressions = null;
      if (previous_filename) {
        try {
          const pair = await readAndParsePair(previous_filename, targetFile, capturesDir);
          if (pair.a && pair.b) {
            const diff = diffCaptures(pair.a, pair.b);
            const removed = diff.removed?.length || 0;
            const added = diff.added?.length || 0;
            const moved = diff.moved?.length || 0;
            if (removed || added || moved) {
              regressions = {
                elementsRemoved: removed,
                elementsAdded: added,
                elementsMoved: moved,
                details: diff.removed?.slice(0, 5).map((n) => `removed: ${n.tag}${n.text ? ` "${n.text.slice(0, 30)}"` : ''}`),
              };
            }
          }
        } catch { /* diff failed - skip regression check */ }
      }

      // ── Verdict ──
      const checks = {
        a11y: { issues: a11yIssues.length + axeViolations, pass: a11yIssues.length + axeViolations === 0 },
        layout: { issues: layoutIssues, pass: layoutIssues === 0 },
        console: { errors: consoleErrors, warnings: consoleWarnings, pass: consoleErrors === 0 },
        network: { failed: failedRequests, total: totalRequests, pass: failedRequests === 0 },
        testids: { missing: missingTestids, total: interactive.length, pass: missingTestids === 0 },
      };
      if (regressions) {
        checks.regressions = { ...regressions, pass: regressions.elementsRemoved === 0 };
      }

      const allPass = Object.values(checks).every((c) => c.pass);
      const summary = allPass
        ? `✅ All checks passed on ${targetFile}`
        : `❌ ${Object.values(checks).filter((c) => !c.pass).length} check(s) failed on ${targetFile}`;

      return jsonResponse({
        verdict: allPass ? 'PASS' : 'FAIL',
        summary,
        capture: targetFile,
        previousCapture: previous_filename || null,
        url: parsed.metadata?.url,
        checks,
        // Top issues for quick scanning
        topIssues: [
          ...a11yIssues.slice(0, 3).map((i) => `a11y: ${i.rule} on ${i.element}`),
          ...(consoleErrors > 0 ? [`console: ${consoleErrors} error(s)`] : []),
          ...(failedRequests > 0 ? [`network: ${failedRequests} failed request(s)`] : []),
          ...(regressions?.details || []),
        ].slice(0, 5),
      });
    },
  );
}
