/**
 * Salience Scorer
 *
 * Classifies DOM elements into high/med/low salience tiers based on a
 * weighted scoring algorithm. Higher scores indicate more important
 * elements for agent consumption.
 *
 * Scoring factors: interactivity, testid presence, ARIA attributes,
 * viewport position, text content, element size, semantic tags.
 */

/**
 * Score a single element record from the traverser.
 * @param {object} el - Element record from traverser
 * @param {{ width: number, height: number }} viewport
 * @returns {number} Score (0-100)
 */
export function scoreElement(el, viewport) {
  let score = 0;

  if (el.isInteractive) score += 30;
  if (el.testid) score += 20;
  if (el.ariaLabel || el.role) score += 15;
  if (el.isSemantic) score += 10;
  if (el.visibleText.length > 0) score += 10;

  // In viewport bonus (bbox overlaps the viewport area)
  const [x, y, w, h] = el.bbox;
  const inViewport = x < viewport.width && y < viewport.height && (x + w) > 0 && (y + h) > 0;
  if (inViewport) score += 10;

  // Size bonus for substantial elements
  if (w > 100 && h > 50) score += 5;

  return score;
}

/**
 * Classify a score into a salience tier.
 * @param {number} score
 * @returns {'high' | 'med' | 'low'}
 */
export function classifyTier(score) {
  if (score >= 50) return 'high';
  if (score >= 20) return 'med';
  return 'low';
}

/**
 * Score and classify all elements.
 * @param {Array} elements - Element records from traverser
 * @param {{ width: number, height: number }} viewport
 * @returns {Array} Elements with `score` and `salience` fields added
 */
export function scoreAll(elements, viewport) {
  return elements.map((el) => {
    const score = scoreElement(el, viewport);
    return { ...el, score, salience: classifyTier(score) };
  });
}
