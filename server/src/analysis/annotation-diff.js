/**
 * Annotation Diffing
 *
 * Compares annotations across multiple captures to track which issues
 * persist, which are new, and which were resolved. Matches annotations
 * by element selector (ancestor field) and comment similarity.
 *
 * Use case: "This button color issue was flagged 3 captures ago and
 * is still unresolved."
 *
 * @see docs/roadmap/roadmap.md - M10.4
 */

/**
 * Compare annotations across captures chronologically.
 * @param {Array<{ filename: string, url: string, timestamp: string, annotations: Array }>} captures
 * @returns {{ persistent: Array, newInLatest: Array, resolvedSince: Array, timeline: Array }}
 */
export function diffAnnotations(captures) {
  if (captures.length < 2) return { persistent: [], newInLatest: [], resolvedSince: [], timeline: [] };

  // Sort by timestamp ascending
  const sorted = [...captures].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const latest = sorted[sorted.length - 1];
  const earlier = sorted.slice(0, -1);

  // Build a map of all earlier annotations by matching key
  const earlierMap = new Map();
  for (const cap of earlier) {
    for (const ann of cap.annotations) {
      const key = matchKey(ann);
      if (!earlierMap.has(key)) earlierMap.set(key, []);
      earlierMap.get(key).push({ ...ann, captureFile: cap.filename, captureTimestamp: cap.timestamp });
    }
  }

  const persistent = [];
  const newInLatest = [];
  const matchedKeys = new Set();

  // Check each latest annotation against earlier ones
  for (const ann of latest.annotations) {
    if (ann.resolved) continue;
    const key = matchKey(ann);
    const prev = earlierMap.get(key);
    if (prev && prev.length > 0) {
      matchedKeys.add(key);
      persistent.push({
        annotation: { id: ann.id, uuid: ann.uuid, comment: ann.comment?.slice(0, 100), severity: ann.severity, selector: ann.ancestor },
        firstSeen: prev[0].captureTimestamp,
        occurrences: prev.length + 1,
        captures: prev.map((p) => p.captureFile),
      });
    } else {
      newInLatest.push({
        id: ann.id, uuid: ann.uuid, comment: ann.comment?.slice(0, 100), severity: ann.severity, selector: ann.ancestor,
      });
    }
  }

  // Find annotations that were in earlier captures but not in latest (resolved)
  const latestKeys = new Set(latest.annotations.map(matchKey));
  const resolvedSince = [];
  for (const [key, entries] of earlierMap) {
    if (!latestKeys.has(key) && !entries[0].resolved) {
      resolvedSince.push({
        comment: entries[0].comment?.slice(0, 100), severity: entries[0].severity, selector: entries[0].ancestor,
        lastSeen: entries[entries.length - 1].captureTimestamp,
      });
    }
  }

  // Build timeline
  const timeline = sorted.map((cap) => ({
    filename: cap.filename,
    timestamp: cap.timestamp,
    total: cap.annotations.length,
    open: cap.annotations.filter((a) => !a.resolved).length,
    resolved: cap.annotations.filter((a) => a.resolved).length,
  }));

  return { persistent, newInLatest, resolvedSince, timeline };
}

/**
 * Generate a matching key for an annotation.
 * Uses ancestor selector + first 30 chars of comment for fuzzy matching.
 * @param {object} ann
 * @returns {string}
 */
function matchKey(ann) {
  const selector = ann.ancestor || ann.element?.selector || 'unknown';
  const comment = (ann.comment || '').slice(0, 30).toLowerCase().trim();
  return `${selector}::${comment}`;
}
