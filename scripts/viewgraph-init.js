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

import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, accessSync, chmodSync, readdirSync, constants as fsConstants } from 'fs';
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
        env: { VIEWGRAPH_CAPTURES_DIR: path.resolve(CWD, '.viewgraph', 'captures') },
        autoApprove: [
          'list_captures', 'get_capture', 'get_latest_capture', 'get_page_summary',
          'get_elements_by_role', 'get_interactive_elements', 'find_missing_testids',
          'audit_accessibility', 'compare_captures', 'get_annotations',
          'get_annotation_context', 'request_capture', 'get_request_status', 'get_fidelity_report',
          'audit_layout',
        ],
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
// Persist detected agent name for server /info endpoint
writeFileSync(path.join(CWD, '.viewgraph', '.agent'), agent ? agent.name : 'Agent');

// 4. Add .viewgraph to .gitignore if not already there
const gitignorePath = path.join(CWD, '.gitignore');
if (existsSync(gitignorePath)) {
  const content = readFileSync(gitignorePath, 'utf-8');
  if (!content.includes('.viewgraph')) {
    appendFileSync(gitignorePath, '\n# ViewGraph - captures, tokens, local config\n.viewgraph/\n');
    console.log('  Updated .gitignore');
  } else if (content.includes('.viewgraph/captures') && !content.match(/^\.viewgraph\/?\s*$/m)) {
    // Upgrade: old installs only ignored captures/ - widen to entire dir
    const updated = content.replace(/# ViewGraph captures\n\.viewgraph\/captures\/?\n?/, '# ViewGraph - captures, tokens, local config\n.viewgraph/\n');
    writeFileSync(gitignorePath, updated);
    console.log('  Upgraded .gitignore (.viewgraph/captures → .viewgraph/)');
  }
} else {
  writeFileSync(gitignorePath, '# ViewGraph - captures, tokens, local config\n.viewgraph/\n');
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

// 6. For Kiro: install steering docs and hooks
if (agent?.name === 'Kiro') {
  const steeringDir = path.join(CWD, '.kiro', 'steering');
  const hooksDir = path.join(CWD, '.kiro', 'hooks');
  const srcSteering = path.join(VIEWGRAPH_ROOT, 'power', 'steering');
  const srcHooks = path.join(VIEWGRAPH_ROOT, 'power', 'hooks');

  // Copy steering docs if source exists
  if (existsSync(srcSteering)) {
    ensureDir(steeringDir);
    for (const file of ['viewgraph-workflow.md', 'viewgraph-resolution.md', 'viewgraph-hostile-dom.md']) {
      const src = path.join(srcSteering, file);
      const dest = path.join(steeringDir, file);
      if (existsSync(src) && !existsSync(dest)) {
        writeFileSync(dest, readFileSync(src, 'utf-8'));
        console.log(`  Installed steering: ${file}`);
      }
    }
  }

  // Copy hooks if source exists (both .kiro.hook JSON and legacy .sh scripts)
  if (existsSync(srcHooks)) {
    ensureDir(hooksDir);
    for (const file of readdirSync(srcHooks)) {
      const src = path.join(srcHooks, file);
      const dest = path.join(hooksDir, file);
      if (existsSync(src) && !existsSync(dest)) {
        writeFileSync(dest, readFileSync(src, 'utf-8'));
        if (file.endsWith('.sh')) chmodSync(dest, 0o755);
        console.log(`  Installed hook: ${file}`);
      }
    }
  }

  // Copy prompts if source exists
  const srcPrompts = path.join(VIEWGRAPH_ROOT, '.kiro', 'prompts');
  const promptsDir = path.join(CWD, '.kiro', 'prompts');
  if (existsSync(srcPrompts)) {
    ensureDir(promptsDir);
    for (const file of readdirSync(srcPrompts).filter((f) => f.startsWith('vg-'))) {
      const src = path.join(srcPrompts, file);
      const dest = path.join(promptsDir, file);
      if (!existsSync(dest)) {
        writeFileSync(dest, readFileSync(src, 'utf-8'));
        console.log(`  Installed prompt: ${file}`);
      }
    }
  }
}

console.log('\nDone. Starting ViewGraph server...\n');

// 7. Kill any existing ViewGraph server, then start fresh (detached)
import { spawn, execSync } from 'child_process';
try {
  const pids = execSync(`pgrep -f "${SERVER_ENTRY.replace(/\//g, '\\/')}"`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  for (const pid of pids) {
    process.kill(Number(pid), 'SIGTERM');
    console.log(`  Stopped existing server (PID ${pid})`);
  }
} catch { /* no existing server */ }

const server = spawn('node', [SERVER_ENTRY], {
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, VIEWGRAPH_CAPTURES_DIR: absCapturesDir },
});
server.unref();
const port = process.env.VIEWGRAPH_HTTP_PORT || 9876;
console.log(`Server started (PID ${server.pid}, port ${port}). Extension popup should show green dot.`);
