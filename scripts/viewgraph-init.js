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

import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, accessSync, chmodSync, readdirSync, statSync, constants as fsConstants } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Check if source file is newer than destination, or destination doesn't exist.
 * Used to update power assets (prompts, hooks, steering) when ViewGraph is updated.
 */
function shouldCopy(src, dest) {
  if (!existsSync(dest)) return true;
  try {
    const srcStat = statSync(src);
    const destStat = statSync(dest);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch { return true; }
}

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

// Check for npm updates (non-blocking)
const CURRENT_VERSION = JSON.parse(readFileSync(path.join(VIEWGRAPH_ROOT, 'package.json'), 'utf-8')).version;

const W = 42;
const line1 = ` </>  ViewGraph v${CURRENT_VERSION}`;
const line2 = ' The UI context layer for AI agents';
console.log(`
  \u250c${'\u2500'.repeat(W)}\u2510
  \u2502\x1b[1m\x1b[38;5;141m${line1}\x1b[0m${' '.repeat(W - line1.length)}\u2502
  \u2502\x1b[38;5;245m${line2}\x1b[0m${' '.repeat(W - line2.length)}\u2502
  \u2514${'\u2500'.repeat(W)}\u2518
`);

try {
  const res = await fetch('https://registry.npmjs.org/@viewgraph/core/latest', { signal: AbortSignal.timeout(3000) });
  if (res.ok) {
    const { version: latest } = await res.json();
    if (latest !== CURRENT_VERSION && latest > CURRENT_VERSION) {
      console.log(`  \x1b[33m⚠ ViewGraph ${latest} available (you have ${CURRENT_VERSION}). Run: npm update -g @viewgraph/core\x1b[0m\n`);
    }
  }
} catch { /* offline or timeout - skip silently */ }

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

// 3b. Parse --url flags and write URL patterns to config.json
// Usage: npx viewgraph-init --url localhost:3000 --url staging.myapp.com
const urlPatterns = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--url' && process.argv[i + 1]) {
    urlPatterns.push(process.argv[++i]);
  }
}
const configPath = path.join(CWD, '.viewgraph', 'config.json');
let config = {};
try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* no existing config */ }

// Ensure feature flag defaults exist (additive - never overwrite user values)
const DEFAULTS = { autoAudit: false, baselineAutoCompare: false, smartSuggestions: false };
let configChanged = false;
for (const [key, val] of Object.entries(DEFAULTS)) {
  if (config[key] === undefined) { config[key] = val; configChanged = true; }
}

if (urlPatterns.length > 0) {
  config.urlPatterns = [...new Set([...(config.urlPatterns || []), ...urlPatterns])];
  configChanged = true;
  console.log(`  URL patterns: ${config.urlPatterns.join(', ')}`);
} else if (!config.urlPatterns) {
  config.urlPatterns = [];
  configChanged = true;
}

if (configChanged || !existsSync(configPath)) {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

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
      if (existsSync(src) && shouldCopy(src, dest)) {
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
      if (existsSync(src) && shouldCopy(src, dest)) {
        writeFileSync(dest, readFileSync(src, 'utf-8'));
        if (file.endsWith('.sh')) chmodSync(dest, 0o755);
        console.log(`  Installed hook: ${file}`);
      }
    }
  }

  // Copy prompts from power/ directory (distributable assets)
  const srcPrompts = path.join(VIEWGRAPH_ROOT, 'power', 'prompts');
  const promptsDir = path.join(CWD, '.kiro', 'prompts');
  if (existsSync(srcPrompts)) {
    ensureDir(promptsDir);
    for (const file of readdirSync(srcPrompts).filter((f) => f.startsWith('vg-'))) {
      const src = path.join(srcPrompts, file);
      const dest = path.join(promptsDir, file);
      if (shouldCopy(src, dest)) {
        writeFileSync(dest, readFileSync(src, 'utf-8'));
        console.log(`  Installed prompt: ${file}`);
      }
    }
  }
}

console.log('\nStarting ViewGraph server...\n');

// 7. Start a ViewGraph server for this project (detached)
// Only kill an existing server if it's using the SAME captures dir.
// If the default port is taken by another project's server, auto-increment.
import { spawn, execSync } from 'child_process';
import { createConnection } from 'net';

/**
 * Check if a port is in use by attempting a TCP connection.
 * @param {number} p - Port to check
 * @returns {Promise<boolean>} true if port is in use
 */
function isPortTaken(p) {
  return new Promise((resolve) => {
    const sock = createConnection({ port: p, host: '127.0.0.1' });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

/**
 * Find a free port starting from the default.
 * Scans 9876-9879 (matches the extension's PORT_SCAN_RANGE of 4).
 * @returns {Promise<number>}
 */
async function findFreePort() {
  const base = parseInt(process.env.VIEWGRAPH_HTTP_PORT || '9876', 10);
  for (let p = base; p < base + 4; p++) {
    if (!(await isPortTaken(p))) return p;
  }
  return base; // fallback - server will fail with EADDRINUSE and log it
}

// Only kill a server that's serving THIS project's captures dir
try {
  const escapedEntry = SERVER_ENTRY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
  const pids = execSync(`pgrep -f "${escapedEntry}"`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  for (const pid of pids) {
    // Check if this server is using our captures dir by reading /proc/pid/environ or cmdline
    try {
      const environ = execSync(`cat /proc/${pid}/environ 2>/dev/null | tr '\\0' '\\n' | grep VIEWGRAPH_CAPTURES_DIR || true`, { encoding: 'utf-8' });
      if (environ.includes(absCapturesDir)) {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`  Stopped existing server (PID ${pid})`);
      }
    } catch {
      // Can't read environ (macOS, permissions) - skip, don't kill blindly
    }
  }
} catch { /* no existing server */ }

const port = await findFreePort();

const server = spawn('node', [SERVER_ENTRY], {
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, VIEWGRAPH_CAPTURES_DIR: absCapturesDir, VIEWGRAPH_HTTP_PORT: String(port) },
});
server.unref();
console.log(`  Started (PID ${server.pid}, port ${port})`);
console.log('  Extension popup should show green dot.\n');

// ── Native messaging host registration (automatic) ──
// Registers for both Chrome and Firefox so the extension can use
// native messaging instead of localhost HTTP (more secure).
const CHROME_EXT_ID = 'dmgbneoidgmkdcfnlegmfijkedijjnjj';
const FIREFOX_EXT_ID = 'viewgraph@chaoslabz.com';

if (!process.argv.includes('--skip-native-host')) {
  try {
    const { installHost } = await import(path.resolve(__dirname, '..', 'server', 'src', 'native-host-register.js'));
    const hostScript = path.resolve(__dirname, '..', 'server', 'index.js');

    // Chrome
    try {
      const result = installHost(hostScript, CHROME_EXT_ID, 'chrome');
      console.log(`  ✓ Native messaging host registered for Chrome`);
      console.log(`    ${result.path}`);
    } catch (e) { console.log(`  ⚠ Chrome native host: ${e.message}`); }

    // Firefox
    try {
      const result = installHost(hostScript, FIREFOX_EXT_ID, 'firefox');
      console.log(`  ✓ Native messaging host registered for Firefox`);
      console.log(`    ${result.path}`);
    } catch (e) { console.log(`  ⚠ Firefox native host: ${e.message}`); }

    console.log('  🔒 Extension will use native messaging (more secure than HTTP)');
  } catch (err) {
    console.log(`  ⚠ Native host registration skipped: ${err.message}`);
    console.log('  Extension will fall back to HMAC-signed HTTP');
  }
} else {
  console.log('  ⚠ Native host registration skipped (--skip-native-host)');
}

console.log('\nDone.\n');
