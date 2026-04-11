/**
 * Animation State Collector
 *
 * Detects active CSS animations and transitions on DOM elements using
 * the Web Animations API (`element.getAnimations()`). Identifies frozen
 * spinners, incomplete transitions, and elements mid-animation.
 *
 * @see docs/roadmap/roadmap.md - M12.5
 */

const ATTR = 'data-vg-annotate';
const MAX_ELEMENTS = 500;

/**
 * Collect active animations from the DOM.
 * @returns {{ animating: Array<{ selector: string, animations: Array<{ name: string, state: string, progress: number, duration: number }> }>, count: number }}
 */
export function collectAnimations() {
  const results = [];
  if (typeof document.getAnimations !== 'function') {
    return { animating: [], count: 0, supported: false };
  }

  const allAnimations = document.getAnimations();
  const byElement = new Map();

  for (const anim of allAnimations.slice(0, MAX_ELEMENTS)) {
    const el = anim.effect?.target;
    if (!el || el.closest?.(`[${ATTR}]`)) continue;

    if (!byElement.has(el)) byElement.set(el, []);
    byElement.get(el).push({
      name: anim.animationName || anim.transitionProperty || 'unknown',
      state: anim.playState,
      progress: anim.effect?.getComputedTiming?.()?.progress ?? null,
      duration: anim.effect?.getComputedTiming?.()?.duration ?? null,
    });
  }

  for (const [el, anims] of byElement) {
    results.push({
      selector: buildSelector(el),
      tag: el.tagName?.toLowerCase(),
      animations: anims,
    });
  }

  return {
    animating: results.slice(0, 50),
    count: results.length,
    running: allAnimations.filter((a) => a.playState === 'running').length,
    paused: allAnimations.filter((a) => a.playState === 'paused').length,
    pending: allAnimations.filter((a) => a.playState === 'idle' || a.pending).length,
    supported: true,
  };
}

/** Build a compact selector. */
function buildSelector(el) {
  const tag = el.tagName?.toLowerCase() || 'unknown';
  if (el.id) return `${tag}#${el.id}`;
  const testid = el.getAttribute?.('data-testid');
  if (testid) return `${tag}[data-testid="${testid}"]`;
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${cls}`;
}
