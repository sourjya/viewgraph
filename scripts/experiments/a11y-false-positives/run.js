#!/usr/bin/env node
/**
 * Experiment: A11y Audit False Positive Rate
 *
 * Compares ViewGraph's audit_accessibility findings against axe-core
 * results embedded in captures. Findings that ViewGraph flags but
 * axe-core doesn't are likely false positives.
 *
 * Gate question: Is the false positive rate >20%?
 * If yes, computed name resolution (CDP/heuristic) is justified.
 *
 * @see docs/ideas/cdp-accessibility-tree.md - Experiment 1
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(import.meta.dirname, 'data');
const RESULTS_DIR = path.resolve(import.meta.dirname, 'results');

// Import the actual audit rules from the server
const SERVER_SRC = path.resolve(import.meta.dirname, '..', '..', '..', 'server', 'src');

/**
 * Run ViewGraph's a11y audit rules against a parsed capture.
 * Reimplements the logic from server/src/analysis/a11y-rules.js
 */
function runVgAudit(capture) {
  const findings = [];
  const details = capture.details || {};
  const nodes = capture.nodes || {};

  for (const tier of ['high', 'med', 'low']) {
    const tierNodes = nodes[tier] || {};
    const tierDetails = details[tier] || {};

    for (const [tag, items] of Object.entries(tierNodes)) {
      for (const [nid, node] of Object.entries(items)) {
        const det = tierDetails[tag]?.[nid];
        if (!det) continue;

        const attrs = det.attributes || {};
        const text = (det.visibleText || '').trim();

        // Rule: button-no-name
        if (tag === 'button') {
          const hasAriaLabel = attrs['aria-label'] && attrs['aria-label'].trim();
          const hasText = text.length > 0;
          const hasAriaLabelledBy = !!attrs['aria-labelledby'];
          if (!hasAriaLabel && !hasText && !hasAriaLabelledBy) {
            findings.push({ rule: 'button-no-name', nid, tag, severity: 'error', text, attrs });
          }
        }

        // Rule: missing-alt
        if (tag === 'img') {
          if (!attrs.alt && attrs.alt !== '') {
            findings.push({ rule: 'missing-alt', nid, tag, severity: 'error', attrs });
          }
        }

        // Rule: missing-form-label
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          const hasAriaLabel = attrs['aria-label'] && attrs['aria-label'].trim();
          const hasAriaLabelledBy = !!attrs['aria-labelledby'];
          // Note: ViewGraph does NOT check <label for="id"> association - this is a known gap
          if (!hasAriaLabel && !hasAriaLabelledBy) {
            findings.push({ rule: 'missing-form-label', nid, tag, severity: 'warning', attrs });
          }
        }

        // Rule: empty-aria-label
        if (attrs['aria-label'] === '') {
          findings.push({ rule: 'empty-aria-label', nid, tag, severity: 'error', attrs });
        }
      }
    }
  }

  return findings;
}

/**
 * Extract axe-core violations from a capture.
 * Returns a set of rule IDs that axe flagged.
 */
function extractAxeViolations(capture) {
  // axe data can be in capture.accessibility.axe or capture.axe
  const axe = capture.accessibility?.axe || capture.axe;
  if (!axe?.violations) return { rules: new Set(), nodeCount: 0 };

  const rules = new Set();
  let nodeCount = 0;
  for (const v of axe.violations) {
    rules.add(v.id);
    nodeCount += v.nodes?.length || 0;
  }
  return { rules, nodeCount, violations: axe.violations };
}

/**
 * Map ViewGraph rule names to axe-core rule IDs for comparison.
 */
const VG_TO_AXE = {
  'button-no-name': 'button-name',
  'missing-alt': 'image-alt',
  'missing-form-label': 'label',
  'empty-aria-label': 'aria-input-field-name',
};

/**
 * Analyze a single capture: run VG audit, compare against axe-core.
 */
function analyzeCapture(filePath, project) {
  const raw = readFileSync(filePath, 'utf-8');
  const capture = JSON.parse(raw);

  const axeData = extractAxeViolations(capture);
  if (axeData.rules.size === 0 && !capture.accessibility?.axe && !capture.axe) {
    return null; // No axe data - skip
  }

  const vgFindings = runVgAudit(capture);
  const nodeCount = capture.metadata?.stats?.totalNodes || 0;

  // Classify each VG finding
  let truePositives = 0;
  let falsePositives = 0;
  let uncertain = 0;
  const fpDetails = [];

  for (const finding of vgFindings) {
    const axeRule = VG_TO_AXE[finding.rule];
    if (!axeRule) { uncertain++; continue; }

    // Check if axe also flagged this rule
    if (axeData.rules.has(axeRule)) {
      truePositives++;
    } else {
      // VG flagged it but axe didn't - likely false positive
      falsePositives++;
      fpDetails.push({
        rule: finding.rule,
        nid: finding.nid,
        tag: finding.tag,
        reason: `VG flags ${finding.rule} but axe-core does not flag ${axeRule}`,
        text: finding.text || '',
        attrs: finding.attrs,
      });
    }
  }

  // Also count axe findings that VG missed (false negatives)
  const axeOnlyRules = new Set();
  const vgRulesMapped = new Set(vgFindings.map(f => VG_TO_AXE[f.rule]).filter(Boolean));
  for (const axeRule of axeData.rules) {
    const vgEquiv = Object.entries(VG_TO_AXE).find(([, v]) => v === axeRule);
    if (vgEquiv && !vgRulesMapped.has(axeRule)) {
      // axe found it but VG didn't - but this is rule-level, not node-level
      // We'd need node-level matching for precise FN count
    }
    if (!Object.values(VG_TO_AXE).includes(axeRule)) {
      axeOnlyRules.add(axeRule); // Rules axe checks that VG doesn't
    }
  }

  const total = truePositives + falsePositives;
  const fpRate = total > 0 ? (falsePositives / total * 100) : 0;

  return {
    filename: path.basename(filePath),
    project,
    nodes: nodeCount,
    vgFindings: vgFindings.length,
    axeViolationRules: axeData.rules.size,
    axeViolationNodes: axeData.nodeCount,
    truePositives,
    falsePositives,
    uncertain,
    fpRate: Math.round(fpRate * 10) / 10,
    fpDetails: fpDetails.slice(0, 5), // Keep top 5 for report
    axeOnlyRules: [...axeOnlyRules],
  };
}

// ── Main ──

const results = [];
let skipped = 0;
let errors = 0;

for (const project of readdirSync(DATA_DIR)) {
  const projDir = path.join(DATA_DIR, project);
  if (!existsSync(projDir)) continue;
  const files = readdirSync(projDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const result = analyzeCapture(path.join(projDir, file), project);
      if (result) results.push(result);
      else skipped++;
    } catch (e) {
      errors++;
    }
  }
}

// ── Aggregate ──

const totalVgFindings = results.reduce((s, r) => s + r.vgFindings, 0);
const totalTP = results.reduce((s, r) => s + r.truePositives, 0);
const totalFP = results.reduce((s, r) => s + r.falsePositives, 0);
const totalUncertain = results.reduce((s, r) => s + r.uncertain, 0);
const overallFpRate = (totalTP + totalFP) > 0 ? (totalFP / (totalTP + totalFP) * 100) : 0;

// Per-rule breakdown
const byRule = {};
for (const r of results) {
  for (const fp of r.fpDetails) {
    byRule[fp.rule] = (byRule[fp.rule] || 0) + 1;
  }
}

// Common FP patterns
const fpPatterns = {};
for (const r of results) {
  for (const fp of r.fpDetails) {
    const key = `${fp.rule}:${fp.tag}`;
    if (!fpPatterns[key]) fpPatterns[key] = { rule: fp.rule, tag: fp.tag, count: 0, examples: [] };
    fpPatterns[key].count++;
    if (fpPatterns[key].examples.length < 3) {
      fpPatterns[key].examples.push({ text: fp.text, attrs: fp.attrs, file: r.filename });
    }
  }
}

// Axe-only rules (things axe catches that VG doesn't even check)
const allAxeOnly = new Set();
for (const r of results) for (const rule of r.axeOnlyRules) allAxeOnly.add(rule);

const report = {
  experiment: 'A11y Audit False Positive Rate',
  date: new Date().toISOString(),
  dataset: {
    totalCaptures: results.length + skipped,
    withAxeData: results.length,
    skippedNoAxe: skipped,
    errors,
  },
  aggregate: {
    totalVgFindings,
    truePositives: totalTP,
    falsePositives: totalFP,
    uncertain: totalUncertain,
    fpRate: Math.round(overallFpRate * 10) / 10,
  },
  perRuleFP: Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([rule, count]) => ({ rule, fpCount: count })),
  topFpPatterns: Object.values(fpPatterns).sort((a, b) => b.count - a.count).slice(0, 10),
  axeOnlyRules: [...allAxeOnly].sort(),
  gate: {
    threshold: 20,
    result: overallFpRate > 20 ? 'PASS' : 'FAIL',
    message: overallFpRate > 20
      ? `${Math.round(overallFpRate)}% false positive rate. Computed name resolution is justified.`
      : `Only ${Math.round(overallFpRate)}% false positive rate. Current attribute-based approach may be sufficient.`,
  },
};

writeFileSync(path.join(RESULTS_DIR, 'report.json'), JSON.stringify(report, null, 2));

// Console summary
console.log(`\n  A11y Audit False Positive Rate`);
console.log(`  ${'─'.repeat(50)}`);
console.log(`  Captures with axe data: ${results.length} (${skipped} skipped, ${errors} errors)`);
console.log(`  VG findings total:      ${totalVgFindings}`);
console.log(`  True positives:         ${totalTP}`);
console.log(`  False positives:        ${totalFP}`);
console.log(`  Uncertain:              ${totalUncertain}`);
console.log(`  FP rate:                ${report.aggregate.fpRate}%`);
console.log(`\n  Top FP patterns:`);
for (const p of report.topFpPatterns.slice(0, 5)) {
  console.log(`    ${p.rule} on <${p.tag}>: ${p.count} occurrences`);
  if (p.examples[0]) console.log(`      e.g. text="${p.examples[0].text || '(empty)'}"`);
}
console.log(`\n  Axe-only rules (VG doesn't check): ${report.axeOnlyRules.length}`);
for (const r of report.axeOnlyRules.slice(0, 8)) console.log(`    - ${r}`);
console.log(`\n  Gate (>20%): ${report.gate.result}`);
console.log(`  ${report.gate.message}\n`);
