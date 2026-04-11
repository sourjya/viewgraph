#!/usr/bin/env node
/**
 * viewgraph doctor - Diagnostic tool
 *
 * Checks for common setup issues and suggests fixes:
 * - Node.js version
 * - npm workspace integrity
 * - Extension build status
 * - Server dependencies
 * - Port conflicts
 *
 * Run from the ViewGraph repo root:
 *   node scripts/viewgraph-doctor.js
 *
 * @see scripts/viewgraph-init.js
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let issues = 0;

function ok(msg) { console.log(`  ${GREEN}[ok]${RESET} ${msg}`); }
function warn(msg, fix) { issues++; console.log(`  ${YELLOW}[!!]${RESET} ${msg}`); if (fix) console.log(`       ${DIM}Fix: ${fix}${RESET}`); }
function fail(msg, fix) { issues++; console.log(`  ${RED}[!!]${RESET} ${msg}`); if (fix) console.log(`       ${DIM}Fix: ${fix}${RESET}`); }

console.log(`\n  ViewGraph Doctor\n`);

// 1. Node.js version
const nodeVersion = process.versions.node.split('.').map(Number);
if (nodeVersion[0] >= 18) {
  ok(`Node.js ${process.version}`);
} else {
  fail(`Node.js ${process.version} - need 18+`, 'Install Node.js 18 LTS or later');
}

// 2. npm version
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  const major = parseInt(npmVersion.split('.')[0], 10);
  if (major >= 9) ok(`npm ${npmVersion}`);
  else warn(`npm ${npmVersion} - recommend 9+`, 'npm install -g npm@latest');
} catch { fail('npm not found', 'Install npm'); }

// 3. Server dependencies
const serverNodeModules = path.join(ROOT, 'server', 'node_modules');
if (existsSync(serverNodeModules)) {
  ok('Server dependencies installed');
} else {
  fail('Server dependencies missing', 'npm install');
}

// 4. Extension dependencies
const extNodeModules = path.join(ROOT, 'extension', 'node_modules');
if (existsSync(extNodeModules)) {
  ok('Extension dependencies installed');
} else {
  fail('Extension dependencies missing', 'npm install');
}

// 5. Extension build
const chromeBuild = path.join(ROOT, 'extension', '.output', 'chrome-mv3');
if (existsSync(chromeBuild)) {
  ok('Chrome extension built');
} else {
  warn('Chrome extension not built', 'npm run build:ext');
}

// 6. Port 9876 availability
try {
  execSync('lsof -i :9876 -t', { encoding: 'utf-8' });
  const pid = execSync('lsof -i :9876 -t', { encoding: 'utf-8' }).trim();
  ok(`Port 9876 in use (PID ${pid}) - server likely running`);
} catch {
  ok('Port 9876 available');
}

// 7. Package.json integrity
const rootPkg = path.join(ROOT, 'package.json');
if (existsSync(rootPkg)) {
  const pkg = JSON.parse(readFileSync(rootPkg, 'utf-8'));
  if (pkg.workspaces?.includes('server') && pkg.workspaces?.includes('extension')) {
    ok('Workspace config valid');
  } else {
    fail('Workspace config missing server/extension', 'Check package.json workspaces');
  }
} else {
  fail('Root package.json missing');
}

// 8. Git hooks
const hooksDir = path.join(ROOT, '.kiro', 'hooks');
if (existsSync(hooksDir)) {
  ok('Kiro hooks directory present');
} else {
  warn('Kiro hooks directory missing');
}

console.log('');
if (issues === 0) {
  console.log(`  ${GREEN}All checks passed. ViewGraph is healthy.${RESET}\n`);
} else {
  console.log(`  ${YELLOW}${issues} issue(s) found. See fixes above.${RESET}\n`);
}
