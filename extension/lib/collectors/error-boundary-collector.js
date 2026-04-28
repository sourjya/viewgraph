/**
 * Error Boundary State Collector
 *
 * Detects React components in error fallback mode by walking the fiber tree.
 * When a React error boundary catches an error, the component tree below it
 * renders a fallback UI. This collector finds those boundaries so the agent
 * knows a crash happened even if the page "looks fine."
 *
 * Also detects Vue error handler state and generic error-related DOM patterns.
 *
 * @see docs/ideas/extended-capture-enrichment.md - Tier 2
 */

/**
 * Collect error boundary state from the page.
 * @returns {{ boundaries: Array, framework: string }}
 */
export function collectErrorBoundaries() {
  const boundaries = [];

  // React: walk fiber tree looking for components with didCatch state
  const reactRoot = document.querySelector('[data-reactroot]') || document.getElementById('root') || document.getElementById('__next');
  if (reactRoot?._reactRootContainer || reactRoot?.__reactFiber$) {
    const fiber = reactRoot._reactRootContainer?._internalRoot?.current || findFiber(reactRoot);
    if (fiber) {
      walkFiber(fiber, (node) => {
        // Error boundaries have a stateNode with componentDidCatch
        if (node.stateNode?.componentDidCatch && node.memoizedState?.isError) {
          boundaries.push({
            component: node.type?.displayName || node.type?.name || 'Unknown',
            hasError: true,
            framework: 'react',
          });
        }
      });
    }
    if (boundaries.length > 0) return { boundaries, framework: 'react' };
  }

  // Generic: look for common error fallback patterns in DOM
  const errorPatterns = [
    '[data-error-boundary]',
    '[role="alert"]',
    '.error-boundary',
    '.error-fallback',
    '.error-page',
  ];
  for (const selector of errorPatterns) {
    for (const el of document.querySelectorAll(selector)) {
      boundaries.push({
        selector,
        text: el.textContent?.trim().slice(0, 100) || '',
        framework: 'generic',
      });
    }
  }

  return { boundaries, framework: boundaries.length > 0 ? 'generic' : 'none' };
}

/** Find React fiber from a DOM element. */
function findFiber(el) {
  if (!el) return null;
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  return key ? el[key] : null;
}

/** Walk a React fiber tree, calling fn on each node. */
function walkFiber(fiber, fn, depth = 0) {
  if (!fiber || depth > 50) return;
  fn(fiber);
  if (fiber.child) walkFiber(fiber.child, fn, depth + 1);
  if (fiber.sibling) walkFiber(fiber.sibling, fn, depth);
}
