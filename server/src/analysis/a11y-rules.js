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

/** All registered audit rules. Each has: name, severity, check function. */
export const RULES = [
  {
    rule: 'button-no-name',
    severity: 'error',
    description: 'Button has no accessible name (no text content or aria-label)',
    check: (node, details) => {
      if (node.tag !== 'button') return false;
      const hasText = node.text && node.text.trim().length > 0;
      const hasAriaLabel = details?.attributes?.['aria-label'];
      return !hasText && !hasAriaLabel;
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
    description: 'Form input has no associated label (no aria-label or aria-labelledby)',
    check: (node, details) => {
      if (!['input', 'textarea', 'select'].includes(node.tag)) return false;
      const hasAriaLabel = details?.attributes?.['aria-label'];
      const hasAriaLabelledBy = details?.attributes?.['aria-labelledby'];
      return !hasAriaLabel && !hasAriaLabelledBy;
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
      issues.push({
        rule: rule.rule,
        severity: rule.severity,
        description: rule.description,
        elementId: node.id,
        tag: node.tag,
      });
    }
  }
  return issues;
}
