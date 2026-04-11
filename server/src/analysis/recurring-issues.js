/**
 * Recurring Issue Detection
 *
 * Scans all captures with annotations to find elements that are flagged
 * repeatedly across sessions. Identifies "hot spots" in the UI that
 * keep generating issues.
 *
 * @see docs/roadmap/roadmap.md - M10.5
 */

/**
 * Detect recurring issues across all annotated captures.
 * @param {Array<{ filename: string, url: string, timestamp: string, annotations: Array }>} captures
 * @param {{ minOccurrences?: number }} options
 * @returns {{ hotspots: Array<{ selector: string, occurrences: number, captures: string[], comments: string[], severities: string[] }> }}
 */
export function detectRecurringIssues(captures, options = {}) {
  const minOccurrences = options.minOccurrences ?? 2;
  const selectorMap = new Map();

  for (const cap of captures) {
    for (const ann of cap.annotations) {
      if (ann.resolved) continue;
      const selector = ann.ancestor || ann.element?.selector || null;
      if (!selector) continue;

      if (!selectorMap.has(selector)) {
        selectorMap.set(selector, { captures: new Set(), comments: [], severities: [] });
      }
      const entry = selectorMap.get(selector);
      entry.captures.add(cap.filename);
      if (ann.comment) entry.comments.push(ann.comment.slice(0, 80));
      if (ann.severity) entry.severities.push(ann.severity);
    }
  }

  const hotspots = [];
  for (const [selector, data] of selectorMap) {
    if (data.captures.size >= minOccurrences) {
      hotspots.push({
        selector,
        occurrences: data.captures.size,
        captures: [...data.captures],
        comments: [...new Set(data.comments)].slice(0, 5),
        severities: [...new Set(data.severities)],
      });
    }
  }

  // Sort by occurrences descending
  hotspots.sort((a, b) => b.occurrences - a.occurrences);

  return { hotspots };
}
