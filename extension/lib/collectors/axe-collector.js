/**
 * Axe-Core Accessibility Collector
 *
 * Runs axe-core accessibility scan on the current page. axe-core is loaded
 * lazily from a web-accessible resource (public/axe.min.js) instead of being
 * bundled into the content script. This saves ~550KB from the initial bundle.
 *
 * If axe-core fails to load or run, returns null so the capture pipeline
 * falls back to ViewGraph's built-in a11y rules.
 *
 * @see docs/architecture/viewgraph-v3-format-agentic-enhancements.md
 */

/** Maximum violations to include (cap for capture size). */
const MAX_VIOLATIONS = 50;

/** Maximum nodes per violation (cap for capture size). */
const MAX_NODES_PER = 5;

/** Whether axe-core has been injected into the page. */
let _axeLoaded = false;

/**
 * Inject axe-core from the extension's web-accessible resource.
 * Only injects once per page load. Uses script tag injection since
 * content scripts in MV3 must be single files (can't code-split).
 * @returns {Promise<boolean>} true if axe is available
 */
async function ensureAxeLoaded() {
  if (_axeLoaded && typeof window.axe !== 'undefined') return true;

  try {
    // Try web-accessible resource first (no bundling, ~550KB saved)
    const url = chrome.runtime.getURL('axe.min.js');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => { _axeLoaded = true; resolve(); };
      script.onerror = reject;
      (document.head || document.documentElement).appendChild(script);
    });
    return typeof window.axe !== 'undefined';
  } catch {
    // Fallback: try dynamic import (bundled version, if available)
    try {
      const mod = await import('axe-core');
      if (mod.default?.run) { _axeLoaded = true; return true; }
    } catch { /* neither method available */ }
    return false;
  }
}

/**
 * Run axe-core scan and return structured results.
 * Returns null if axe-core is unavailable or scan fails.
 * @returns {Promise<object|null>}
 */
export async function collectAxeResults() {
  try {
    const loaded = await ensureAxeLoaded();
    if (!loaded) return null;

    const axeInstance = window.axe;
    const results = await axeInstance.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
      resultTypes: ['violations', 'passes', 'incomplete'],
    });

    return {
      violations: results.violations.slice(0, MAX_VIOLATIONS).map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        tags: v.tags.filter((t) => t.startsWith('wcag')),
        nodes: v.nodes.slice(0, MAX_NODES_PER).map((n) => ({
          target: n.target?.[0] || '',
          html: (n.html || '').slice(0, 200),
          failureSummary: (n.failureSummary || '').slice(0, 200),
        })),
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      source: 'axe-core (lazy-loaded from web-accessible resource)',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
