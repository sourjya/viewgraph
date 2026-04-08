#!/usr/bin/env node
/**
 * viewgraph init - Project setup CLI
 *
 * Creates .viewgraph/captures/ directory and writes MCP config for the
 * detected AI agent. Run from your project root:
 *
 *   npx viewgraph init
 *
 * Detects: Kiro, Claude Code, Cursor, Windsurf, Cline
 * Falls back to writing a generic .viewgraph/mcp.json if no agent detected.
 *
 * @see docs/decisions/ADR-005-npx-viewgraph-init.md
 * @see .kiro/specs/multi-export/requirements.md
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, accessSync, constants as fsConstants } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.resolve(__dirname, '..', 'server', 'index.js');
const VIEWGRAPH_ROOT = path.resolve(__dirname, '..');
const CWD = process.cwd();

// Agent detection: config dir → config file path
const AGENTS = [
  { name: 'Kiro', dir: '.kiro/settings', file: '.kiro/settings/mcp.json' },
  { name: 'Claude Code', dir: '.claude', file: '.claude/mcp.json' },
  { name: 'Cursor', dir: '.cursor', file: '.cursor/mcp.json' },
  { name: 'Windsurf', dir: '.windsurf', file: '.windsurf/mcp.json' },
  { name: 'Cline', dir: '.cline', file: '.cline/mcp.json' },
];

/** MCP config block for ViewGraph. */
function mcpConfig() {
  return {
    mcpServers: {
      viewgraph: {
        command: 'node',
        args: [SERVER_ENTRY],
        env: { VIEWGRAPH_CAPTURES_DIR: '.viewgraph/captures' },
      },
    },
  };
}

/** Detect which AI agent is configured in this project. */
function detectAgent() {
  for (const agent of AGENTS) {
    if (existsSync(path.join(CWD, agent.dir))) return agent;
  }
  return null;
}

/** Create a directory if it doesn't exist. */
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    console.log(`  Created ${path.relative(CWD, dirPath)}/`);
  } else {
    console.log(`  Exists  ${path.relative(CWD, dirPath)}/`);
  }
}

/** Write MCP config, merging with existing if present. */
function writeMcpConfig(filePath) {
  const relPath = path.relative(CWD, filePath);
  let existing = {};
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch { /* overwrite if corrupt */ }
  }
  const config = mcpConfig();
  const merged = {
    ...existing,
    mcpServers: { ...(existing.mcpServers || {}), ...config.mcpServers },
  };
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`  Wrote   ${relPath}`);
}

/** Verify the captures dir is writable. */
function verifyWritable(dirPath) {
  try {
    accessSync(dirPath, fsConstants.W_OK);
    console.log(`  Verify  ${path.relative(CWD, dirPath)}/ is writable`);
    return true;
  } catch {
    console.error(`  ERROR   ${path.relative(CWD, dirPath)}/ is not writable`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('\nViewGraph Init\n');

// 1. Create captures directory
const capturesDir = path.join(CWD, '.viewgraph', 'captures');
ensureDir(capturesDir);

// 2. Verify writable
verifyWritable(capturesDir);

// 3. Detect agent and write config
const agent = detectAgent();
if (agent) {
  console.log(`\n  Detected ${agent.name}\n`);
  writeMcpConfig(path.join(CWD, agent.file));
} else {
  console.log('\n  No AI agent detected - writing generic config\n');
  writeMcpConfig(path.join(CWD, '.viewgraph', 'mcp.json'));
}

// 4. Add .viewgraph to .gitignore if not already there
const gitignorePath = path.join(CWD, '.gitignore');
if (existsSync(gitignorePath)) {
  const content = readFileSync(gitignorePath, 'utf-8');
  if (!content.includes('.viewgraph/captures')) {
    appendFileSync(gitignorePath, '\n# ViewGraph captures\n.viewgraph/captures/\n');
    console.log('  Updated .gitignore');
  }
} else {
  writeFileSync(gitignorePath, '# ViewGraph captures\n.viewgraph/captures/\n');
  console.log('  Created .gitignore');
}

// 5. Register captures dir in ViewGraph server's allowedDirs
const serverConfigPath = path.join(VIEWGRAPH_ROOT, '.viewgraphrc.json');
const absCapturesDir = path.resolve(capturesDir);
let serverConfig = {};
if (existsSync(serverConfigPath)) {
  try { serverConfig = JSON.parse(readFileSync(serverConfigPath, 'utf-8')); } catch { /* overwrite */ }
}
const allowed = serverConfig.allowedDirs || [];
if (!allowed.includes(absCapturesDir)) {
  allowed.push(absCapturesDir);
  serverConfig.allowedDirs = allowed;
  writeFileSync(serverConfigPath, JSON.stringify(serverConfig, null, 2) + '\n');
  console.log(`  Registered ${absCapturesDir} in server allowedDirs`);
} else {
  console.log(`  Already in server allowedDirs`);
}

console.log('\nDone. Start the server with: npm run dev:server\n');
