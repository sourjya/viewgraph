#!/usr/bin/env node
/**
 * Measure Schema Token Counts
 *
 * Starts the MCP server, calls tools/list, and counts approximate tokens
 * per tool schema. Reports total and per-tool breakdown.
 *
 * Token approximation: words * 1.3 (standard LLM tokenizer estimate).
 *
 * Usage: node scripts/measure-schema-tokens.js
 *
 * @see .kiro/specs/schema-token-optimization/design.md
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** Approximate token count from a string (words * 1.3). */
function countTokens(str) {
  return Math.ceil(str.split(/\s+/).filter(Boolean).length * 1.3);
}

// Get tools/list via the MCP server
const INIT = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"token-measure","version":"1.0"}}}';
const NOTIF = '{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}';
const LIST = '{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}';

const input = `${INIT}\n${NOTIF}\n${LIST}`;
let output;
try {
  output = execSync(`echo '${input}' | node server/index.js 2>/dev/null`, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 15000,
  });
} catch (e) {
  output = e.stdout || '';
}

// Parse the tools/list response (last JSON line with "tools" key)
const lines = output.split('\n').filter(Boolean);
let toolsResponse;
for (const line of lines.reverse()) {
  try {
    const parsed = JSON.parse(line);
    if (parsed.result?.tools) {
      toolsResponse = parsed.result.tools;
      break;
    }
  } catch { /* skip non-JSON lines */ }
}

if (!toolsResponse) {
  console.error('Could not get tools/list response from server.');
  process.exit(1);
}

// Measure tokens per tool
const results = toolsResponse.map((tool) => {
  const schemaStr = JSON.stringify(tool);
  const tokens = countTokens(schemaStr);
  const descTokens = countTokens(tool.description || '');
  return { name: tool.name, tokens, descTokens, schemaSize: schemaStr.length };
});

results.sort((a, b) => b.tokens - a.tokens);

const totalTokens = results.reduce((s, r) => s + r.tokens, 0);
const totalDescTokens = results.reduce((s, r) => s + r.descTokens, 0);

console.log(`\nSchema Token Measurement (${results.length} tools)`);
console.log('='.repeat(70));
console.log(`Total schema tokens: ~${totalTokens}`);
console.log(`Description tokens:  ~${totalDescTokens} (${Math.round(totalDescTokens / totalTokens * 100)}% of total)`);
console.log(`Average per tool:    ~${Math.round(totalTokens / results.length)}`);
console.log('');
console.log('Per-tool breakdown (sorted by token count):');
console.log('-'.repeat(70));
for (const r of results) {
  console.log(`  ${r.name.padEnd(30)} ${String(r.tokens).padStart(5)} tokens  (desc: ${r.descTokens})`);
}
console.log('-'.repeat(70));
console.log(`\nWith 6 gateways (~200 tokens each): ~${6 * 200} tokens`);
console.log(`Reduction: ${Math.round((1 - (6 * 200) / totalTokens) * 100)}%`);
