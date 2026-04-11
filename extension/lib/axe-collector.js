/**
 * Axe-Core Accessibility Collector
 *
 * Runs axe-core accessibility scan on the current page and returns
 * structured results. axe-core is imported as a dependency and runs
 * in the content script context.
 *
 * If axe-core fails to load or run, returns null so the capture pipeline
 * falls back to ViewGraph's built-in a11y rules (which cover fewer checks
 * but are always available).
 *
 * axe-core provides 100+ WCAG rules vs ViewGraph's 6 built-in rules.
 * Results are included in the capture as the `axe` enrichment section.
 *
 * @see docs/architecture/strategic-recommendations.md - R2
 */

/** Maximum violations to include (cap for capture size). */
const MAX_VIOLATIONS = 50;

/** Maximum nodes per violation (cap for capture size). */
const MAX_NODES_PER = 5;

/**
 * Run axe-core scan and return structured results.
 * Returns null if axe-core is unavailable or scan fails.
 * @returns {Promise<{ violations: Array, passes: number, incomplete: number, inapplicable: number, timestamp: string }|null>}
 */
export async function collectAxeResults() {
  try {
    const axe = await import('axe-core');
    const results = await axe.default.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
      resultTypes: ['violations', 'passes', 'incomplete'],
    });

    return {
      violations: results.violations.slice(0, MAX_VIOLATIONS).map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        tags: v.tags.filter((t) => t.startsWith('wcag')),
        nodes: v.nodes.slice(0, MAX_NODES_PER).map((n) => ({
          target: n.target?.[0] || '',
          html: (n.html || '').slice(0, 200),
          failureSummary: (n.failureSummary || '').slice(0, 200),
        })),
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      timestamp: new Date().toISOString(),
    };
  } catch {
    // axe-core unavailable or scan failed - return null for graceful fallback
    return null;
  }
}
