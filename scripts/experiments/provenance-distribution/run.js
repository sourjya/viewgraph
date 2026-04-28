#!/usr/bin/env node
/**
 * Experiment: Provenance Distribution Audit
 *
 * Analyzes all ViewGraph captures to determine what fraction of fields
 * are measured (DOM API), derived (computed), or inferred (heuristic).
 *
 * Gate question: Is >15% of capture data non-measured?
 * If yes, provenance metadata is worth the token cost.
 *
 * @see docs/ideas/provenance-metadata.md - Experiment 3
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(import.meta.dirname, 'data');
const RESULTS_DIR = path.resolve(import.meta.dirname, 'results');

/**
 * Classify each field in a capture node by its provenance source.
 * This is the ground truth classification - what the traverser WOULD tag
 * if provenance were implemented.
 */
function classifyFields(node, details) {
  const counts = { measured: 0, derived: 0, inferred: 0 };

  // Node-level fields
  if (node.alias) counts.derived++;          // Generated from testid/id/name
  if (node.parent !== undefined) counts.measured++;
  if (node.children) counts.measured++;
  if (node.actions) counts.derived++;        // Inferred from tag + attributes
  if (node.isRendered !== undefined) counts.derived++; // Ancestor walk computation
  if (node.cluster !== undefined) counts.inferred++;   // Spatial clustering heuristic

  if (!details) return counts;

  // Locators
  if (details.locators) {
    for (const loc of details.locators) {
      if (loc.strategy === 'testId' || loc.strategy === 'id') counts.measured++;
      else if (loc.strategy === 'css') counts.derived++;
      else counts.derived++;
    }
  }

  // Attributes - direct DOM reads
  if (details.attributes) counts.measured += Object.keys(details.attributes).length;

  // visibleText - from textContent
  if (details.visibleText !== undefined) counts.measured++;

  // Layout - from getBoundingClientRect
  if (details.layout?.bboxDocument) counts.measured++;

  // Styles - from getComputedStyle (each property is measured)
  if (details.styles) {
    for (const group of Object.values(details.styles)) {
      if (typeof group === 'object') counts.measured += Object.keys(group).length;
    }
  }

  return counts;
}

/**
 * Analyze a single capture file.
 * @returns {{ filename, project, nodes, fields: { measured, derived, inferred }, pctNonMeasured }}
 */
function analyzeCapture(filePath, project) {
  const raw = readFileSync(filePath, 'utf-8');
  const capture = JSON.parse(raw);

  const nodes = capture.nodes || {};
  const details = capture.details || {};
  const totals = { measured: 0, derived: 0, inferred: 0 };
  let nodeCount = 0;

  // Walk all salience tiers
  for (const tier of ['high', 'med', 'low']) {
    const tierNodes = nodes[tier] || {};
    const tierDetails = details[tier] || {};

    for (const [tag, items] of Object.entries(tierNodes)) {
      for (const [nid, node] of Object.entries(items)) {
        nodeCount++;
        const det = tierDetails[tag]?.[nid] || null;
        const counts = classifyFields(node, det);
        totals.measured += counts.measured;
        totals.derived += counts.derived;
        totals.inferred += counts.inferred;
      }
    }
  }

  // Enrichment sections - classify at section level
  if (capture.network) { totals.measured += 2; }       // Network data from Performance API
  if (capture.console) { totals.measured += 2; }       // Console from interceptor
  if (capture.breakpoints) { totals.derived += 1; }    // Computed from viewport + rules
  if (capture.stacking) { totals.derived += 1; }       // Computed from z-index walk
  if (capture.focus) { totals.derived += 1; }          // Computed from tabindex + DOM order
  if (capture.scroll) { totals.measured += 1; }        // From scrollHeight/clientHeight
  if (capture.landmarks) { totals.measured += 1; }     // From DOM landmark elements
  if (capture.components) { totals.inferred += 1; }    // From fiber walk heuristic

  // Summary section
  if (capture.summary) {
    if (capture.summary.styles) totals.measured += Object.keys(capture.summary.styles).length;
    if (capture.summary.layout) totals.derived += 2;   // Clusters are derived
    if (capture.summary.elements) totals.measured += capture.summary.elements.length;
  }

  const total = totals.measured + totals.derived + totals.inferred;
  const pctNonMeasured = total > 0 ? ((totals.derived + totals.inferred) / total * 100) : 0;

  return {
    filename: path.basename(filePath),
    project,
    nodes: nodeCount,
    sizeBytes: raw.length,
    fields: totals,
    totalFields: total,
    pctNonMeasured: Math.round(pctNonMeasured * 10) / 10,
    pctDerived: total > 0 ? Math.round(totals.derived / total * 1000) / 10 : 0,
    pctInferred: total > 0 ? Math.round(totals.inferred / total * 1000) / 10 : 0,
  };
}

// ── Main ──

const results = [];
let errors = 0;

for (const project of readdirSync(DATA_DIR)) {
  const projDir = path.join(DATA_DIR, project);
  if (!existsSync(projDir)) continue;
  const files = readdirSync(projDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const result = analyzeCapture(path.join(projDir, file), project);
      results.push(result);
    } catch (e) {
      errors++;
    }
  }
}

// ── Aggregate ──

const totalFields = results.reduce((s, r) => s + r.totalFields, 0);
const totalMeasured = results.reduce((s, r) => s + r.fields.measured, 0);
const totalDerived = results.reduce((s, r) => s + r.fields.derived, 0);
const totalInferred = results.reduce((s, r) => s + r.fields.inferred, 0);
const pctNonMeasured = ((totalDerived + totalInferred) / totalFields * 100);

const pctValues = results.map(r => r.pctNonMeasured).sort((a, b) => a - b);
const median = pctValues[Math.floor(pctValues.length / 2)];
const p25 = pctValues[Math.floor(pctValues.length * 0.25)];
const p75 = pctValues[Math.floor(pctValues.length * 0.75)];

// ── Per-project breakdown ──
const byProject = {};
for (const r of results) {
  if (!byProject[r.project]) byProject[r.project] = { captures: 0, fields: 0, nonMeasured: 0 };
  byProject[r.project].captures++;
  byProject[r.project].fields += r.totalFields;
  byProject[r.project].nonMeasured += r.fields.derived + r.fields.inferred;
}

// ── Report ──

const report = {
  experiment: 'Provenance Distribution Audit',
  date: new Date().toISOString(),
  dataset: {
    totalCaptures: results.length,
    errors,
    projects: Object.entries(byProject).map(([name, d]) => ({
      name, captures: d.captures,
      pctNonMeasured: Math.round(d.nonMeasured / d.fields * 1000) / 10,
    })),
  },
  aggregate: {
    totalFields,
    measured: totalMeasured,
    derived: totalDerived,
    inferred: totalInferred,
    pctMeasured: Math.round(totalMeasured / totalFields * 1000) / 10,
    pctDerived: Math.round(totalDerived / totalFields * 1000) / 10,
    pctInferred: Math.round(totalInferred / totalFields * 1000) / 10,
    pctNonMeasured: Math.round(pctNonMeasured * 10) / 10,
  },
  distribution: {
    median: median,
    p25: p25,
    p75: p75,
    min: pctValues[0],
    max: pctValues[pctValues.length - 1],
  },
  gate: {
    threshold: 15,
    result: pctNonMeasured > 15 ? 'PASS' : 'FAIL',
    message: pctNonMeasured > 15
      ? `${Math.round(pctNonMeasured)}% of fields are non-measured. Provenance metadata is justified.`
      : `Only ${Math.round(pctNonMeasured)}% of fields are non-measured. Provenance adds limited value.`,
  },
};

writeFileSync(path.join(RESULTS_DIR, 'report.json'), JSON.stringify(report, null, 2));

// Console summary
console.log(`\n  Provenance Distribution Audit`);
console.log(`  ${'─'.repeat(50)}`);
console.log(`  Captures analyzed: ${results.length} (${errors} errors)`);
console.log(`  Total fields:      ${totalFields.toLocaleString()}`);
console.log(`  Measured:          ${totalMeasured.toLocaleString()} (${report.aggregate.pctMeasured}%)`);
console.log(`  Derived:           ${totalDerived.toLocaleString()} (${report.aggregate.pctDerived}%)`);
console.log(`  Inferred:          ${totalInferred.toLocaleString()} (${report.aggregate.pctInferred}%)`);
console.log(`  Non-measured:      ${report.aggregate.pctNonMeasured}%`);
console.log(`  Median per-capture: ${median}%`);
console.log(`  P25-P75:           ${p25}% - ${p75}%`);
console.log(`\n  Per project:`);
for (const p of report.dataset.projects) {
  console.log(`    ${p.name}: ${p.captures} captures, ${p.pctNonMeasured}% non-measured`);
}
console.log(`\n  Gate (>15%): ${report.gate.result}`);
console.log(`  ${report.gate.message}\n`);
