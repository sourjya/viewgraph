/**
 * Bulk Capture Experiment - Orchestrator
 *
 * CLI entry point that ties together the site list, bundle builder,
 * capture runner, and analysis module. Runs all 150 sites through
 * ViewGraph's capture pipeline with configurable concurrency.
 *
 * Usage:
 *   node run.js [options]
 *
 * Options:
 *   --set X          Experiment set: a (breadth), b (depth), c (real-world)
 *   --all-sets       Run all 3 experiment sets sequentially
 *   --sites N        Capture first N sites (default: all in set)
 *   --concurrency N  Parallel browser pages (default: 3)
 *   --category X     Filter to one category (e.g., "news", "spa")
 *   --resume         Skip sites that already have results
 *   --timeout N      Per-site timeout in seconds (default: 30)
 *   --analyze-only   Skip captures, just re-run analysis on existing results
 *   --run-dir PATH   Use specific results directory (for --analyze-only)
 */

import puppeteer from 'puppeteer';
import { mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { getSites, getDiversityStats, EXPERIMENT_SET_NAMES } from './sites.js';
import { buildBundle } from './bundle.js';
import { captureSite } from './capture.js';
import { analyzeAll } from './analyze.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default viewport for all captures. */
const VIEWPORT = { width: 1280, height: 720 };

/** Default concurrency (parallel browser pages). */
const DEFAULT_CONCURRENCY = 3;

/** Default per-site timeout in seconds. */
const DEFAULT_TIMEOUT_S = 30;

/**
 * Realistic user agent string. Headless Puppeteer's default UA contains
 * "HeadlessChrome" which triggers bot detection on most major sites
 * (Cloudflare, Akamai, PerimeterX, DataDome). We use a real Chrome UA.
 */
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Chrome launch args that reduce bot-detection surface area.
 * - disable-blink-features=AutomationControlled: removes the
 *   navigator.webdriver flag that bot detectors check
 * - window-size: some detectors flag zero-size or unusual viewports
 * - disable-features=IsolateOrigins,site-per-process: reduces
 *   overhead for cross-origin navigations
 */
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
];

// ──────────────────────────────────────────────
// CLI Argument Parsing
// ──────────────────────────────────────────────

/**
 * Parse CLI arguments into an options object.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {object}
 */
function parseArgs(argv) {
  const opts = {
    sites: null,
    concurrency: DEFAULT_CONCURRENCY,
    category: null,
    resume: false,
    timeout: DEFAULT_TIMEOUT_S,
    analyzeOnly: false,
    runDir: null,
    set: null,
    allSets: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sites' && argv[i + 1]) opts.sites = parseInt(argv[++i], 10);
    else if (arg === '--concurrency' && argv[i + 1]) opts.concurrency = parseInt(argv[++i], 10);
    else if (arg === '--category' && argv[i + 1]) opts.category = argv[++i];
    else if (arg === '--resume') opts.resume = true;
    else if (arg === '--timeout' && argv[i + 1]) opts.timeout = parseInt(argv[++i], 10);
    else if (arg === '--analyze-only') opts.analyzeOnly = true;
    else if (arg === '--run-dir' && argv[i + 1]) opts.runDir = argv[++i];
    else if (arg === '--set' && argv[i + 1]) opts.set = argv[++i];
    else if (arg === '--all-sets') opts.allSets = true;
  }
  return opts;
}

// ──────────────────────────────────────────────
// Worker Pool
// ──────────────────────────────────────────────

/**
 * Process sites through a pool of concurrent browser pages.
 * @param {import('puppeteer').Browser} browser
 * @param {Array} sites - Site list entries
 * @param {string} sitesDir - Base output directory for site results
 * @param {string} bundle - Injectable script string
 * @param {object} opts - CLI options
 * @returns {Promise<object[]>} Array of per-site results
 */
async function runPool(browser, sites, sitesDir, bundle, opts) {
  const results = [];
  let completed = 0;
  let idx = 0;

  /**
   * Worker function - takes sites from the queue until empty.
   */
  async function worker() {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await applyPageStealth(page);
    // Block common resource-heavy requests to speed up captures
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'media' || type === 'font') req.abort();
      else req.continue();
    });

    while (idx < sites.length) {
      const siteIdx = idx++;
      const site = sites[siteIdx];
      const hostname = safeHostname(site.url);
      const outputDir = join(sitesDir, hostname);

      // Resume support: skip if results already exist
      if (opts.resume && existsSync(join(outputDir, 'metrics.json'))) {
        completed++;
        log(`[${completed}/${sites.length}] SKIP ${site.url} (resume)`);
        continue;
      }

      log(`[${completed + 1}/${sites.length}] ${site.url}`);

      try {
        // Per-site timeout wrapping the entire capture
        const result = await Promise.race([
          captureSite(page, site.url, outputDir, bundle),
          timeout(opts.timeout * 1000, site.url),
        ]);
        results.push(result);
      } catch (err) {
        // Timeout or unexpected error
        const result = {
          url: site.url, status: 'timeout', errors: [{ phase: 'overall', category: 'timeout', message: err.message }],
          timing: {}, metrics: { viewgraph: null, snapshot: null, screenshot: null },
        };
        results.push(result);
        await mkdir(outputDir, { recursive: true });
        await writeFile(join(outputDir, 'metrics.json'), JSON.stringify(result, null, 2));
      }

      completed++;
      const last = results[results.length - 1];
      const status = last.status === 'ok' ? 'OK' : last.status.toUpperCase();
      log(`  -> ${status} (${Object.values(last.timing).reduce((a, b) => a + (b || 0), 0)}ms total)`);
    }

    await page.close();
  }

  // Launch N workers
  const workers = Array.from({ length: opts.concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Create a timeout promise that rejects after ms milliseconds.
 */
function timeout(ms, url) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms for ${url}`)), ms);
  });
}

/**
 * Convert a URL to a safe directory name.
 */
function safeHostname(url) {
  try { return new URL(url).hostname.replace(/\./g, '-'); }
  catch { return 'unknown'; }
}

/**
 * Apply stealth measures to a Puppeteer page to reduce bot detection.
 *
 * Most bot detectors check a combination of:
 * - navigator.webdriver === true (set by automation)
 * - User-Agent containing "HeadlessChrome"
 * - Missing browser plugins/languages
 * - Chrome-specific objects missing (window.chrome)
 *
 * We patch these in the page context before any site JS runs.
 * This won't beat sophisticated fingerprinting (canvas, WebGL hashes)
 * but handles the common Cloudflare/Akamai/DataDome checks.
 *
 * @param {import('puppeteer').Page} page
 */
async function applyPageStealth(page) {
  await page.setUserAgent(USER_AGENT);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  // Run before any page script to patch detectable properties
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Fake plugins array (headless has 0 plugins)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Fake languages (headless sometimes has empty array)
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // Add window.chrome object (missing in headless)
    if (!window.chrome) {
      window.chrome = { runtime: {} };
    }

    // Patch permissions query to not reveal automation
    const origQuery = window.navigator.permissions?.query;
    if (origQuery) {
      window.navigator.permissions.query = (params) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : origQuery(params);
    }
  });
}

/**
 * Log to stderr (stdout is reserved for structured output).
 */
function log(msg) {
  process.stderr.write(`${msg}\n`);
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Test Run Index
// ──────────────────────────────────────────────

/**
 * Append this run's summary to results/index.json for cross-run comparison.
 * Each entry records the timestamp, set, key accuracy metrics, and the
 * results directory path so you can compare runs over time.
 *
 * @param {string} resultsDir - This run's results directory
 * @param {object} opts - CLI options (set, concurrency, etc.)
 * @param {object} report - The analysis report
 */
async function updateIndex(resultsDir, opts, report) {
  const indexPath = join(__dirname, 'results', 'index.json');
  let index = { runs: [] };
  try {
    const raw = await readFile(indexPath, 'utf-8');
    index = JSON.parse(raw);
  } catch { /* first run, start fresh */ }

  const a = report.accuracy?.overall || {};
  const d = report.accuracy?.dimensions || {};
  const entry = {
    timestamp: new Date().toISOString(),
    dir: resultsDir,
    set: opts.set || 'full',
    totalSites: report.totalSites,
    cleanSites: report.cleanSites ?? report.totalSites,
    sitesWithAccuracy: report.sitesWithAccuracy,
    excludedSites: report.excludedSites ?? 0,
    composite: { mean: a.mean, median: a.median, p5: a.p5, p95: a.p95 },
    dimensions: {},
  };
  for (const [dim, stats] of Object.entries(d)) {
    entry.dimensions[dim] = { mean: stats.mean, median: stats.median };
  }

  index.runs.push(entry);
  await mkdir(join(__dirname, 'results'), { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2));
  log(`  Index updated: ${index.runs.length} runs tracked`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // --all-sets: run sets A, B, C sequentially, then print combined summary
  if (opts.allSets) {
    log('ViewGraph Bulk Capture Experiment - ALL SETS\n');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseDir = join(__dirname, 'results', `run-${ts}`);
    const reports = {};

    for (const setName of EXPERIMENT_SET_NAMES) {
      log(`\n${'='.repeat(60)}`);
      log(`  SET ${setName.toUpperCase()}: ${setName === 'a' ? 'Breadth' : setName === 'b' ? 'Depth' : 'Real-world'}`);
      log(`${'='.repeat(60)}\n`);
      reports[setName] = await runOneSet({ ...opts, set: setName, runDir: join(baseDir, `set-${setName}`) });
    }

    // Write combined summary
    const combined = { timestamp: new Date().toISOString(), sets: {} };
    for (const [name, report] of Object.entries(reports)) {
      combined.sets[name] = {
        sites: report.totalSites,
        overallAccuracy: report.accuracy?.overall ?? null,
        botBlocked: report.operational?.failures?.botDetection?.blockedCount ?? 0,
      };
    }
    await writeFile(join(baseDir, 'combined-summary.json'), JSON.stringify(combined, null, 2));
    log(`\nCombined summary: ${baseDir}/combined-summary.json`);
    for (const [name, data] of Object.entries(combined.sets)) {
      const acc = data.overallAccuracy?.median;
      log(`  Set ${name.toUpperCase()}: ${data.sites} sites, accuracy median ${acc != null ? (acc * 100).toFixed(1) + '%' : 'N/A'}, ${data.botBlocked} blocked`);
    }
    return;
  }

  // Single set or full pool
  await runOneSet(opts);
}

/**
 * Run one experiment set (or the full pool if no set specified).
 * @param {object} opts - Parsed CLI options
 * @returns {Promise<object>} The analysis report
 */
async function runOneSet(opts) {
  const siteList = getSites({ set: opts.set, category: opts.category, limit: opts.sites });
  const setLabel = opts.set ? `Set ${opts.set.toUpperCase()}` : 'Full pool';

  log(`ViewGraph Bulk Capture Experiment - ${setLabel}`);
  log(`Sites: ${siteList.length} | Concurrency: ${opts.concurrency} | Timeout: ${opts.timeout}s`);
  if (opts.set) {
    const stats = getDiversityStats(opts.set);
    log(`Diversity: ${Object.keys(stats.rendering).length} rendering types, ${Object.keys(stats.script).length} scripts, ${Object.keys(stats.category).length} categories`);
  }

  // Determine results directory
  let resultsDir;
  if (opts.runDir) {
    resultsDir = opts.runDir;
  } else {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    resultsDir = join(__dirname, 'results', `run-${ts}`);
  }

  if (opts.analyzeOnly) {
    log(`\nAnalyze-only mode: ${resultsDir}`);
    const report = await analyzeAll(resultsDir, siteList);
    log(`Report written: ${report.totalSites} sites analyzed`);
    return report;
  }

  // Create results directory structure
  const sitesDir = join(resultsDir, 'sites');
  await mkdir(sitesDir, { recursive: true });

  // Build the injectable bundle from extension sources
  log('\nBuilding ViewGraph bundle from extension sources...');
  const bundle = await buildBundle();
  log(`Bundle size: ${(bundle.length / 1024).toFixed(1)}KB`);

  // Save run metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    set: opts.set || 'full',
    siteCount: siteList.length,
    concurrency: opts.concurrency,
    timeout: opts.timeout,
    viewport: VIEWPORT,
    category: opts.category,
    resume: opts.resume,
    diversity: opts.set ? getDiversityStats(opts.set) : null,
  };
  await writeFile(join(resultsDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // Launch browser
  log('\nLaunching browser...');
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: BROWSER_ARGS,
  });

  // Handle graceful shutdown
  let shuttingDown = false;
  const cleanup = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log('\nShutting down...');
    await browser.close();
    process.exit(1);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Run captures
  log(`\nCapturing ${siteList.length} sites...\n`);
  const startTime = Date.now();
  await runPool(browser, siteList, sitesDir, bundle, opts);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nCaptures complete in ${elapsed}s`);

  await browser.close();

  // Run analysis
  log('\nAnalyzing results...');
  const report = await analyzeAll(resultsDir, siteList);
  log(`\nDone. Results in: ${resultsDir}`);
  log(`  Total sites: ${report.totalSites}`);
  log(`  Sites with accuracy data: ${report.sitesWithAccuracy}`);
  if (report.accuracy?.overall) {
    log(`  Overall accuracy: median ${(report.accuracy.overall.median * 100).toFixed(1)}%, mean ${(report.accuracy.overall.mean * 100).toFixed(1)}%`);
    const dims = report.accuracy.dimensions;
    log(`  Selector accuracy: ${(dims.selectorAccuracy?.median * 100 || 0).toFixed(1)}%`);
    log(`  Bbox accuracy (5px): ${(dims.bboxAccuracy?.median * 100 || 0).toFixed(1)}%`);
    log(`  Interactive recall: ${(dims.interactiveRecall?.median * 100 || 0).toFixed(1)}%`);
    log(`  Text match rate: ${(dims.textAccuracy?.median * 100 || 0).toFixed(1)}%`);
  }
  const sr = report.operational?.successRates;
  if (sr) {
    log(`  Navigation success: ${sr.navigation?.count}/${sr.total}`);
    log(`  VG capture success: ${sr.viewgraph?.count}/${sr.total}`);
  }

  // Update the test run index for cross-run comparison
  await updateIndex(resultsDir, opts, report);

  return report;
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
