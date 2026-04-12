/**
 * Analysis Module - Accuracy-Focused
 *
 * Reads per-site metrics.json files (which now include groundTruth and
 * accuracy data from the in-page measurement) and computes aggregate
 * accuracy statistics across all sites.
 *
 * The accuracy model has 7 dimensions, each producing a 0-1 score:
 * 1. Element recall     - visible DOM elements captured by VG
 * 2. Testid recall      - data-testid elements captured
 * 3. Interactive recall  - buttons/links/inputs captured
 * 4. Selector accuracy  - VG selectors resolve to real DOM elements
 * 5. Bbox accuracy      - VG bounding boxes match real positions
 * 6. Text accuracy      - VG visibleText matches real innerText
 * 7. Semantic recall    - landmark/structural elements captured
 *
 * Overall accuracy = weighted combination of all 7 dimensions.
 */

import { readFile, readdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';

// ──────────────────────────────────────────────
// Weights for overall accuracy score
// ──────────────────────────────────────────────

/**
 * Dimension weights for the composite accuracy score.
 * Testid and interactive recall matter most for agent workflows.
 * Selector accuracy matters because agents use selectors to find_source.
 * Bbox matters for layout auditing. Text matters for content matching.
 */
const WEIGHTS = {
  testidRecall: 0.20,
  interactiveRecall: 0.20,
  selectorAccuracy: 0.20,
  bboxAccuracy: 0.15,
  textAccuracy: 0.10,
  semanticRecall: 0.10,
  elementRecall: 0.05,
};

// ──────────────────────────────────────────────
// Core analysis
// ──────────────────────────────────────────────

/**
 * Analyze all site results and produce the accuracy report.
 * @param {string} resultsDir - Path to the run results directory
 * @param {Array} siteList - Original site list with category/complexity
 * @returns {Promise<object>} Full report object
 */
export async function analyzeAll(resultsDir, siteList) {
  const sitesDir = join(resultsDir, 'sites');
  const allMetrics = await loadAllMetrics(sitesDir);
  enrichWithSiteInfo(allMetrics, siteList);

  // Flag sites that should be excluded from accuracy calculations:
  // bot-blocked (captcha pages), CSP-blocked (inject failed), nav failures
  const excluded = allMetrics.filter((m) =>
    m.botDetection?.blocked ||
    m.status === 'inject-failed' ||
    m.status === 'nav-failed');
  const clean = allMetrics.filter((m) =>
    !m.botDetection?.blocked &&
    m.status !== 'inject-failed' &&
    m.status !== 'nav-failed');

  // Split clean sites into those with accuracy data vs without
  const withAccuracy = clean.filter((m) => m.accuracy);
  const withGt = clean.filter((m) => m.groundTruth);

  const report = {
    timestamp: new Date().toISOString(),
    totalSites: allMetrics.length,
    excludedSites: excluded.length,
    cleanSites: clean.length,
    sitesWithAccuracy: withAccuracy.length,
    excludedReasons: buildExcludedReasons(excluded),
    weights: WEIGHTS,

    // Top-level accuracy scorecard (clean sites only)
    accuracy: buildAccuracyScorecard(withAccuracy),

    // Per-dimension deep dives
    dimensions: {
      elementRecall: buildElementRecallStats(withAccuracy, withGt),
      testidRecall: buildDimensionStats(withAccuracy, 'testidRecall', 'recall'),
      interactiveRecall: buildDimensionStats(withAccuracy, 'interactiveRecall', 'recall'),
      selectorAccuracy: buildDimensionStats(withAccuracy, 'selectorAccuracy', 'accuracy'),
      bboxAccuracy: buildBboxStats(withAccuracy),
      textAccuracy: buildTextStats(withAccuracy),
      semanticRecall: buildDimensionStats(withAccuracy, 'semanticRecall', 'recall'),
    },

    // Ground truth summary
    groundTruth: buildGroundTruthSummary(withGt),

    // Breakdowns
    byCategory: buildCategoryAccuracy(withAccuracy),
    byComplexity: buildComplexityAccuracy(withAccuracy),
    byRendering: buildGroupedAccuracy(withAccuracy, 'rendering'),
    byScript: buildGroupedAccuracy(withAccuracy, 'script'),
    byA11y: buildGroupedAccuracy(withAccuracy, 'a11y'),

    // Operational metrics (timing, sizes, failures)
    operational: {
      timing: buildTimingStats(allMetrics),
      sizes: buildSizeStats(allMetrics),
      successRates: buildSuccessRates(allMetrics),
      failures: buildFailureAnalysis(allMetrics),
    },

    // Investigation targets
    worstSites: buildWorstSites(withAccuracy),
    bestSites: buildBestSites(withAccuracy),
  };

  await writeFile(join(resultsDir, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(resultsDir, 'report.md'), formatMarkdown(report));
  return report;
}

// ──────────────────────────────────────────────
// Accuracy Scorecard
// ──────────────────────────────────────────────

/**
 * Compute the top-level accuracy scorecard: per-dimension scores
 * and the weighted composite score, aggregated across all sites.
 */
function buildAccuracyScorecard(metrics) {
  const scores = metrics.map((m) => siteAccuracyScore(m.accuracy));
  const sorted = scores.map((s) => s.overall).sort((a, b) => a - b);

  const dimensionScores = {};
  for (const dim of Object.keys(WEIGHTS)) {
    const vals = scores.map((s) => s[dim]).sort((a, b) => a - b);
    dimensionScores[dim] = {
      mean: round(mean(vals)),
      median: round(percentile(vals, 0.5)),
      p5: round(percentile(vals, 0.05)),
      p95: round(percentile(vals, 0.95)),
      weight: WEIGHTS[dim],
    };
  }

  return {
    overall: {
      mean: round(mean(sorted)),
      median: round(percentile(sorted, 0.5)),
      p5: round(percentile(sorted, 0.05)),
      p95: round(percentile(sorted, 0.95)),
    },
    dimensions: dimensionScores,
  };
}

/**
 * Compute per-site accuracy scores across all dimensions.
 * Returns an object with a 0-1 score per dimension + weighted overall.
 */
function siteAccuracyScore(accuracy) {
  const scores = {
    elementRecall: 0,
    testidRecall: accuracy.testidRecall?.recall ?? 1,
    interactiveRecall: accuracy.interactiveRecall?.recall ?? 1,
    selectorAccuracy: accuracy.selectorAccuracy?.accuracy ?? 1,
    bboxAccuracy: accuracy.bboxAccuracy?.pctWithin5px ?? 1,
    textAccuracy: accuracy.textAccuracy?.matchRate ?? 1,
    semanticRecall: accuracy.semanticRecall?.recall ?? 1,
  };

  // Element recall needs ground truth; use VG captured count as proxy
  // (the real recall is computed in the dimension deep-dive)
  scores.elementRecall = scores.selectorAccuracy;

  let overall = 0;
  for (const [dim, weight] of Object.entries(WEIGHTS)) {
    overall += (scores[dim] || 0) * weight;
  }
  scores.overall = round(overall);
  return scores;
}

// ──────────────────────────────────────────────
// Per-Dimension Deep Dives
// ──────────────────────────────────────────────

/**
 * Element recall: VG captured vs ground-truth visible elements.
 */
function buildElementRecallStats(withAccuracy, withGt) {
  const pairs = withGt.filter((m) => m.accuracy);
  const recalls = pairs.map((m) => {
    const gt = m.groundTruth.visibleElements;
    const vg = m.accuracy.elementRecall.vgCaptured;
    return gt > 0 ? Math.min(vg / gt, 1) : 1;
  }).sort((a, b) => a - b);

  return {
    sites: pairs.length,
    recall: distStats(recalls),
    // How many visible elements does VG typically capture
    vgNodeCounts: distStats(pairs.map((m) => m.accuracy.elementRecall.vgCaptured).sort((a, b) => a - b)),
    gtVisibleCounts: distStats(pairs.map((m) => m.groundTruth.visibleElements).sort((a, b) => a - b)),
  };
}

/**
 * Generic dimension stats builder for dimensions with a single recall/accuracy field.
 */
function buildDimensionStats(metrics, dimension, field) {
  const values = metrics.map((m) => m.accuracy[dimension]?.[field] ?? null).filter((v) => v !== null).sort((a, b) => a - b);
  const result = { sites: values.length, ...distStats(values) };

  // Add counts for context
  if (dimension === 'testidRecall') {
    const domTotals = metrics.map((m) => m.accuracy.testidRecall?.domVisible ?? 0);
    result.medianDomTestids = percentile(domTotals.sort((a, b) => a - b), 0.5);
    result.sitesWithZeroTestids = domTotals.filter((v) => v === 0).length;
  }
  if (dimension === 'interactiveRecall') {
    const domTotals = metrics.map((m) => m.accuracy.interactiveRecall?.domVisible ?? 0);
    result.medianDomInteractive = percentile(domTotals.sort((a, b) => a - b), 0.5);
  }

  return result;
}

/**
 * Bbox accuracy deep dive: deviation distribution.
 */
function buildBboxStats(metrics) {
  const within5 = metrics.map((m) => m.accuracy.bboxAccuracy?.pctWithin5px ?? null).filter((v) => v !== null).sort((a, b) => a - b);
  const within10 = metrics.map((m) => m.accuracy.bboxAccuracy?.pctWithin10px ?? null).filter((v) => v !== null).sort((a, b) => a - b);
  const meanDevs = metrics.map((m) => m.accuracy.bboxAccuracy?.meanDeviation ?? null).filter((v) => v !== null).sort((a, b) => a - b);

  return {
    sites: within5.length,
    within5px: distStats(within5),
    within10px: distStats(within10),
    meanDeviation: distStats(meanDevs),
  };
}

/**
 * Text accuracy deep dive.
 */
function buildTextStats(metrics) {
  const exact = metrics.map((m) => m.accuracy.textAccuracy?.exactRate ?? null).filter((v) => v !== null).sort((a, b) => a - b);
  const match = metrics.map((m) => m.accuracy.textAccuracy?.matchRate ?? null).filter((v) => v !== null).sort((a, b) => a - b);
  const empty = metrics.map((m) => m.accuracy.textAccuracy?.empty ?? 0);

  return {
    sites: exact.length,
    exactMatchRate: distStats(exact),
    matchRate: distStats(match),
    totalEmptyText: empty.reduce((a, b) => a + b, 0),
  };
}

// ──────────────────────────────────────────────
// Ground Truth Summary
// ──────────────────────────────────────────────

/**
 * Summarize what the ground truth collector found across all sites.
 */
function buildGroundTruthSummary(withGt) {
  const fields = ['totalElements', 'visibleElements', 'hiddenElements', 'interactiveElements',
    'semanticElements', 'elementsWithTestid', 'elementsWithRole', 'elementsWithAriaLabel',
    'elementsWithText', 'shadowRoots'];

  const summary = {};
  for (const field of fields) {
    const vals = withGt.map((m) => m.groundTruth[field] || 0).sort((a, b) => a - b);
    summary[field] = { mean: Math.round(mean(vals)), median: percentile(vals, 0.5), p95: percentile(vals, 0.95), total: vals.reduce((a, b) => a + b, 0) };
  }

  // Visibility ratio: what fraction of DOM elements are actually visible
  const visRatios = withGt.map((m) => {
    const t = m.groundTruth.totalElements;
    return t > 0 ? m.groundTruth.visibleElements / t : 0;
  }).sort((a, b) => a - b);
  summary.visibilityRatio = distStats(visRatios);

  return summary;
}

// ──────────────────────────────────────────────
// Breakdowns
// ──────────────────────────────────────────────

/**
 * Accuracy broken down by site category.
 */
function buildCategoryAccuracy(metrics) {
  return buildGroupedAccuracy(metrics, 'category');
}

/**
 * Accuracy broken down by site complexity.
 */
function buildComplexityAccuracy(metrics) {
  return buildGroupedAccuracy(metrics, 'complexity');
}

/**
 * Generic grouped accuracy builder.
 */
function buildGroupedAccuracy(metrics, groupField) {
  const groups = {};
  for (const m of metrics) {
    const key = m[groupField] || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  return Object.entries(groups).map(([group, sites]) => {
    const scores = sites.map((m) => siteAccuracyScore(m.accuracy));
    const overalls = scores.map((s) => s.overall).sort((a, b) => a - b);
    const dims = {};
    for (const dim of Object.keys(WEIGHTS)) {
      const vals = scores.map((s) => s[dim]).sort((a, b) => a - b);
      dims[dim] = round(percentile(vals, 0.5));
    }
    return {
      group,
      sites: sites.length,
      overallMedian: round(percentile(overalls, 0.5)),
      overallMean: round(mean(overalls)),
      dimensions: dims,
    };
  }).sort((a, b) => a.overallMedian - b.overallMedian);
}

// ──────────────────────────────────────────────
// Investigation Targets
// ──────────────────────────────────────────────

/**
 * Sites with worst overall accuracy - investigation targets.
 */
function buildWorstSites(metrics) {
  return metrics
    .map((m) => ({ url: m.url, category: m.category, complexity: m.complexity, ...siteAccuracyScore(m.accuracy) }))
    .sort((a, b) => a.overall - b.overall)
    .slice(0, 15);
}

/**
 * Sites with best overall accuracy - validation that things work.
 */
function buildBestSites(metrics) {
  return metrics
    .map((m) => ({ url: m.url, category: m.category, complexity: m.complexity, ...siteAccuracyScore(m.accuracy) }))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10);
}

// ──────────────────────────────────────────────
// Operational Metrics (timing, sizes, failures)
// ──────────────────────────────────────────────

function buildTimingStats(metrics) {
  const phases = ['navigation', 'groundTruth', 'viewgraph', 'accuracy', 'snapshot', 'screenshot'];
  const stats = {};
  for (const phase of phases) {
    const vals = metrics.map((m) => m.timing[phase]).filter((v) => v != null).sort((a, b) => a - b);
    stats[phase] = { count: vals.length, p50: percentile(vals, 0.5), p95: percentile(vals, 0.95), mean: Math.round(mean(vals)) };
  }
  return stats;
}

function buildSizeStats(metrics) {
  const types = [
    { key: 'viewgraph', path: (m) => m.metrics.viewgraph?.sizeBytes },
    { key: 'snapshot', path: (m) => m.metrics.snapshot?.sizeBytes },
    { key: 'screenshot', path: (m) => m.metrics.screenshot?.sizeBytes },
  ];
  const stats = {};
  for (const { key, path } of types) {
    const vals = metrics.map(path).filter((v) => v != null).sort((a, b) => a - b);
    stats[key] = { count: vals.length, p50: percentile(vals, 0.5), p95: percentile(vals, 0.95), mean: Math.round(mean(vals)) };
  }
  return stats;
}

function buildSuccessRates(metrics) {
  const total = metrics.length;
  const count = (fn) => metrics.filter(fn).length;
  return {
    total,
    navigation: pctObj(count((m) => m.status !== 'nav-failed'), total),
    viewgraph: pctObj(count((m) => m.metrics.viewgraph), total),
    snapshot: pctObj(count((m) => m.metrics.snapshot), total),
    screenshot: pctObj(count((m) => m.metrics.screenshot), total),
    accuracy: pctObj(count((m) => m.accuracy), total),
    allOk: pctObj(count((m) => m.status === 'ok'), total),
  };
}

/**
 * Summarize why sites were excluded from accuracy calculations.
 */
function buildExcludedReasons(excluded) {
  const reasons = { botBlocked: 0, cspBlocked: 0, navFailed: 0 };
  const urls = { botBlocked: [], cspBlocked: [], navFailed: [] };
  for (const m of excluded) {
    if (m.botDetection?.blocked) { reasons.botBlocked++; urls.botBlocked.push(m.url); }
    else if (m.status === 'inject-failed') { reasons.cspBlocked++; urls.cspBlocked.push(m.url); }
    else if (m.status === 'nav-failed') { reasons.navFailed++; urls.navFailed.push(m.url); }
  }
  return { ...reasons, total: excluded.length, urls };
}

function buildFailureAnalysis(metrics) {
  const byCategory = {};
  for (const m of metrics) {
    for (const err of m.errors) {
      if (!byCategory[err.category]) byCategory[err.category] = [];
      byCategory[err.category].push(err.message.slice(0, 120));
    }
  }
  const failures = Object.entries(byCategory).map(([cat, msgs]) => ({ category: cat, count: msgs.length, examples: [...new Set(msgs)].slice(0, 3) }));

  // Bot detection summary
  const botBlocked = metrics.filter((m) => m.botDetection?.blocked);
  const botSignals = {};
  for (const m of botBlocked) {
    for (const sig of m.botDetection.signals || []) {
      botSignals[sig] = (botSignals[sig] || 0) + 1;
    }
  }

  return {
    errors: failures,
    botDetection: {
      blockedCount: botBlocked.length,
      blockedPct: metrics.length > 0 ? round(botBlocked.length / metrics.length) : 0,
      blockedUrls: botBlocked.slice(0, 20).map((m) => m.url),
      signalCounts: botSignals,
    },
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function loadAllMetrics(sitesDir) {
  let dirs;
  try { dirs = await readdir(sitesDir); } catch { return []; }
  const results = [];
  for (const dir of dirs) {
    const full = join(sitesDir, dir);
    const s = await stat(full);
    if (!s.isDirectory()) continue;
    try {
      const raw = await readFile(join(full, 'metrics.json'), 'utf-8');
      results.push(JSON.parse(raw));
    } catch { /* skip */ }
  }
  return results;
}

function enrichWithSiteInfo(metrics, siteList) {
  const lookup = new Map(siteList.map((s) => {
    try { return [new URL(s.url).hostname.replace(/\./g, '-'), s]; } catch { return [null, s]; }
  }));
  for (const m of metrics) {
    try {
      const key = new URL(m.url).hostname.replace(/\./g, '-');
      const info = lookup.get(key);
      m.category = info?.category ?? 'unknown';
      m.complexity = info?.complexity ?? 'unknown';
      m.rendering = info?.rendering ?? 'unknown';
      m.script = info?.script ?? 'unknown';
      m.a11y = info?.a11y ?? 'unknown';
    } catch { m.category = 'unknown'; m.complexity = 'unknown'; m.rendering = 'unknown'; m.script = 'unknown'; m.a11y = 'unknown'; }
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

function mean(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function round(n) { return Math.round(n * 1000) / 1000; }

function distStats(sorted) {
  return {
    mean: round(mean(sorted)),
    median: round(percentile(sorted, 0.5)),
    p5: round(percentile(sorted, 0.05)),
    p95: round(percentile(sorted, 0.95)),
    min: sorted.length ? round(sorted[0]) : 0,
    max: sorted.length ? round(sorted[sorted.length - 1]) : 0,
  };
}

function pctObj(count, total) { return { count, pct: total > 0 ? round(count / total) : 0 }; }

// ──────────────────────────────────────────────
// Markdown Report
// ──────────────────────────────────────────────

/**
 * Format the full report as human-readable markdown.
 */
function formatMarkdown(report) {
  const L = [];
  const { accuracy: a, dimensions: d, groundTruth: gt, operational: op } = report;

  L.push('# ViewGraph Bulk Capture - Accuracy Report');
  L.push(`\nGenerated: ${report.timestamp}`);
  L.push(`Total sites: ${report.totalSites} | Clean (not blocked/failed): ${report.cleanSites} | With accuracy data: ${report.sitesWithAccuracy}`);
  if (report.excludedSites > 0) {
    const ex = report.excludedReasons;
    L.push(`Excluded: ${report.excludedSites} (bot-blocked: ${ex.botBlocked}, CSP-blocked: ${ex.cspBlocked}, nav-failed: ${ex.navFailed})`);
  }

  // ── Overall Accuracy ──
  L.push('\n## Overall Accuracy Score\n');
  L.push(`| Metric | Mean | Median | p5 (worst) | p95 (best) |`);
  L.push(`|---|---|---|---|---|`);
  L.push(`| **Composite** | ${pct(a.overall.mean)} | ${pct(a.overall.median)} | ${pct(a.overall.p5)} | ${pct(a.overall.p95)} |`);

  // ── Per-Dimension Scores ──
  L.push('\n## Accuracy by Dimension\n');
  L.push(`| Dimension | Weight | Mean | Median | p5 | p95 |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const [dim, stats] of Object.entries(a.dimensions)) {
    L.push(`| ${dim} | ${(stats.weight * 100).toFixed(0)}% | ${pct(stats.mean)} | ${pct(stats.median)} | ${pct(stats.p5)} | ${pct(stats.p95)} |`);
  }

  // ── Element Recall ──
  L.push('\n## Element Recall (VG captured / ground-truth visible)\n');
  const er = d.elementRecall;
  L.push(`Sites: ${er.sites}`);
  L.push(`Recall: median ${pct(er.recall.median)}, mean ${pct(er.recall.mean)}, range ${pct(er.recall.min)}-${pct(er.recall.max)}`);
  L.push(`VG nodes: median ${er.vgNodeCounts.median}, p95 ${er.vgNodeCounts.p95}`);
  L.push(`GT visible: median ${er.gtVisibleCounts.median}, p95 ${er.gtVisibleCounts.p95}`);

  // ── Bbox Accuracy ──
  L.push('\n## Bounding Box Accuracy\n');
  const bb = d.bboxAccuracy;
  L.push(`Within 5px: median ${pct(bb.within5px.median)}, mean ${pct(bb.within5px.mean)}`);
  L.push(`Within 10px: median ${pct(bb.within10px.median)}, mean ${pct(bb.within10px.mean)}`);
  L.push(`Mean deviation: median ${bb.meanDeviation.median}px, p95 ${bb.meanDeviation.p95}px`);

  // ── Text Accuracy ──
  L.push('\n## Text Accuracy\n');
  const ta = d.textAccuracy;
  L.push(`Exact match: median ${pct(ta.exactMatchRate.median)}, mean ${pct(ta.exactMatchRate.mean)}`);
  L.push(`Match (exact+prefix): median ${pct(ta.matchRate.median)}, mean ${pct(ta.matchRate.mean)}`);
  L.push(`Elements with empty text in VG: ${ta.totalEmptyText}`);

  // ── Ground Truth Summary ──
  L.push('\n## Ground Truth DOM Summary\n');
  L.push(`| Metric | Median | p95 | Total |`);
  L.push(`|---|---|---|---|`);
  for (const [field, stats] of Object.entries(gt)) {
    if (field === 'visibilityRatio') continue;
    L.push(`| ${field} | ${stats.median} | ${stats.p95} | ${stats.total} |`);
  }
  if (gt.visibilityRatio) {
    L.push(`\nVisibility ratio (visible/total): median ${pct(gt.visibilityRatio.median)}, mean ${pct(gt.visibilityRatio.mean)}`);
  }

  // ── By Category ──
  L.push('\n## Accuracy by Category\n');
  L.push(`| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |`);
  L.push(`|---|---|---|---|---|---|---|---|---|`);
  for (const cat of report.byCategory) {
    const dims = cat.dimensions;
    L.push(`| ${cat.group} | ${cat.sites} | ${pct(cat.overallMedian)} | ${pct(dims.testidRecall)} | ${pct(dims.interactiveRecall)} | ${pct(dims.selectorAccuracy)} | ${pct(dims.bboxAccuracy)} | ${pct(dims.textAccuracy)} | ${pct(dims.semanticRecall)} |`);
  }

  // ── By Complexity ──
  L.push('\n## Accuracy by Complexity\n');
  L.push(`| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |`);
  L.push(`|---|---|---|---|---|---|---|`);
  for (const c of report.byComplexity) {
    const dims = c.dimensions;
    L.push(`| ${c.group} | ${c.sites} | ${pct(c.overallMedian)} | ${pct(dims.testidRecall)} | ${pct(dims.interactiveRecall)} | ${pct(dims.selectorAccuracy)} | ${pct(dims.bboxAccuracy)} |`);
  }

  // ── By Rendering ──
  if (report.byRendering?.length > 0) {
    L.push('\n## Accuracy by Rendering Type\n');
    L.push(`| Rendering | Sites | Overall | Selector | Bbox | Interactive |`);
    L.push(`|---|---|---|---|---|---|`);
    for (const r of report.byRendering) {
      const dims = r.dimensions;
      L.push(`| ${r.group} | ${r.sites} | ${pct(r.overallMedian)} | ${pct(dims.selectorAccuracy)} | ${pct(dims.bboxAccuracy)} | ${pct(dims.interactiveRecall)} |`);
    }
  }

  // ── By Script ──
  if (report.byScript?.length > 1) {
    L.push('\n## Accuracy by Writing System\n');
    L.push(`| Script | Sites | Overall | Text | Selector |`);
    L.push(`|---|---|---|---|---|`);
    for (const s of report.byScript) {
      const dims = s.dimensions;
      L.push(`| ${s.group} | ${s.sites} | ${pct(s.overallMedian)} | ${pct(dims.textAccuracy)} | ${pct(dims.selectorAccuracy)} |`);
    }
  }

  // ── Worst Sites ──
  L.push('\n## Worst Accuracy Sites (investigation targets)\n');
  L.push(`| URL | Category | Overall | Selector | Bbox | Text | Interactive |`);
  L.push(`|---|---|---|---|---|---|---|`);
  for (const s of report.worstSites) {
    L.push(`| ${s.url} | ${s.category} | ${pct(s.overall)} | ${pct(s.selectorAccuracy)} | ${pct(s.bboxAccuracy)} | ${pct(s.textAccuracy)} | ${pct(s.interactiveRecall)} |`);
  }

  // ── Operational ──
  L.push('\n## Operational Metrics\n');
  L.push('### Success Rates\n');
  L.push(`| Phase | Count | Rate |`);
  L.push(`|---|---|---|`);
  for (const [phase, data] of Object.entries(op.successRates)) {
    if (phase === 'total') continue;
    L.push(`| ${phase} | ${data.count} | ${pct(data.pct)} |`);
  }

  L.push('\n### Timing (ms)\n');
  L.push(`| Phase | p50 | p95 | Mean |`);
  L.push(`|---|---|---|---|`);
  for (const [phase, stats] of Object.entries(op.timing)) {
    L.push(`| ${phase} | ${stats.p50} | ${stats.p95} | ${stats.mean} |`);
  }

  if (op.failures.errors?.length > 0) {
    L.push('\n### Failures\n');
    L.push(`| Category | Count | Examples |`);
    L.push(`|---|---|---|`);
    for (const f of op.failures.errors) {
      L.push(`| ${f.category} | ${f.count} | ${f.examples.join('; ').slice(0, 100)} |`);
    }
  }

  const bot = op.failures.botDetection;
  if (bot && bot.blockedCount > 0) {
    L.push(`\n### Bot Detection\n`);
    L.push(`Blocked: ${bot.blockedCount} sites (${pct(bot.blockedPct)})`);
    if (Object.keys(bot.signalCounts).length > 0) {
      L.push(`\n| Signal | Count |`);
      L.push(`|---|---|`);
      for (const [sig, count] of Object.entries(bot.signalCounts).sort((a, b) => b[1] - a[1])) {
        L.push(`| ${sig} | ${count} |`);
      }
    }
    L.push(`\nBlocked URLs: ${bot.blockedUrls.join(', ')}`);
  }

  return L.join('\n');
}

function pct(n) { return `${(n * 100).toFixed(1)}%`; }
