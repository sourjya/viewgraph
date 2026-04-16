#!/usr/bin/env node
/**
 * viewgraph status - Health check CLI
 *
 * Shows the status of the ViewGraph setup in the current project:
 * - Server running/stopped
 * - Captures directory exists and is writable
 * - Number of captures
 * - Agent detected
 * - Extension connection status
 *
 * Run from your project root:
 *   node /path/to/viewgraph/scripts/viewgraph-status.js
 *
 * @see scripts/viewgraph-init.js
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const VIEWGRAPH_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CWD = process.cwd();
const VG_DIR = path.join(CWD, '.viewgraph');
const CAPTURES_DIR = path.join(VG_DIR, 'captures');
const TOKEN_FILE = path.join(VG_DIR, '.token');
const AGENT_FILE = path.join(VG_DIR, '.agent');
const PID_FILE = path.join(VG_DIR, '.pid');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function check(label, ok, detail) {
  const icon = ok ? `${GREEN}[ok]${RESET}` : `${RED}[!!]${RESET}`;
  const msg = detail ? `${DIM}${detail}${RESET}` : '';
  console.log(`  ${icon} ${label} ${msg}`);
  return ok;
}

async function main() {
  const currentVersion = JSON.parse(readFileSync(path.join(VIEWGRAPH_ROOT, 'package.json'), 'utf-8')).version;
  console.log(`\n  ViewGraph Status (v${currentVersion})\n`);

  // Version check
  try {
    const res = await fetch('https://registry.npmjs.org/@viewgraph/core/latest', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const { version: latest } = await res.json();
      if (latest !== currentVersion && latest > currentVersion) {
        console.log(`  ${YELLOW}Update available: v${latest} (current: v${currentVersion})${RESET}`);
        console.log(`  ${YELLOW}Run: npm update -g @viewgraph/core${RESET}\n`);
      }
    }
  } catch { /* offline */ }

  let allOk = true;

  // 1. .viewgraph directory
  allOk &= check('.viewgraph/ directory', existsSync(VG_DIR), existsSync(VG_DIR) ? VG_DIR : 'Run viewgraph-init.js first');

  // 2. Captures directory
  const capturesExist = existsSync(CAPTURES_DIR);
  allOk &= check('captures/ directory', capturesExist);

  // 3. Capture count
  if (capturesExist) {
    const files = readdirSync(CAPTURES_DIR).filter((f) => f.endsWith('.json'));
    check(`captures available`, files.length > 0, `${files.length} capture(s)`);
  }

  // 4. Agent detection
  let agent = 'none';
  if (existsSync(AGENT_FILE)) {
    agent = readFileSync(AGENT_FILE, 'utf-8').trim();
  }
  check('agent detected', agent !== 'none', agent);

  // 5. Server PID
  let serverRunning = false;
  if (existsSync(PID_FILE)) {
    const pid = readFileSync(PID_FILE, 'utf-8').trim();
    try {
      process.kill(parseInt(pid, 10), 0); // Signal 0 = check if alive
      serverRunning = true;
    } catch { /* not running */ }
  }
  allOk &= check('MCP server', serverRunning, serverRunning ? `PID ${readFileSync(PID_FILE, 'utf-8').trim()}` : 'not running - start with npm run dev:server');

  // 6. Server health check
  if (serverRunning) {
    try {
      const _token = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf-8').trim() : null;
      const port = 9876;
      const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        check('server health', true, `port ${port}, ${data.pending} pending request(s)`);
        check('captures dir writable', data.writable);
      } else {
        check('server health', false, `HTTP ${res.status}`);
      }
    } catch (e) {
      check('server health', false, e.message);
    }
  }

  // 7. Auth token
  allOk &= check('auth token', existsSync(TOKEN_FILE), existsSync(TOKEN_FILE) ? 'configured' : 'missing');

  console.log('');
  if (allOk) {
    console.log(`  ${GREEN}All checks passed.${RESET}\n`);
  } else {
    console.log(`  ${YELLOW}Some checks failed. Run viewgraph-init.js to fix.${RESET}\n`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
