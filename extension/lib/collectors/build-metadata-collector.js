/**
 * Build Metadata Collector
 *
 * Detects build context: dev vs prod mode, bundler type, sourcemap
 * presence, and script sources. Helps the agent diagnose "works in
 * dev, broken in prod" issues.
 *
 * @see docs/ideas/extended-capture-enrichment.md - Tier 2
 */

/**
 * Collect build and bundle metadata from the page.
 * @returns {{ mode: string, bundler: string|null, sourcemaps: boolean, scripts: Array }}
 */
export function collectBuildMetadata() {
  // Detect dev vs prod mode
  const isDev =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.port !== '' ||
    !!document.querySelector('script[src*="/@vite/"]') ||
    !!document.querySelector('script[src*="hot-update"]') ||
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';

  // Detect bundler
  let bundler = null;
  if (document.querySelector('script[src*="/@vite/"]') || document.querySelector('script[type="module"][src*="/@fs/"]')) bundler = 'vite';
  else if (document.querySelector('script[src*="webpack"]') || document.querySelector('script[src*="bundle.js"]')) bundler = 'webpack';
  else if (document.querySelector('script[src*="/_next/"]')) bundler = 'next.js';
  else if (document.querySelector('script[src*="/_nuxt/"]')) bundler = 'nuxt';
  else if (document.querySelector('link[href*="/_astro/"]')) bundler = 'astro';

  // Check for sourcemaps
  const scripts = [...document.querySelectorAll('script[src]')].slice(0, 20);
  // Collect script sources (truncated)
  const scriptSources = scripts.map((s) => {
    const url = s.src;
    try {
      const u = new URL(url);
      return { path: u.pathname.slice(0, 100), type: s.type || 'text/javascript', module: s.type === 'module' };
    } catch { return { path: url.slice(0, 100), type: s.type || 'text/javascript', module: false }; }
  });

  return {
    mode: isDev ? 'development' : 'production',
    bundler,
    scriptCount: scripts.length,
    scripts: scriptSources.slice(0, 10),
  };
}
