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
  const width = window.innerWidth;
  const breakpoints = BREAKPOINTS.map((bp) => ({
    name: bp.name,
    px: bp.px,
    minWidth: window.matchMedia(`(min-width: ${bp.px}px)`).matches,
    maxWidth: window.matchMedia(`(max-width: ${bp.px}px)`).matches,
  }));

  // Determine active range name (highest min-width that matches)
  let activeRange = 'xs';
  for (const bp of breakpoints) {
    if (bp.minWidth && bp.px > 0) activeRange = bp.name;
  }

  return { viewport: { width }, breakpoints, activeRange };
}
