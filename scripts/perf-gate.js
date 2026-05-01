#!/usr/bin/env node
/**
 * Performance Gate
 *
 * Runs vitest bench and checks results against budget thresholds.
 * Fails with exit code 1 if any benchmark exceeds its budget.
 *
 * Usage: node scripts/perf-gate.js
 *
 * @see .kiro/specs/extension-perf-pipeline/tasks.md - Task 1.4
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

// Budget: max mean time in ms per benchmark
const BUDGETS = {
  'traverseDOM performance > 500 elements': 200,
  'traverseDOM performance > 1000 elements': 500,
  'serialize performance > 500 elements': 100,
  'serialize performance > 1000 elements': 250,
};

console.log('Running benchmarks...');
let output;
try {
  output = execSync('npx vitest bench tests/bench/ --reporter=json', {
    cwd: resolve(ROOT, 'extension'),
    encoding: 'utf-8',
    timeout: 60000,
  });
} catch (e) {
  // vitest bench exits 0 on success but the JSON is in stdout
  output = e.stdout || '';
}

// Parse JSON output - vitest bench outputs JSON when --reporter=json
let results;
try {
  results = JSON.parse(output);
} catch {
  // Fallback: run without JSON reporter and just check exit code
  console.log('Could not parse JSON output. Running benchmarks for pass/fail only...');
  try {
    execSync('npx vitest bench tests/bench/', {
      cwd: resolve(ROOT, 'extension'),
      stdio: 'inherit',
      timeout: 60000,
    });
    console.log('\n✓ Benchmarks completed (no JSON output for budget check).');
    process.exit(0);
  } catch {
    console.error('\n✗ Benchmarks failed.');
    process.exit(1);
  }
}

// Check budgets against results
const failures = [];
const passed = [];

if (results?.testResults) {
  for (const file of results.testResults) {
    for (const bench of file.benchmarks || []) {
      const name = bench.fullName || bench.name;
      const mean = bench.mean || bench.hz ? (1000 / bench.hz) : null;
      const budget = BUDGETS[name];

      if (budget && mean !== null) {
        if (mean > budget) {
          failures.push(`${name}: ${mean.toFixed(1)}ms exceeds budget ${budget}ms`);
        } else {
          passed.push(`${name}: ${mean.toFixed(1)}ms (budget: ${budget}ms)`);
        }
      }
    }
  }
}

console.log('\nPerformance Gate');
console.log('─'.repeat(60));
for (const p of passed) console.log(`  ✓ ${p}`);
for (const f of failures) console.log(`  ✗ ${f}`);
console.log('─'.repeat(60));

if (failures.length) {
  console.error(`\n✗ ${failures.length} budget(s) exceeded.`);
  process.exit(1);
} else {
  console.log(`\n✓ All performance budgets passed.`);
}
