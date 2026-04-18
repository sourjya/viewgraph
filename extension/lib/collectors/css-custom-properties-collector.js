/**
 * CSS Custom Properties Collector
 *
 * Captures CSS custom properties (--variables) from :root and component scopes.
 * Helps agents fix design tokens instead of hardcoded values - when the agent
 * sees `color: #3b82f6`, this collector tells it the value comes from `var(--primary)`.
 *
 * Captures from:
 * 1. :root computed styles (global design tokens)
 * 2. Active stylesheets (all --var declarations)
 *
 * @see docs/ideas/extended-capture-enrichment.md - Tier 1
 */

/** Max properties to capture to prevent oversized output. */
const MAX_PROPERTIES = 100;

/**
 * Collect CSS custom properties from :root computed styles.
 * @returns {Array<{ name: string, value: string }>}
 */
function collectRootProperties() {
  const props = [];
  try {
    const rootStyles = window.getComputedStyle(document.documentElement);
    // getComputedStyle doesn't enumerate custom properties directly.
    // We need to check stylesheets for declared --vars, then read their computed values.
    const declared = new Set();
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root' || rule.selectorText === 'html') {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) declared.add(prop);
            }
          }
        }
      } catch { /* cross-origin stylesheet - skip */ }
    }
    for (const name of [...declared].slice(0, MAX_PROPERTIES)) {
      const value = rootStyles.getPropertyValue(name).trim();
      if (value) props.push({ name, value });
    }
  } catch { /* stylesheet access error */ }
  return props;
}

/**
 * Collect all CSS custom property declarations from stylesheets.
 * Groups by selector scope.
 * @returns {Array<{ selector: string, properties: Array<{ name: string, value: string }> }>}
 */
function collectAllDeclarations() {
  const scopes = [];
  let total = 0;
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (total >= MAX_PROPERTIES) break;
          if (!rule.style) continue;
          const props = [];
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--')) {
              props.push({ name: prop, value: rule.style.getPropertyValue(prop).trim() });
              total++;
              if (total >= MAX_PROPERTIES) break;
            }
          }
          if (props.length > 0) {
            scopes.push({ selector: rule.selectorText || ':root', properties: props });
          }
        }
      } catch { /* cross-origin stylesheet */ }
    }
  } catch { /* no stylesheets */ }
  return scopes;
}

/**
 * Collect CSS custom properties from the page.
 * @returns {{ root: Array, scopes: Array, summary: { rootCount: number, totalDeclarations: number, scopeCount: number } }}
 */
export function collectCSSCustomProperties() {
  const root = collectRootProperties();
  const scopes = collectAllDeclarations();
  const totalDeclarations = scopes.reduce((sum, s) => sum + s.properties.length, 0);

  return {
    root,
    scopes,
    summary: { rootCount: root.length, totalDeclarations, scopeCount: scopes.length },
  };
}
