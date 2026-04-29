/**
 * MCP Tool: verify_fix
 *
 * Composite smoke test tool. Runs all checks on a capture in one call.
 * Each audit phase is a separate helper for testability.
 *
 * @see docs/ideas/token-efficiency-experiments.md
 * @see server/src/analysis/post-capture-audit.js
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { readAndParse, readAndParsePair, errorResponse, jsonResponse } from '#src/utils/tool-helpers.js';
import { flattenNodes, filterInteractive, getNodeDetails } from '#src/analysis/node-queries.js';
import { auditNode } from '#src/analysis/a11y-rules.js';
import { analyzeLayout } from '#src/analysis/layout-analysis.js';
import { diffCaptures } from '#src/analysis/capture-diff.js';

// ──────────────────────────────────────────────
// Audit Helpers (each independently testable)
// ──────────────────────────────────────────────

/** Run a11y audit on all nodes. Returns { issues, axeViolations }. */
export function runA11yAudit(parsed) {
  const nodes = flattenNodes(parsed);
  const issues = [];
  for (const node of nodes) {
    const details = getNodeDetails(parsed, node.id);
    for (const issue of auditNode(node, details)) {
      issues.push({ rule: issue.rule, severity: issue.severity, element: `${node.tag}#${node.id}` });
    }
  }
  return { issues, axeViolations: parsed.axe?.violations?.length || 0 };
}

/** Run layout audit. Returns issue count. */
export function runLayoutAudit(parsed) {
  const layout = analyzeLayout(parsed);
  return (layout.overflows?.length || 0) + (layout.overlaps?.length || 0) + (layout.viewportOverflows?.length || 0);
}

/** Check console errors. Returns { errors, warnings }. */
export function checkConsole(parsed) {
  return { errors: parsed.console?.errors?.length || 0, warnings: parsed.console?.warnings?.length || 0 };
}

/** Check network failures. Returns { failed, total }. */
export function checkNetwork(parsed) {
  const net = parsed.network || {};
  return { failed: net.failed?.length || 0, total: net.total || 0 };
}

/** Count interactive elements missing data-testid. Returns { missing, total }. */
export function checkTestids(parsed) {
  const nodes = flattenNodes(parsed);
  const interactive = filterInteractive(nodes);
  let missing = 0;
  for (const el of interactive) {
    const details = getNodeDetails(parsed, el.id);
    if (!details?.attributes?.['data-testid']) missing++;
  }
  return { missing, total: interactive.length };
}

/** Run regression diff against a previous capture. Returns regressions object or null. */
export async function checkRegressions(previousFile, targetFile, capturesDir) {
  if (!previousFile) return null;
  try {
    const pair = await readAndParsePair(previousFile, targetFile, capturesDir);
    if (!pair.a || !pair.b) return null;
    const diff = diffCaptures(pair.a, pair.b);
    const removed = diff.removed?.length || 0;
    const added = diff.added?.length || 0;
    const moved = diff.moved?.length || 0;
    if (!removed && !added && !moved) return null;
    return {
      elementsRemoved: removed, elementsAdded: added, elementsMoved: moved,
      details: diff.removed?.slice(0, 5).map((n) => `removed: ${n.tag}${n.text ? ` "${n.text.slice(0, 30)}"` : ''}`),
    };
  } catch { return null; }
}

/** Assemble verdict from individual check results. */
export function assembleVerdict(targetFile, parsed, a11y, layoutIssues, console, network, testids, regressions) {
  const checks = {
    a11y: { issues: a11y.issues.length + a11y.axeViolations, pass: a11y.issues.length + a11y.axeViolations === 0 },
    layout: { issues: layoutIssues, pass: layoutIssues === 0 },
    console: { ...console, pass: console.errors === 0 },
    network: { ...network, pass: network.failed === 0 },
    testids: { ...testids, pass: testids.missing === 0 },
  };
  if (regressions) checks.regressions = { ...regressions, pass: regressions.elementsRemoved === 0 };

  const allPass = Object.values(checks).every((c) => c.pass);
  const hmrDetected = !!parsed.metadata?.hmrSource || !!parsed.metadata?.autoCapture;

  return {
    verdict: allPass ? 'PASS' : 'FAIL',
    summary: allPass
      ? `✅ All checks passed on ${targetFile}${hmrDetected ? ' (HMR capture)' : ''}`
      : `❌ ${Object.values(checks).filter((c) => !c.pass).length} check(s) failed on ${targetFile}${hmrDetected ? ' (HMR capture)' : ''}`,
    capture: targetFile,
    url: parsed.metadata?.url,
    hmrDetected,
    hmrSource: parsed.metadata?.hmrSource || null,
    checks,
    topIssues: [
      ...a11y.issues.slice(0, 3).map((i) => `a11y: ${i.rule} on ${i.element}`),
      ...(console.errors > 0 ? [`console: ${console.errors} error(s)`] : []),
      ...(network.failed > 0 ? [`network: ${network.failed} failed request(s)`] : []),
      ...(regressions?.details || []),
    ].slice(0, 5),
  };
}

// ──────────────────────────────────────────────
// Tool Registration
// ──────────────────────────────────────────────

export function register(server, indexer, capturesDir) {
  server.tool(
    'verify_fix',
    `Smoke test a ${PROJECT_NAME} capture: a11y audit, layout check, console errors, network failures, and regression diff. ` +
    `Returns structured pass/fail. Use after fixing code to verify no regressions.`,
    {
      filename: z.string().optional().describe('Capture to verify. If omitted, uses latest capture.'),
      previous_filename: z.string().optional().describe('Previous capture to diff against (for regression detection)'),
      url: z.string().optional().describe('URL filter to find latest capture (used when filename omitted)'),
    },
    async ({ filename, previous_filename, url }) => {
      let targetFile = filename;
      if (!targetFile) {
        const latest = indexer.getLatest(url);
        if (!latest) return errorResponse('No captures found. Capture the page first.');
        targetFile = latest.filename;
      }

      const result = await readAndParse(targetFile, capturesDir);
      if (!result.parsed) return errorResponse(`Cannot read capture: ${targetFile}`);
      const parsed = result.parsed;

      const a11y = runA11yAudit(parsed);
      const layoutIssues = runLayoutAudit(parsed);
      const consoleResult = checkConsole(parsed);
      const networkResult = checkNetwork(parsed);
      const testidResult = checkTestids(parsed);
      const regressions = await checkRegressions(previous_filename, targetFile, capturesDir);

      const verdict = assembleVerdict(targetFile, parsed, a11y, layoutIssues, consoleResult, networkResult, testidResult, regressions);
      verdict.previousCapture = previous_filename || null;

      return jsonResponse(verdict);
    },
  );
}
