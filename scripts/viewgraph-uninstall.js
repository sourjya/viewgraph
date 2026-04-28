#!/usr/bin/env node
/**
 * viewgraph uninstall - Remove ViewGraph from a project
 *
 * Removes MCP config entries, steering docs, hooks, prompts, and
 * optionally the .viewgraph data directory (captures, config, tokens).
 *
 * Usage: npx @viewgraph/core uninstall
 *
 * @see scripts/viewgraph-init.js - the installer this reverses
 */

import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWGRAPH_ROOT = path.resolve(__dirname, '..');
const CWD = process.cwd();
const VERSION = JSON.parse(readFileSync(path.join(VIEWGRAPH_ROOT, 'package.json'), 'utf-8')).version;

const AGENTS = [
  { name: 'Kiro', file: '.kiro/settings/mcp.json' },
  { name: 'Claude Code', file: '.claude/mcp.json' },
  { name: 'Cursor', file: '.cursor/mcp.json' },
  { name: 'Windsurf', file: '.windsurf/mcp.json' },
  { name: 'Cline', file: '.cline/mcp.json' },
];

/** Prompt user for yes/no. */
function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase().startsWith('y'));
    });
  });
}

/** Format bytes as human-readable size. */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Get total size of a directory recursively. */
function dirSize(dir) {
  let total = 0;
  try {
    for (const f of readdirSync(dir)) {
      const fp = path.join(dir, f);
      const st = statSync(fp);
      total += st.isDirectory() ? dirSize(fp) : st.size;
    }
  } catch { /* permission error or missing */ }
  return total;
}

// ── Header ──

const W = 42;
const line1 = ` </>  ViewGraph v${VERSION}`;
const line2 = ' \u26a0  Uninstall from this project';
console.log(`
  \u250c${'\u2500'.repeat(W)}\u2510
  \u2502\x1b[1m\x1b[38;5;141m${line1}\x1b[0m${' '.repeat(W - line1.length)}\u2502
  \u2502\x1b[38;5;245m${line2}\x1b[0m${' '.repeat(W - line2.length)}\u2502
  \u2514${'\u2500'.repeat(W)}\u2518
`);

console.log(`  Project: ${CWD}\n`);

// ── Collect what exists ──

const removals = [];

// 1. MCP config entries
for (const agent of AGENTS) {
  const configPath = path.join(CWD, agent.file);
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.mcpServers?.viewgraph) {
        removals.push({ type: 'mcp-config', path: agent.file, agent: agent.name, configPath });
      }
    } catch { /* corrupt config */ }
  }
}

// 2. Kiro steering docs
const STEERING_FILES = ['viewgraph-workflow.md', 'viewgraph-resolution.md', 'viewgraph-hostile-dom.md', 'devtools-testing.md'];
for (const file of STEERING_FILES) {
  const fp = path.join(CWD, '.kiro', 'steering', file);
  if (existsSync(fp)) removals.push({ type: 'steering', path: `.kiro/steering/${file}`, fullPath: fp });
}

// 3. Kiro prompts
const promptsDir = path.join(CWD, '.kiro', 'prompts');
if (existsSync(promptsDir)) {
  for (const file of readdirSync(promptsDir).filter((f) => f.startsWith('vg-'))) {
    removals.push({ type: 'prompt', path: `.kiro/prompts/${file}`, fullPath: path.join(promptsDir, file) });
  }
}

// 4. Kiro hooks
const hooksDir = path.join(CWD, '.kiro', 'hooks');
if (existsSync(hooksDir)) {
  for (const file of readdirSync(hooksDir).filter((f) => f.includes('viewgraph') || f.includes('vg-'))) {
    removals.push({ type: 'hook', path: `.kiro/hooks/${file}`, fullPath: path.join(hooksDir, file) });
  }
}

// 5. .viewgraph directory
const vgDir = path.join(CWD, '.viewgraph');
let vgDirInfo = null;
if (existsSync(vgDir)) {
  const capturesDir = path.join(vgDir, 'captures');
  const archiveDir = path.join(vgDir, 'archive');
  const captureCount = existsSync(capturesDir) ? readdirSync(capturesDir).filter((f) => f.endsWith('.json')).length : 0;
  const archiveCount = existsSync(archiveDir) ? dirSize(archiveDir) : 0;
  const totalSize = dirSize(vgDir);
  vgDirInfo = { captureCount, totalSize, archiveSize: archiveCount };
}

// ── Show what will be removed ──

if (removals.length === 0 && !vgDirInfo) {
  console.log('  Nothing to remove. ViewGraph is not installed in this project.\n');
  process.exit(0);
}

if (removals.length > 0) {
  console.log('  The following configuration files will be removed:\n');

  const mcpConfigs = removals.filter((r) => r.type === 'mcp-config');
  if (mcpConfigs.length) {
    console.log('  \x1b[1mMCP Configuration\x1b[0m');
    for (const r of mcpConfigs) console.log(`    \x1b[31m✕\x1b[0m ${r.path} (${r.agent} — viewgraph server entry)`);
    console.log('');
  }

  const steeringFiles = removals.filter((r) => r.type === 'steering');
  if (steeringFiles.length) {
    console.log('  \x1b[1mSteering Docs\x1b[0m');
    for (const r of steeringFiles) console.log(`    \x1b[31m✕\x1b[0m ${r.path}`);
    console.log('');
  }

  const promptFiles = removals.filter((r) => r.type === 'prompt');
  if (promptFiles.length) {
    console.log('  \x1b[1mPrompt Shortcuts\x1b[0m');
    for (const r of promptFiles) console.log(`    \x1b[31m✕\x1b[0m ${r.path}`);
    console.log('');
  }

  const hookFiles = removals.filter((r) => r.type === 'hook');
  if (hookFiles.length) {
    console.log('  \x1b[1mHooks\x1b[0m');
    for (const r of hookFiles) console.log(`    \x1b[31m✕\x1b[0m ${r.path}`);
    console.log('');
  }
}

// ── .viewgraph data directory ──

if (vgDirInfo) {
  console.log('  \x1b[1m.viewgraph/ Data Directory\x1b[0m');
  console.log(`    Contains: ${vgDirInfo.captureCount} DOM capture(s), screenshots, annotations,`);
  console.log('    project config, and auth tokens.');
  console.log(`    Total size: ${formatSize(vgDirInfo.totalSize)}`);
  console.log('');
  console.log('    Keeping this directory lets you re-install ViewGraph later');
  console.log('    with all your capture history intact.');
  console.log('');

  const removeData = await ask('  Delete .viewgraph/ and all capture data? (y/N) ');
  if (removeData) {
    try {
      rmSync(vgDir, { recursive: true, force: true });
      console.log(`  \x1b[32m✓\x1b[0m Deleted .viewgraph/ (${formatSize(vgDirInfo.totalSize)})`);
    } catch (e) { console.log(`  \x1b[33m⚠\x1b[0m Could not remove .viewgraph/: ${e.message}`); }
  } else {
    console.log('  \x1b[36m ℹ \x1b[0m Kept .viewgraph/ — your captures and config are preserved');
  }
  console.log('');
}

// ── Remove config files ──

if (removals.length > 0) {
  const proceed = await ask('  Remove ViewGraph configuration files listed above? (y/N) ');
  if (!proceed) { console.log('\n  Cancelled.\n'); process.exit(0); }
  console.log('');

  for (const r of removals.filter((r) => r.type === 'mcp-config')) {
    try {
      const config = JSON.parse(readFileSync(r.configPath, 'utf-8'));
      delete config.mcpServers.viewgraph;
      writeFileSync(r.configPath, JSON.stringify(config, null, 2) + '\n');
      console.log(`  \x1b[32m✓\x1b[0m Removed viewgraph from ${r.path}`);
    } catch (e) { console.log(`  \x1b[33m⚠\x1b[0m Could not update ${r.path}: ${e.message}`); }
  }

  for (const r of removals.filter((r) => r.type !== 'mcp-config')) {
    try { rmSync(r.fullPath); console.log(`  \x1b[32m✓\x1b[0m Removed ${r.path}`); }
    catch (e) { console.log(`  \x1b[33m⚠\x1b[0m Could not remove ${r.path}: ${e.message}`); }
  }
}

console.log('\n  \x1b[32mViewGraph uninstalled.\x1b[0m\n');
