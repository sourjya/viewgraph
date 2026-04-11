/**
 * Element Diagnostics
 *
 * Analyzes a single DOM element for common issues: accessibility gaps,
 * missing test IDs, focus problems, and stacking context concerns.
 * Returns a flat list of warnings specific to that element.
 *
 * Used by the annotation panel to show contextual hints when the user
 * selects an element - connecting the annotation workflow to diagnostic
 * data without requiring the user to switch to the Inspect tab.
 *
 * @see lib/annotation-panel.js - consumer of these diagnostics
 */

/**
 * Analyze a single element and return diagnostic warnings.
 * @param {Element} el - The DOM element to analyze
 * @returns {Array<{ icon: string, text: string, category: string }>}
 */
export function diagnoseElement(el) {
  const hints = [];
  if (!el || !el.tagName) return hints;

  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  const isInteractive = el.matches('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]');

  // Accessibility checks
  if (tag === 'img' && !el.getAttribute('alt')) {
    hints.push({ icon: '\u26a0', text: 'Missing alt text', category: 'a11y' });
  }

  if (tag === 'button' || role === 'button') {
    const name = el.textContent?.trim() || el.getAttribute('aria-label') || '';
    if (!name) hints.push({ icon: '\u26a0', text: 'Button has no accessible name', category: 'a11y' });
  }

  if ((tag === 'input' || tag === 'textarea' || tag === 'select') && !el.getAttribute('disabled')) {
    const id = el.id;
    const hasLabel = id && el.closest('form')?.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    const wrappedInLabel = el.closest('label');
    if (!hasLabel && !hasAriaLabel && !wrappedInLabel) {
      hints.push({ icon: '\u26a0', text: 'Form input has no label', category: 'a11y' });
    }
  }

  if (isInteractive) {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel === '') {
      hints.push({ icon: '\u26a0', text: 'Empty aria-label (worse than none)', category: 'a11y' });
    }
  }

  // Test ID check
  if (isInteractive && !el.getAttribute('data-testid')) {
    hints.push({ icon: '\u2139', text: 'No data-testid', category: 'testid' });
  }

  // Focus check
  if (isInteractive && el.tabIndex < 0) {
    hints.push({ icon: '\u26a0', text: 'tabIndex=-1 (unreachable via Tab)', category: 'focus' });
  }

  // Stacking context check
  const cs = window.getComputedStyle(el);
  if (cs.position !== 'static' && cs.zIndex !== 'auto') {
    const z = parseInt(cs.zIndex, 10);
    if (z > 100) {
      hints.push({ icon: '\u2139', text: `z-index: ${z} (creates stacking context)`, category: 'stacking' });
    }
  }

  // Contrast hint for text elements
  if (cs.color && cs.backgroundColor) {
    const fg = parseRgb(cs.color);
    const bg = parseRgb(cs.backgroundColor);
    if (fg && bg && bg[3] > 0) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5 && el.textContent?.trim()) {
        hints.push({ icon: '\u26a0', text: `Low contrast (${ratio.toFixed(1)}:1)`, category: 'a11y' });
      }
    }
  }

  return hints;
}

/**
 * Parse an rgb/rgba string into [r, g, b, a].
 * @param {string} str
 * @returns {number[]|null}
 */
function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1];
}

/**
 * Calculate WCAG contrast ratio between two colors.
 * @param {number[]} fg - [r, g, b, a]
 * @param {number[]} bg - [r, g, b, a]
 * @returns {number}
 */
function contrastRatio(fg, bg) {
  const l1 = luminance(fg[0], fg[1], fg[2]);
  const l2 = luminance(bg[0], bg[1], bg[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Relative luminance per WCAG 2.0. */
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
