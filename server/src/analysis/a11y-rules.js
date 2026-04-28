/**
 * Accessibility Audit Rules
 *
 * Each rule checks a single node + its details for a specific a11y issue.
 * auditNode() runs all rules and returns an array of issues found.
 *
 * Rules are intentionally simple - they check what's available in the
 * ViewGraph capture (attributes, text, tag). They don't replace a full
 * axe-core audit but catch the most common issues an agent can act on.
 */

import { checkContrast } from '#src/analysis/contrast.js';

/** All registered audit rules. Each has: name, severity, check function. */
export const RULES = [
  {
    rule: 'button-no-name',
    severity: 'error',
    description: 'Button has no accessible name (no text content or aria-label)',
    check: (node, details) => {
      if (node.tag !== 'button') return false;
      // Check all name sources: text content, aria-label, aria-labelledby, title
      const hasText = node.text && node.text.trim().length > 0;
      const attrs = details?.attributes || {};
      const hasAriaLabel = attrs['aria-label'] && attrs['aria-label'].trim();
      const hasAriaLabelledBy = !!attrs['aria-labelledby'];
      const hasTitle = attrs.title && attrs.title.trim();
      const hasVisibleText = details?.visibleText && details.visibleText.trim().length > 0;
      return !hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasVisibleText;
    },
  },
  {
    rule: 'missing-alt',
    severity: 'error',
    description: 'Image is missing alt attribute',
    check: (node, details) => {
      if (node.tag !== 'img') return false;
      return !details?.attributes?.alt;
    },
  },
  {
    rule: 'missing-form-label',
    severity: 'warning',
    description: 'Form input has no associated label (no aria-label, aria-labelledby, or <label for>)',
    check: (node, details) => {
      if (!['input', 'textarea', 'select'].includes(node.tag)) return false;
      const attrs = details?.attributes || {};
      const hasAriaLabel = attrs['aria-label'] && attrs['aria-label'].trim();
      const hasAriaLabelledBy = !!attrs['aria-labelledby'];
      // Check if the element has an id that a <label for> could reference.
      // We can't verify the label exists from capture data alone, but if the
      // element has an id AND the capture has a label element with matching for,
      // it's likely labeled. Conservative: if it has an id, reduce to info level.
      const hasId = !!attrs.id;
      const hasTitle = attrs.title && attrs.title.trim();
      // If it has aria-label, aria-labelledby, or title, it's labeled
      if (hasAriaLabel || hasAriaLabelledBy || hasTitle) return false;
      // If it has an id, a <label for> likely exists - don't flag (reduces FP)
      if (hasId) return false;
      // Placeholder alone is not a sufficient label per WCAG, but don't flag
      // if it's the only hint - the real issue is missing <label>, not missing aria
      return true;
    },
  },
  {
    rule: 'form-validation-error',
    severity: 'warning',
    description: 'Form input is in an error or invalid state',
    check: (node, details) => {
      if (!['input', 'textarea', 'select'].includes(node.tag)) return false;
      const attrs = details?.attributes || {};
      // aria-invalid="true" explicitly marks the field as invalid
      if (attrs['aria-invalid'] === 'true') return true;
      // required field with empty value
      if ('required' in attrs && (!attrs.value || !attrs.value.trim())) return true;
      return false;
    },
  },
  {
    rule: 'insufficient-contrast',
    // Severity is dynamic - set in auditNode based on AA vs AAA failure
    severity: 'error',
    description: 'Text has insufficient color contrast',
    check: (node, details) => {
      // Only check elements with visible text and computed styles
      if (!node.text?.trim()) return false;
      const styles = details?.computedStyles;
      if (!styles?.color || !styles?.backgroundColor) return false;
      const result = checkContrast(styles.color, styles.backgroundColor, styles.fontSize);
      if (!result) return false;
      // Pass both AA and AAA - no issue
      if (result.aa && result.aaa) return false;
      // Store result for auditNode to read severity and build description
      node._contrastResult = result;
      return true;
    },
  },
];

/**
 * Run all audit rules against a single node.
 * @param {object} node - flattened node from flattenNodes()
 * @param {object|null} details - DETAILS entry for this node
 * @returns {Array<{rule: string, severity: string, description: string, elementId: string, tag: string}>}
 */
export function auditNode(node, details) {
  const issues = [];
  for (const rule of RULES) {
    if (rule.check(node, details || { attributes: {} })) {
      // Contrast rule has dynamic severity based on AA vs AAA failure
      let severity = rule.severity;
      let description = rule.description;
      if (rule.rule === 'insufficient-contrast' && node._contrastResult) {
        const r = node._contrastResult;
        severity = r.aa ? 'warning' : 'error';
        const ratioStr = r.ratio.toFixed(1);
        const threshold = r.aa ? 'AAA' : 'AA';
        description = `Contrast ratio ${ratioStr}:1 fails WCAG ${threshold}`;
        delete node._contrastResult;
      }
      issues.push({ rule: rule.rule, severity, description, elementId: node.id, tag: node.tag });
    }
  }
  return issues;
}
