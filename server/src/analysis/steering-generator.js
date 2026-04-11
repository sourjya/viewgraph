/**
 * Pattern-Based Steering Generator
 *
 * Analyzes resolved annotations to identify patterns and generate
 * project-specific steering docs. For example: "80% of issues are
 * a11y-related - consider adding eslint-plugin-jsx-a11y."
 *
 * @see docs/roadmap/roadmap.md - M10.6
 */

/**
 * Analyze resolved annotations and generate steering recommendations.
 * @param {Array<{ comment: string, severity: string, category: string, selector: string, resolution?: { action: string, summary: string } }>} annotations
 * @returns {{ patterns: Array<{ category: string, count: number, percentage: number, recommendation: string }>, summary: string }}
 */
export function analyzePatterns(annotations) {
  const resolved = annotations.filter((a) => a.resolution);
  if (resolved.length < 3) return { patterns: [], summary: 'Not enough resolved annotations to detect patterns (need 3+)' };

  // Count by category
  const catCounts = new Map();
  for (const ann of resolved) {
    const cat = ann.category || 'uncategorized';
    catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
  }

  // Count by severity
  const sevCounts = new Map();
  for (const ann of resolved) {
    const sev = ann.severity || 'minor';
    sevCounts.set(sev, (sevCounts.get(sev) || 0) + 1);
  }

  // Count by element type (from selector)
  const elCounts = new Map();
  for (const ann of resolved) {
    const tag = ann.selector?.match(/^(\w+)/)?.[1] || 'unknown';
    elCounts.set(tag, (elCounts.get(tag) || 0) + 1);
  }

  const total = resolved.length;
  const patterns = [];

  // Category patterns
  for (const [cat, count] of catCounts) {
    const pct = Math.round((count / total) * 100);
    if (pct >= 30) {
      patterns.push({
        category: cat, count, percentage: pct,
        recommendation: CATEGORY_RECOMMENDATIONS[cat] || `${pct}% of issues are ${cat}-related. Consider adding automated checks.`,
      });
    }
  }

  // Severity patterns
  const criticalPct = Math.round(((sevCounts.get('critical') || 0) / total) * 100);
  if (criticalPct >= 20) {
    patterns.push({
      category: 'severity', count: sevCounts.get('critical'), percentage: criticalPct,
      recommendation: `${criticalPct}% of issues are critical severity. Consider adding pre-commit hooks or CI checks to catch these earlier.`,
    });
  }

  // Element patterns
  for (const [tag, count] of elCounts) {
    const pct = Math.round((count / total) * 100);
    if (pct >= 25 && count >= 3) {
      patterns.push({
        category: `element:${tag}`, count, percentage: pct,
        recommendation: `${pct}% of issues involve <${tag}> elements. Review ${tag} component patterns in the codebase.`,
      });
    }
  }

  patterns.sort((a, b) => b.percentage - a.percentage);

  const summary = patterns.length > 0
    ? `Found ${patterns.length} pattern(s) in ${total} resolved annotations`
    : `No strong patterns detected in ${total} resolved annotations`;

  return { patterns, summary };
}

/** Recommendations by annotation category. */
const CATEGORY_RECOMMENDATIONS = {
  accessibility: 'Most issues are accessibility-related. Add eslint-plugin-jsx-a11y (React) or axe-linter. Run audit_accessibility on every capture.',
  visual: 'Most issues are visual/styling. Consider a design token system and cross-page consistency checks.',
  content: 'Most issues are content-related. Consider a content review checklist or CMS validation rules.',
  layout: 'Most issues are layout-related. Add layout audit to CI pipeline. Check for overflow and z-index conflicts.',
  interaction: 'Most issues are interaction-related. Add event listener inventory checks and test interactive elements.',
};
