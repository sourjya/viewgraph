/**
 * Breakpoint Collector
 *
 * Reports which CSS media query breakpoints are active at the current
 * viewport width. Uses window.matchMedia() against standard breakpoints
 * (Bootstrap/Tailwind conventions).
 *
 * Helps debug responsive layout issues: "viewport is 768px, md is active,
 * lg is not" tells the agent exactly which media query to look at.
 *
 * @see docs/roadmap/roadmap.md M12.6
 */

/** Standard breakpoints (Bootstrap/Tailwind conventions). */
const BREAKPOINTS = [
  { name: 'xs', px: 0 },
  { name: 'sm', px: 576 },
  { name: 'md', px: 768 },
  { name: 'lg', px: 992 },
  { name: 'xl', px: 1200 },
  { name: '2xl', px: 1400 },
];

/**
 * Collect active breakpoint state.
 * @returns {{ viewport: { width: number }, breakpoints: Array, activeRange: string }}
 */
export function collectBreakpoints() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  // Guard: matchMedia not available in jsdom/test environments
  const hasMQ = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const mq = hasMQ ? (q) => window.matchMedia(q).matches : () => false;
  const breakpoints = BREAKPOINTS.map((bp) => ({
    name: bp.name,
    px: bp.px,
    minWidth: mq(`(min-width: ${bp.px}px)`),
    maxWidth: mq(`(max-width: ${bp.px}px)`),
  }));

  // Determine active range name (highest min-width that matches)
  let activeRange = 'xs';
  for (const bp of breakpoints) {
    if (bp.minWidth && bp.px > 0) activeRange = bp.name;
  }

  return { viewport: { width }, breakpoints, activeRange };
}

/**
 * Extract active media queries from loaded stylesheets.
 * Reads `@media` rules from document.styleSheets and reports which match.
 * @returns {{ active: string[], inactive: string[], total: number }}
 */
export function collectMediaQueries() {
  const active = new Set();
  const inactive = new Set();
  const hasMQ = typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.type === CSSRule.MEDIA_RULE) {
            const mq = rule.conditionText || rule.media?.mediaText;
            if (!mq) continue;
            if (hasMQ && window.matchMedia(mq).matches) active.add(mq);
            else inactive.add(mq);
          }
        }
      } catch { /* cross-origin stylesheet - skip */ }
    }
  } catch { /* no stylesheets */ }

  return {
    active: [...active].slice(0, 30),
    inactive: [...inactive].slice(0, 30),
    total: active.size + inactive.size,
  };
}
