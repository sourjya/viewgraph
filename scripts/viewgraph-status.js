#!/usr/bin/env node

/**
 * ViewGraph Status Check
 *
 * Quick health check for the entire ViewGraph setup. Shows:
 * - Server status (running, port, PID)
 * - Captures directory (exists, count, latest)
 * - Extension connectivity (can reach server)
 * - MCP config (detected agent, config file)
 * - Auth token status
 *
 * Run from any project root: node /path/to/viewgraph/scripts/viewgraph-status.js
 *
 * @see docs/roadmap/roadmap.md
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const VIEWGRAPH_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function ok(msg) { console.log(`  ${GREEN}\u2713${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}\u2717${RESET} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}!${RESET} ${msg}`); }
function info(msg) { console.log(`  ${DIM}${msg}${RESET}`); }

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

console.log(`\n${GREEN}ViewGraph Status${RESET} ${DIM}(${CWD})${RESET}\n`);

// 1. Captures directory
const capturesDir = path.join(CWD, '.viewgraph', 'captures');
if (existsSync(capturesDir)) {
  const files = readdirSync(capturesDir).filter((f) => f.endsWith('.json'));
  ok(`Captures directory: ${files.length} capture(s)`);
  if (files.length > 0) {
    const sorted = files
      .map((f) => ({ name: f, mtime: statSync(path.join(capturesDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    const latest = sorted[0];
    const ago = Math.floor((Date.now() - latest.mtime) / 60000);
    const timeStr = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
    info(`Latest: ${latest.name} (${timeStr})`);
  }
} else {
  fail('No .viewgraph/captures/ directory - run viewgraph-init.js first');
}

// 2. Auth token
const tokenPath = path.join(CWD, '.viewgraph', '.token');
if (existsSync(tokenPath)) {
  ok('Auth token present');
} else {
  warn('No auth token (.viewgraph/.token) - server may not be initialized');
}

// 3. MCP config detection
const agents = [
  { name: 'Kiro', paths: ['.kiro/settings/mcp.json'] },
  { name: 'Claude Code', paths: ['.mcp.json'] },
  { name: 'Cursor', paths: ['.cursor/mcp.json'] },
  { name: 'Windsurf', paths: ['.windsurf/mcp.json'] },
  { name: 'Cline', paths: ['.cline/mcp.json'] },
];

let foundAgent = null;
for (const agent of agents) {
  for (const p of agent.paths) {
    const full = path.join(CWD, p);
    if (existsSync(full)) {
      try {
        const config = JSON.parse(readFileSync(full, 'utf-8'));
        if (config.mcpServers?.viewgraph) {
          foundAgent = { name: agent.name, path: p };
          break;
        }
      } catch { /* skip */ }
    }
  }
  if (foundAgent) break;
}

if (foundAgent) {
  ok(`MCP config: ${foundAgent.name} (${foundAgent.path})`);
} else {
  fail('No MCP config found for any agent - run viewgraph-init.js');
}

// 4. Server status
async function checkServer() {
  const serverUrl = 'http://localhost:9876';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${serverUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      ok(`Server running at ${serverUrl} (v${data.version || '?'})`);
      if (data.captures !== undefined) {
        info(`Server sees ${data.captures} indexed capture(s)`);
      }
    } else {
      fail(`Server at ${serverUrl} returned ${res.status}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      fail('Server not responding (timeout)');
    } else {
      fail('Server not running at localhost:9876');
    }
    info('Start with: npm run dev:server');
  }
}

// 5. Steering docs and hooks
const steeringDir = path.join(CWD, '.kiro', 'steering');
const hooksDir = path.join(CWD, '.kiro', 'hooks');
const vgSteering = ['viewgraph-workflow.md', 'viewgraph-resolution.md']
  .filter((f) => existsSync(path.join(steeringDir, f)));
const vgHooks = existsSync(hooksDir)
  ? readdirSync(hooksDir).filter((f) => f.startsWith('capture-') || f.startsWith('fix-') || f.startsWith('check-testids'))
  : [];

if (vgSteering.length > 0 || vgHooks.length > 0) {
  ok(`Power assets: ${vgSteering.length} steering doc(s), ${vgHooks.length} hook(s)`);
} else {
  warn('No ViewGraph steering docs or hooks installed');
}

// 6. Gitignore check
const gitignorePath = path.join(CWD, '.gitignore');
if (existsSync(gitignorePath)) {
  const content = readFileSync(gitignorePath, 'utf-8');
  if (content.includes('.viewgraph')) {
    ok('.viewgraph/ is gitignored');
  } else {
    warn('.viewgraph/ is NOT in .gitignore - tokens may leak');
  }
}

// Run async check last
await checkServer();

console.log('');
