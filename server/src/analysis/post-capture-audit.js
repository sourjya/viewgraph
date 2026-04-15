/**
 * Post-Capture Audit Runner
 *
 * Runs accessibility, layout, and testid audits on a capture file after
 * it's saved to disk. Returns a compact summary suitable for WS push
 * to the extension. Called by http-receiver when autoAudit is enabled.
 *
 * @see docs/roadmap/feature-specs.md - F3
 * @see server/src/analysis/a11y-rules.js
 * @see server/src/analysis/layout-analysis.js
 */

import { readFile } from 'fs/promises';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { flattenNodes, filterInteractive, getNodeDetails } from '#src/analysis/node-queries.js';
import { auditNode } from '#src/analysis/a11y-rules.js';
import { analyzeLayout } from '#src/analysis/layout-analysis.js';

/**
 * Run all audits on a capture file and return a compact summary.
 * @param {string} filePath - Absolute path to the capture JSON file
 * @returns {Promise<{ a11y: number, layout: number, testids: number, total: number, details: Object } | null>}
 *   Returns null if the file can't be parsed.
 */
export async function runPostCaptureAudit(filePath) {
  let parsed;
  try {
    const raw = await readFile(filePath, 'utf-8');
    const result = parseCapture(raw);
    if (!result.ok) return null;
    parsed = result.data;
  } catch { return null; }

  const nodes = flattenNodes(parsed);

  // A11y audit
  let a11yCount = 0;
  for (const node of nodes) {
    const details = getNodeDetails(parsed, node.id);
    a11yCount += auditNode(node, details).length;
  }
  if (parsed.axe?.violations) a11yCount += parsed.axe.violations.length;

  // Layout audit
  const layout = analyzeLayout(parsed);
  const layoutCount = (layout.overflows?.length || 0) + (layout.overlaps?.length || 0) + (layout.viewportOverflows?.length || 0);

  // Missing testids
  const interactive = filterInteractive(nodes);
  let missingTestids = 0;
  for (const node of interactive) {
    const details = getNodeDetails(parsed, node.id);
    if (!details?.attributes?.['data-testid']) missingTestids++;
  }

  return {
    a11y: a11yCount,
    layout: layoutCount,
    testids: missingTestids,
    total: a11yCount + layoutCount + missingTestids,
  };
}
