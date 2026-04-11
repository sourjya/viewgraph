/**
 * Cross-Page Consistency Checker
 *
 * Compares structurally similar elements across multiple captures to find
 * style inconsistencies. Matches elements by data-testid prefix, ARIA role,
 * or CSS class pattern, then compares their computed styles.
 *
 * Example output: "header.app-header has padding:16px on /products but
 * padding:24px on /settings"
 *
 * Matching strategy (ordered by reliability):
 * 1. Same data-testid - exact match across pages
 * 2. Same role + similar selector pattern - e.g., nav.main-nav on both pages
 * 3. Same tag + same class set - e.g., header.app-header on both pages
 *
 * Style properties compared: font-size, font-family, padding, margin, color,
 * background-color, border-radius, gap, line-height, font-weight.
 *
 * @see docs/architecture/strategic-recommendations.md - R4
 * @see docs/roadmap/roadmap.md - M15.3
 */

/**
 * Style properties to compare for consistency.
 * These are the properties most likely to indicate design system drift.
 */
const COMPARE_PROPS = [
  'fontSize', 'fontFamily', 'fontWeight', 'lineHeight',
  'color', 'backgroundColor',
  'padding', 'margin', 'gap',
  'borderRadius',
];

/**
 * Extract comparable elements from a parsed capture.
 * Returns elements with their identifying features and style values.
 * @param {object} parsed - Parsed capture from viewgraph-v2 parser
 * @returns {Array<{ id: string, testid: string|null, role: string|null, tag: string, classes: string, selector: string, styles: object }>}
 */
function extractComparableElements(parsed) {
  const elements = [];
  const details = parsed.details || {};

  // Flatten all nodes from all salience levels
  for (const level of ['high', 'med', 'low']) {
    const nodes = parsed.nodes?.[level] || [];
    for (const node of nodes) {
      const detail = details[level]?.[node.id] || {};
      const attrs = detail.attributes || node.attributes || {};
      const styles = detail.styles || {};
      const testid = attrs['data-testid'] || null;
      const role = node.role || attrs.role || null;
      const tag = node.tag || '';
      const selector = node.selector || detail.selector || '';
      const classes = selector.match(/\.([\w-]+)/g)?.map((c) => c.slice(1)).sort().join(' ') || '';

      elements.push({
        id: node.id,
        testid,
        role,
        tag,
        classes,
        selector,
        text: (node.text || '').slice(0, 40),
        styles: pickStyles(styles),
      });
    }
  }
  return elements;
}

/**
 * Pick only the style properties we compare.
 * @param {object} styles
 * @returns {object}
 */
function pickStyles(styles) {
  const picked = {};
  for (const prop of COMPARE_PROPS) {
    if (styles[prop] !== undefined) picked[prop] = styles[prop];
  }
  return picked;
}

/**
 * Find matching elements between two captures.
 * @param {Array} elemsA - Elements from capture A
 * @param {Array} elemsB - Elements from capture B
 * @returns {Array<{ a: object, b: object, matchType: string }>}
 */
function findMatches(elemsA, elemsB) {
  const matches = [];
  const usedB = new Set();

  // Pass 1: match by data-testid (highest confidence)
  for (const a of elemsA) {
    if (!a.testid) continue;
    const b = elemsB.find((e, i) => !usedB.has(i) && e.testid === a.testid);
    if (b) {
      const idx = elemsB.indexOf(b);
      usedB.add(idx);
      matches.push({ a, b, matchType: 'testid' });
    }
  }

  // Pass 2: match by role + tag + classes
  for (const a of elemsA) {
    if (matches.some((m) => m.a === a)) continue;
    if (!a.role || !a.classes) continue;
    const b = elemsB.find((e, i) => !usedB.has(i) && e.role === a.role && e.tag === a.tag && e.classes === a.classes);
    if (b) {
      const idx = elemsB.indexOf(b);
      usedB.add(idx);
      matches.push({ a, b, matchType: 'role+class' });
    }
  }

  // Pass 3: match by tag + classes (no role needed)
  for (const a of elemsA) {
    if (matches.some((m) => m.a === a)) continue;
    if (!a.classes || a.classes.length < 4) continue;
    const b = elemsB.find((e, i) => !usedB.has(i) && e.tag === a.tag && e.classes === a.classes);
    if (b) {
      const idx = elemsB.indexOf(b);
      usedB.add(idx);
      matches.push({ a, b, matchType: 'tag+class' });
    }
  }

  return matches;
}

/**
 * Compare style properties between matched elements.
 * @param {object} stylesA
 * @param {object} stylesB
 * @returns {Array<{ property: string, valueA: string, valueB: string }>}
 */
function diffStyles(stylesA, stylesB) {
  const diffs = [];
  for (const prop of COMPARE_PROPS) {
    const a = stylesA[prop];
    const b = stylesB[prop];
    if (a && b && a !== b) {
      diffs.push({ property: prop, valueA: a, valueB: b });
    }
  }
  return diffs;
}

/**
 * Check consistency across multiple parsed captures.
 * @param {Array<{ url: string, title: string, parsed: object }>} captures
 * @returns {{ inconsistencies: Array, matchedElements: number, comparedPages: number }}
 */
export function checkConsistency(captures) {
  if (captures.length < 2) return { inconsistencies: [], matchedElements: 0, comparedPages: captures.length };

  const inconsistencies = [];
  let matchedElements = 0;

  // Compare each pair of captures
  for (let i = 0; i < captures.length; i++) {
    for (let j = i + 1; j < captures.length; j++) {
      const a = captures[i];
      const b = captures[j];
      const elemsA = extractComparableElements(a.parsed);
      const elemsB = extractComparableElements(b.parsed);
      const matches = findMatches(elemsA, elemsB);
      matchedElements += matches.length;

      for (const match of matches) {
        const diffs = diffStyles(match.a.styles, match.b.styles);
        if (diffs.length > 0) {
          inconsistencies.push({
            element: match.a.testid || match.a.selector,
            matchType: match.matchType,
            pageA: a.url,
            pageB: b.url,
            diffs,
          });
        }
      }
    }
  }

  return { inconsistencies, matchedElements, comparedPages: captures.length };
}
