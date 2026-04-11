/**
 * Shared Selector Builder
 *
 * Single implementation of element-to-CSS-selector logic used by all
 * collectors and the traverser. Prefers data-testid, then id, then
 * structural fallback.
 *
 * Extracted from 5 duplicate implementations per CQ-01 in the code
 * quality audit (2026-04-12).
 *
 * @see docs/architecture/code-quality-audit-2026-04-12.md - CQ-01
 */

/**
 * Build a compact CSS selector for a DOM element.
 * Priority: data-testid > id > tag.class (max 2 classes) > tag
 * @param {Element} el
 * @returns {string}
 */
export function buildSelector(el) {
  const tag = el.tagName?.toLowerCase() || 'unknown';
  const testid = el.getAttribute?.('data-testid');
  if (testid) return `${tag}[data-testid="${testid}"]`;
  if (el.id) return `${tag}#${el.id}`;
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).filter((c) => c.length < 25 && !c.startsWith('_')).slice(0, 2).join('.')
    : '';
  return cls ? `${tag}${cls}` : tag;
}
