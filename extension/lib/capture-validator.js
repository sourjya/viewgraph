/**
 * Capture Quality Validator
 *
 * Checks a capture for common quality issues before sending to the agent.
 * Returns warnings that help the user decide whether to re-capture.
 *
 * Checks:
 * - Empty capture (0 elements)
 * - Very few elements (likely mid-navigation)
 * - No interactive elements (page may not be loaded)
 * - Missing enrichment sections
 * - Oversized capture (may be truncated by MCP)
 *
 * @see docs/architecture/viewgraph-v2-format.md
 */

/** Minimum element count for a useful capture. */
const MIN_ELEMENTS = 5;

/** Maximum capture size before MCP truncation risk (100KB). */
const MAX_SIZE_BYTES = 100 * 1024;

/**
 * Validate capture quality and return warnings.
 * @param {object} capture - Serialized capture object
 * @returns {{ ok: boolean, warnings: string[] }}
 */
export function validateCapture(capture) {
  const warnings = [];
  if (!capture) return { ok: false, warnings: ['No capture data'] };
  const nodes = capture.nodes || [];
  const meta = capture?.metadata || {};

  if (nodes.length === 0) {
    warnings.push('Empty capture - 0 elements detected. Is the page fully loaded?');
  } else if (nodes.length < MIN_ELEMENTS) {
    warnings.push(`Only ${nodes.length} element(s) captured. Page may still be loading.`);
  }

  const interactive = nodes.filter((n) => n.interactive || ['button', 'a', 'input', 'select', 'textarea'].includes(n.tag));
  if (nodes.length > 0 && interactive.length === 0) {
    warnings.push('No interactive elements found. Page content may not be rendered yet.');
  }

  const size = JSON.stringify(capture).length;
  if (size > MAX_SIZE_BYTES) {
    warnings.push(`Capture is ${Math.round(size / 1024)}KB - may be summarized by the agent. Consider focusing on a specific area.`);
  }

  if (!capture.network && !capture.console) {
    warnings.push('Missing network and console data. Enrichment collectors may have failed.');
  }

  return { ok: warnings.length === 0, warnings };
}
