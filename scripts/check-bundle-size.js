#!/usr/bin/env node
/**
 * Bundle Size Gate
 *
 * Checks extension build output against size budgets defined in bundlesize.config.json.
 * Fails with exit code 1 if any file exceeds its budget.
 * Run after `npx wxt build` to verify bundle sizes.
 *
 * Usage: node scripts/check-bundle-size.js
 *
 * @see .kiro/specs/extension-perf-pipeline/tasks.md - Task 1.1
 */

import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(ROOT, 'extension/bundlesize.config.json'), 'utf-8'));

/**
 * Parse a human-readable size string (e.g., "350 kB", "100 kB") to bytes.
 * @param {string} sizeStr - Size string with unit
 * @returns {number} Size in bytes
 */
function parseSize(sizeStr) {
  const match = sizeStr.match(/^([\d.]+)\s*(kB|KB|MB|B)$/i);
  if (!match) throw new Error(`Invalid size format: ${sizeStr}`);
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'b') return value;
  if (unit === 'kb') return value * 1024;
  if (unit === 'mb') return value * 1024 * 1024;
  return value;
}

const failures = [];
const results = [];

for (const budget of config.budgets) {
  const filePath = resolve(ROOT, budget.path);
  let rawSize;
  try {
    rawSize = statSync(filePath).size;
  } catch {
    failures.push(`${budget.path}: file not found (run 'npx wxt build' first)`);
    continue;
  }

  // S3-9: Use zlib instead of shell command to avoid command injection
  const gzipSize = gzipSync(readFileSync(filePath)).length;

  const maxRaw = parseSize(budget.maxSize);
  const maxGzip = budget.maxGzip ? parseSize(budget.maxGzip) : null;

  const rawOk = rawSize <= maxRaw;
  const gzipOk = !maxGzip || gzipSize <= maxGzip;

  results.push({
    file: budget.path.replace('extension/.output/chrome-mv3/', ''),
    raw: `${(rawSize / 1024).toFixed(1)} kB`,
    rawBudget: budget.maxSize,
    rawOk,
    gzip: `${(gzipSize / 1024).toFixed(1)} kB`,
    gzipBudget: budget.maxGzip || 'n/a',
    gzipOk,
  });

  if (!rawOk) failures.push(`${budget.path}: ${(rawSize / 1024).toFixed(1)} kB exceeds raw budget ${budget.maxSize}`);
  if (!gzipOk) failures.push(`${budget.path}: ${(gzipSize / 1024).toFixed(1)} kB gzip exceeds budget ${budget.maxGzip}`);
}

// Print results table
console.log('\nBundle Size Check');
console.log('─'.repeat(70));
for (const r of results) {
  const rawStatus = r.rawOk ? '✓' : '✗';
  const gzipStatus = r.gzipOk ? '✓' : '✗';
  console.log(`  ${rawStatus} ${r.file}: ${r.raw} (budget: ${r.rawBudget}) | gzip: ${r.gzip} (budget: ${r.gzipBudget}) ${gzipStatus}`);
}
console.log('─'.repeat(70));

if (failures.length) {
  console.error(`\n✗ ${failures.length} budget(s) exceeded:\n  ${failures.join('\n  ')}`);
  process.exit(1);
} else {
  console.log('\n✓ All bundle size budgets passed.');
}
