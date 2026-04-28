#!/usr/bin/env node
/**
 * Token Efficiency Experiments
 *
 * Runs 4 experiments on all available ViewGraph captures:
 * 1. Style deduplication rate
 * 2. Default value waste
 * 3. Enrichment section emptiness
 * 4. Selector stability (same-URL pairs only)
 *
 * @see docs/ideas/token-efficiency-experiments.md
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, lstatSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'provenance-distribution', 'data');
const RESULTS_DIR = path.resolve(import.meta.dirname, 'results');

// ──────────────────────────────────────────────
// Data Loading
// ──────────────────────────────────────────────

/** Load all captures from the shared data directory. */
function loadCaptures() {
  const captures = [];
  for (const project of readdirSync(DATA_DIR)) {
    const projDir = path.join(DATA_DIR, project);
    if (!existsSync(projDir) || !lstatSync(projDir).isDirectory()) continue;
    for (const file of readdirSync(projDir).filter(f => f.endsWith('.json'))) {
      try {
        const filePath = path.join(projDir, file);
        const raw = readFileSync(filePath, 'utf-8');
        const capture = JSON.parse(raw);
        captures.push({ filename: file, project, capture, sizeBytes: raw.length });
      } catch { /* skip corrupt */ }
    }
  }
  return captures;
}

// ──────────────────────────────────────────────
// Experiment 1: Style Deduplication Rate
// ──────────────────────────────────────────────

/** CSS defaults that carry zero information. */
const CSS_DEFAULTS = {
  'position': 'static',
  'visibility': 'visible',
  'overflow': 'visible',
  'opacity': '1',
  'flex-direction': 'row',
  'text-align': 'start',
  'font-weight': '400',
  'font-style': 'normal',
  'text-decoration': 'none',
  'text-transform': 'none',
  'white-space': 'normal',
  'word-break': 'normal',
  'cursor': 'auto',
  'pointer-events': 'auto',
  'box-sizing': 'content-box',
  'float': 'none',
  'clear': 'none',
  'z-index': 'auto',
  'vertical-align': 'baseline',
  'list-style-type': 'disc',
};

/** Values that are effectively "no value" regardless of property. */
const ZERO_VALUES = new Set([
  '0px', '0px 0px', '0px 0px 0px', '0px 0px 0px 0px',
  'rgba(0, 0, 0, 0)', 'transparent',
  'none', 'normal', 'auto',
]);

/** Check if a border value is effectively "no border". */
function isDefaultBorder(val) {
  return /^0px\s+none\b/.test(val);
}

function runStyleDedup(captures) {
  const results = [];

  for (const { filename, project, capture } of captures) {
    const details = capture.details || {};
    const styleHashes = [];
    let totalNodes = 0;

    for (const tier of ['high', 'med', 'low']) {
      const tierDetails = details[tier] || {};
      for (const [, items] of Object.entries(tierDetails)) {
        for (const [, det] of Object.entries(items)) {
          if (!det.styles) continue;
          totalNodes++;
          const hash = createHash('md5').update(JSON.stringify(det.styles)).digest('hex');
          styleHashes.push(hash);
        }
      }
    }

    const uniqueStyles = new Set(styleHashes).size;
    const dedupRate = totalNodes > 0 ? (1 - uniqueStyles / totalNodes) * 100 : 0;
    const styleBytesTotal = styleHashes.length > 0
      ? JSON.stringify(Object.values(details).flatMap(t => Object.values(t).flatMap(items => Object.values(items).map(d => d.styles).filter(Boolean)))).length
      : 0;

    results.push({
      filename, project, totalNodes, uniqueStyles,
      dedupRate: Math.round(dedupRate * 10) / 10,
      styleBytesTotal,
    });
  }

  const rates = results.map(r => r.dedupRate).sort((a, b) => a - b);
  const median = rates[Math.floor(rates.length / 2)];
  const totalStyleBytes = results.reduce((s, r) => s + r.styleBytesTotal, 0);
  const avgDedup = results.reduce((s, r) => s + r.dedupRate, 0) / results.length;

  return {
    name: 'Style Deduplication Rate',
    captures: results.length,
    median: Math.round(median * 10) / 10,
    mean: Math.round(avgDedup * 10) / 10,
    p25: Math.round(rates[Math.floor(rates.length * 0.25)] * 10) / 10,
    p75: Math.round(rates[Math.floor(rates.length * 0.75)] * 10) / 10,
    min: rates[0],
    max: rates[rates.length - 1],
    totalStyleBytes,
    estimatedSavingsBytes: Math.round(totalStyleBytes * (avgDedup / 100)),
    gate: { threshold: 30, result: median > 30 ? 'PASS' : 'FAIL' },
  };
}

// ──────────────────────────────────────────────
// Experiment 2: Default Value Waste
// ──────────────────────────────────────────────

function runDefaultWaste(captures) {
  let totalValues = 0;
  let defaultValues = 0;
  const perProperty = {};

  for (const { capture } of captures) {
    const details = capture.details || {};
    for (const tier of ['high', 'med', 'low']) {
      const tierDetails = details[tier] || {};
      for (const [, items] of Object.entries(tierDetails)) {
        for (const [, det] of Object.entries(items)) {
          if (!det.styles) continue;
          for (const [group, props] of Object.entries(det.styles)) {
            if (typeof props !== 'object') continue;
            for (const [prop, val] of Object.entries(props)) {
              totalValues++;
              if (!perProperty[prop]) perProperty[prop] = { total: 0, defaults: 0 };
              perProperty[prop].total++;

              const isDefault =
                (CSS_DEFAULTS[prop] && val === CSS_DEFAULTS[prop]) ||
                (prop === 'margin' && (val === '0px' || val === '0px 0px' || val === '0px 0px 0px 0px')) ||
                (prop === 'padding' && (val === '0px' || val === '0px 0px' || val === '0px 0px 0px 0px')) ||
                (prop === 'border' && isDefaultBorder(val)) ||
                (prop === 'border-radius' && val === '0px') ||
                (prop === 'background-color' && (val === 'rgba(0, 0, 0, 0)' || val === 'transparent')) ||
                (prop === 'box-shadow' && val === 'none') ||
                (prop === 'text-decoration' && (val === 'none' || val.startsWith('none '))) ||
                (prop === 'transform' && val === 'none') ||
                (prop === 'transition' && val === 'all 0s ease 0s') ||
                (prop === 'gap' && val === 'normal');

              if (isDefault) {
                defaultValues++;
                perProperty[prop].defaults++;
              }
            }
          }
        }
      }
    }
  }

  const wasteRate = totalValues > 0 ? (defaultValues / totalValues * 100) : 0;

  // Top wasteful properties (most defaults)
  const topWaste = Object.entries(perProperty)
    .map(([prop, d]) => ({ prop, total: d.total, defaults: d.defaults, rate: Math.round(d.defaults / d.total * 1000) / 10 }))
    .sort((a, b) => b.defaults - a.defaults)
    .slice(0, 15);

  // Estimate bytes saved (avg ~20 chars per property:value pair)
  const estimatedSavingsBytes = defaultValues * 20;

  return {
    name: 'Default Value Waste',
    totalValues,
    defaultValues,
    wasteRate: Math.round(wasteRate * 10) / 10,
    estimatedSavingsBytes,
    topWasteProperties: topWaste,
    gate: { threshold: 25, result: wasteRate > 25 ? 'PASS' : 'FAIL' },
  };
}

// ──────────────────────────────────────────────
// Experiment 3: Enrichment Section Emptiness
// ──────────────────────────────────────────────

function runEnrichmentEmptiness(captures) {
  const sections = ['network', 'console', 'breakpoints', 'stacking', 'focus', 'scroll', 'landmarks', 'components', 'axe', 'accessibility'];
  const counts = {};
  for (const s of sections) counts[s] = { present: 0, empty: 0, populated: 0, totalBytes: 0 };

  for (const { capture } of captures) {
    for (const section of sections) {
      const data = capture[section];
      if (data === undefined || data === null) continue;
      counts[section].present++;

      const str = JSON.stringify(data);
      counts[section].totalBytes += str.length;

      // Determine if "empty" (no meaningful data)
      const isEmpty =
        (Array.isArray(data) && data.length === 0) ||
        (typeof data === 'object' && !Array.isArray(data) && (
          // Object with only empty arrays/zero counts
          Object.values(data).every(v =>
            v === 0 || v === null || v === '' ||
            (Array.isArray(v) && v.length === 0) ||
            (typeof v === 'object' && v !== null && Object.keys(v).length === 0)
          ) ||
          Object.keys(data).length === 0
        ));

      if (isEmpty) counts[section].empty++;
      else counts[section].populated++;
    }
  }

  const total = captures.length;
  const results = sections.map(s => ({
    section: s,
    present: counts[s].present,
    empty: counts[s].empty,
    populated: counts[s].populated,
    emptyRate: counts[s].present > 0 ? Math.round(counts[s].empty / counts[s].present * 1000) / 10 : 0,
    notPresentRate: Math.round((total - counts[s].present) / total * 1000) / 10,
    avgBytesWhenPresent: counts[s].present > 0 ? Math.round(counts[s].totalBytes / counts[s].present) : 0,
  })).sort((a, b) => b.emptyRate - a.emptyRate);

  const optInCandidates = results.filter(r => (r.emptyRate + r.notPresentRate) > 70);

  return {
    name: 'Enrichment Section Emptiness',
    totalCaptures: total,
    sections: results,
    optInCandidates: optInCandidates.map(r => r.section),
    gate: { threshold: 3, result: optInCandidates.length >= 3 ? 'PASS' : 'FAIL' },
  };
}

// ──────────────────────────────────────────────
// Experiment 4: Selector Stability
// ──────────────────────────────────────────────

function runSelectorStability(captures) {
  // Group captures by URL
  const byUrl = {};
  for (const c of captures) {
    const url = c.capture.metadata?.url;
    if (!url) continue;
    // Normalize URL (strip query/hash)
    let key;
    try { const u = new URL(url); key = `${u.origin}${u.pathname}`; } catch { key = url; }
    if (!byUrl[key]) byUrl[key] = [];
    byUrl[key].push(c);
  }

  // Only analyze URLs with 2+ captures
  const pairs = [];
  for (const [url, caps] of Object.entries(byUrl)) {
    if (caps.length < 2) continue;
    caps.sort((a, b) => new Date(a.capture.metadata?.timestamp || 0) - new Date(b.capture.metadata?.timestamp || 0));
    for (let i = 0; i < caps.length - 1; i++) {
      pairs.push({ url, a: caps[i], b: caps[i + 1] });
    }
  }

  if (pairs.length === 0) {
    return { name: 'Selector Stability', pairs: 0, message: 'No same-URL capture pairs found', gate: { threshold: 90, result: 'SKIP' } };
  }

  let totalElements = 0;
  let stable = 0;
  let drifted = 0;
  let missing = 0;
  const byStrategy = { testId: { stable: 0, drifted: 0 }, id: { stable: 0, drifted: 0 }, css: { stable: 0, drifted: 0 } };

  for (const { a, b } of pairs) {
    // Build element maps keyed by alias (most stable identifier)
    const mapA = buildLocatorMap(a.capture);
    const mapB = buildLocatorMap(b.capture);

    for (const [alias, locsA] of mapA) {
      totalElements++;
      const locsB = mapB.get(alias);
      if (!locsB) { missing++; continue; }

      // Compare each locator strategy
      for (const locA of locsA) {
        const locB = locsB.find(l => l.strategy === locA.strategy);
        const strategy = locA.strategy === 'testId' ? 'testId' : locA.strategy === 'id' ? 'id' : 'css';
        if (!locB) { drifted++; byStrategy[strategy].drifted++; continue; }
        if (locA.value === locB.value) { stable++; byStrategy[strategy].stable++; }
        else { drifted++; byStrategy[strategy].drifted++; }
      }
    }
  }

  const total = stable + drifted;
  const stabilityRate = total > 0 ? (stable / total * 100) : 0;

  return {
    name: 'Selector Stability',
    pairs: pairs.length,
    urls: Object.keys(byUrl).filter(u => byUrl[u].length >= 2).length,
    totalElements,
    totalSelectors: total,
    stable,
    drifted,
    missing,
    stabilityRate: Math.round(stabilityRate * 10) / 10,
    byStrategy: Object.fromEntries(
      Object.entries(byStrategy).map(([k, v]) => [k, {
        ...v, total: v.stable + v.drifted,
        rate: (v.stable + v.drifted) > 0 ? Math.round(v.stable / (v.stable + v.drifted) * 1000) / 10 : 0,
      }])
    ),
    gate: { threshold: 90, result: stabilityRate > 90 ? 'PASS' : 'FAIL' },
  };
}

/** Build a map of alias -> locators from a capture's details section. */
function buildLocatorMap(capture) {
  const map = new Map();
  const nodes = capture.nodes || {};
  const details = capture.details || {};

  for (const tier of ['high', 'med', 'low']) {
    const tierNodes = nodes[tier] || {};
    const tierDetails = details[tier] || {};
    for (const [tag, items] of Object.entries(tierNodes)) {
      for (const [nid, node] of Object.entries(items)) {
        const alias = node.alias || `${tag}:${nid}`;
        const det = tierDetails[tag]?.[nid];
        if (det?.locators) map.set(alias, det.locators);
      }
    }
  }
  return map;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

console.log('\n  Loading captures...');
const captures = loadCaptures();
console.log(`  Loaded ${captures.length} captures\n`);

const exp1 = runStyleDedup(captures);
const exp2 = runDefaultWaste(captures);
const exp3 = runEnrichmentEmptiness(captures);
const exp4 = runSelectorStability(captures);

const report = {
  date: new Date().toISOString(),
  dataset: { captures: captures.length },
  experiments: { styleDedup: exp1, defaultWaste: exp2, enrichmentEmptiness: exp3, selectorStability: exp4 },
};

writeFileSync(path.join(RESULTS_DIR, 'report.json'), JSON.stringify(report, null, 2));

// ── Console Output ──

console.log(`  ═══════════════════════════════════════════════════`);
console.log(`  Experiment 1: Style Deduplication Rate`);
console.log(`  ───────────────────────────────────────────────────`);
console.log(`  Median dedup rate:  ${exp1.median}%`);
console.log(`  Mean dedup rate:    ${exp1.mean}%`);
console.log(`  P25-P75:            ${exp1.p25}% - ${exp1.p75}%`);
console.log(`  Range:              ${exp1.min}% - ${exp1.max}%`);
console.log(`  Total style bytes:  ${(exp1.totalStyleBytes / 1024).toFixed(0)}KB`);
console.log(`  Est. savings:       ${(exp1.estimatedSavingsBytes / 1024).toFixed(0)}KB`);
console.log(`  Gate (>30%):        ${exp1.gate.result}`);

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  Experiment 2: Default Value Waste`);
console.log(`  ───────────────────────────────────────────────────`);
console.log(`  Total style values: ${exp2.totalValues.toLocaleString()}`);
console.log(`  Default values:     ${exp2.defaultValues.toLocaleString()} (${exp2.wasteRate}%)`);
console.log(`  Est. savings:       ${(exp2.estimatedSavingsBytes / 1024).toFixed(0)}KB`);
console.log(`  Top waste properties:`);
for (const p of exp2.topWasteProperties.slice(0, 8)) {
  console.log(`    ${p.prop}: ${p.defaults}/${p.total} default (${p.rate}%)`);
}
console.log(`  Gate (>25%):        ${exp2.gate.result}`);

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  Experiment 3: Enrichment Section Emptiness`);
console.log(`  ───────────────────────────────────────────────────`);
for (const s of exp3.sections) {
  const status = (s.emptyRate + s.notPresentRate) > 70 ? '⚠ opt-in candidate' : '✓ keep';
  console.log(`  ${s.section.padEnd(15)} present:${String(s.present).padStart(4)} empty:${String(s.empty).padStart(4)} (${String(s.emptyRate).padStart(5)}%) not-present:${String(s.notPresentRate).padStart(5)}%  ${status}`);
}
console.log(`  Opt-in candidates:  ${exp3.optInCandidates.join(', ') || 'none'}`);
console.log(`  Gate (≥3):          ${exp3.gate.result}`);

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  Experiment 4: Selector Stability`);
console.log(`  ───────────────────────────────────────────────────`);
if (exp4.pairs === 0) {
  console.log(`  ${exp4.message}`);
} else {
  console.log(`  Same-URL pairs:     ${exp4.pairs} (${exp4.urls} URLs)`);
  console.log(`  Total selectors:    ${exp4.totalSelectors}`);
  console.log(`  Stable:             ${exp4.stable} (${exp4.stabilityRate}%)`);
  console.log(`  Drifted:            ${exp4.drifted}`);
  console.log(`  Missing elements:   ${exp4.missing}`);
  console.log(`  By strategy:`);
  for (const [strat, d] of Object.entries(exp4.byStrategy)) {
    if (d.total > 0) console.log(`    ${strat}: ${d.stable}/${d.total} stable (${d.rate}%)`);
  }
}
console.log(`  Gate (>90%):        ${exp4.gate.result}`);

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  Summary`);
console.log(`  ───────────────────────────────────────────────────`);
const gates = [exp1.gate, exp2.gate, exp3.gate, exp4.gate];
const passed = gates.filter(g => g.result === 'PASS').length;
const skipped = gates.filter(g => g.result === 'SKIP').length;
console.log(`  ${passed}/${gates.length - skipped} experiments passed (${skipped} skipped)\n`);
