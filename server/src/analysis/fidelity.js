/**
 * Fidelity Comparator
 *
 * Compares a ViewGraph JSON capture against an HTML snapshot to measure
 * how much of the visible page the structured capture represents.
 *
 * Uses a lightweight regex-based HTML parser (no browser or heavy DOM
 * library needed). Sufficient for counting elements, testids, and text.
 */

/** Tags considered interactive for coverage metrics. */
const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea']);

/** Tags to skip when counting elements (not meaningful for comparison). */
const SKIP_TAGS = new Set(['html', 'head', 'meta', 'link', 'style', 'script', 'title', 'br', 'hr']);

/**
 * Parse an HTML snapshot into an element inventory.
 * @param {string} html - Raw HTML string
 * @returns {{ totalElements: number, testids: string[], interactiveCount: number, textLength: number }}
 */
export function parseSnapshot(html) {
  const testids = [];
  let totalElements = 0;
  let interactiveCount = 0;
  let textLength = 0;

  // Match opening tags with attributes
  const tagRegex = /<(\w[\w-]*)((?:\s+[^>]*?)?)>/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    if (SKIP_TAGS.has(tag)) continue;

    totalElements++;
    if (INTERACTIVE_TAGS.has(tag)) interactiveCount++;

    // Extract data-testid
    const tidMatch = match[2].match(/data-testid="([^"]*)"/);
    if (tidMatch) testids.push(tidMatch[1]);
  }

  // Rough text content extraction: strip all tags, measure length
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  textLength = textContent.length;

  return { totalElements, testids, interactiveCount, textLength };
}

/**
 * Compare a ViewGraph capture against a parsed HTML snapshot.
 * @param {object} capture - ViewGraph JSON capture
 * @param {{ totalElements: number, testids: string[], interactiveCount: number, textLength: number }} snapshot
 * @returns {object} Fidelity report
 */
export function compareFidelity(capture, snapshot) {
  // Extract testids and text from capture
  const capturedTestids = new Set();
  let capturedInteractive = 0;
  let capturedTextLength = 0;
  let capturedElements = 0;

  for (const tier of ['high', 'med', 'low']) {
    const tierData = capture.details?.[tier] || {};
    for (const [tag, elements] of Object.entries(tierData)) {
      for (const info of Object.values(elements)) {
        capturedElements++;
        for (const loc of info.locators || []) {
          if (loc.strategy === 'testId') capturedTestids.add(loc.value);
        }
        if (INTERACTIVE_TAGS.has(tag)) capturedInteractive++;
        capturedTextLength += (info.visibleText || '').length;
      }
    }
  }

  const snapshotTestids = new Set(snapshot.testids);

  // TestID coverage: how many of the HTML's testids appear in the capture
  const testidsCaptured = [...snapshotTestids].filter((t) => capturedTestids.has(t)).length;

  // Identify missing testids
  const missing = [...snapshotTestids]
    .filter((t) => !capturedTestids.has(t))
    .map((testid) => ({ testid, reason: 'hidden or filtered' }));

  const metrics = {
    elementCoverage: pctMetric(snapshot.totalElements, capturedElements),
    testidCoverage: pctMetric(snapshotTestids.size, testidsCaptured),
    interactiveCoverage: pctMetric(snapshot.interactiveCount, capturedInteractive),
    textCoverage: pctMetric(snapshot.textLength, capturedTextLength),
    overallScore: 0,
  };

  // Weighted overall: testid 40%, interactive 30%, element 20%, text 10%
  metrics.overallScore = round(
    metrics.testidCoverage.pct * 0.4 +
    metrics.interactiveCoverage.pct * 0.3 +
    metrics.elementCoverage.pct * 0.2 +
    metrics.textCoverage.pct * 0.1,
  );

  return { metrics, missing };
}

/** Build a { total, captured, pct } metric object. */
function pctMetric(total, captured) {
  const capped = Math.min(captured, total);
  return { total, captured: capped, pct: total > 0 ? round(capped / total) : 1 };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
