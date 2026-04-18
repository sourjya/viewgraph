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
import { diffCaptures } from '#src/analysis/capture-diff.js';

/**
 * Run all audits on a capture file and return a compact summary.
 * @param {string} filePath - Absolute path to the capture JSON file
 * @param {object} [previousParsed] - Previous capture for the same URL (for regression detection)
 * @returns {Promise<{ a11y: number, layout: number, testids: number, total: number, regressions?: object } | null>}
 */
export async function runPostCaptureAudit(filePath, previousParsed = null) {
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
    ...(previousParsed ? detectRegressions(parsed, previousParsed) : {}),
  };
}

/**
 * Compare current capture against previous to detect regressions.
 * Returns a regressions object only if issues are found.
 */
function detectRegressions(current, previous) {
  try {
    const diff = diffCaptures(previous, current);
    const removed = diff.removed?.length || 0;
    const added = diff.added?.length || 0;
    const moved = diff.moved?.length || 0;
    if (removed === 0 && added === 0 && moved === 0) return {};
    return {
      regressions: {
        elementsRemoved: removed,
        elementsAdded: added,
        elementsMoved: moved,
        removedElements: diff.removed?.slice(0, 5).map((n) => ({ id: n.id, tag: n.tag, text: n.text?.slice(0, 40) })),
      },
    };
  } catch { return {}; }
}
