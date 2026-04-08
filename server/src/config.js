/**
 * Configuration Resolver
 *
 * Resolves the captures directory from multiple sources in priority order:
 *   1. Environment variable (VIEWGRAPH_CAPTURES_DIR)
 *   2. .viewgraphrc.json in the project root (or any ancestor directory)
 *   3. Default: .viewgraph/captures relative to cwd
 *
 * Handles WSL path translation automatically  -  if running in WSL and the
 * resolved path is a Windows-style path (C:\...), it's converted to the
 * /mnt/c/... equivalent. This lets users share one config file across
 * Windows (extension) and WSL (MCP server) environments.
 *
 * Config file format (.viewgraphrc.json):
 * {
 *   "capturesDir": "C:\\Users\\sourj\\Downloads\\viewgraph-captures",
 *   "maxCaptures": 50,
 *   "httpPort": 9090
 * }
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { ENV_CAPTURES_DIR, ENV_MAX_CAPTURES, ENV_HTTP_PORT, LOG_PREFIX, PROJECT_PREFIX, DEFAULT_HTTP_PORT } from './constants.js';

const CONFIG_FILENAME = `.${PROJECT_PREFIX}rc.json`;

/**
 * Detect if we're running inside WSL.
 */
function isWSL() {
  try {
    // /proc/version contains "microsoft" or "WSL" on WSL
    const version = readFileSync('/proc/version', 'utf-8');
    return /microsoft|wsl/i.test(version);
  } catch {
    return false;
  }
}

/**
 * Convert a Windows path (C:\Users\...) to WSL mount path (/mnt/c/Users/...).
 * Returns the path unchanged if it's already a Unix path.
 */
function windowsToWSLPath(p) {
  // Match drive letter pattern: C:\ or C:/
  const match = p.match(/^([A-Za-z]):[/\\](.*)/);
  if (!match) return p;
  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

/**
 * Search for .viewgraphrc.json starting from startDir and walking up to root.
 */
function findConfigFile(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

/**
 * Load and parse the config file. Returns null if not found or invalid.
 */
function loadConfigFile(startDir) {
  const configPath = findConfigFile(startDir);
  if (!configPath) return null;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    console.error(`${LOG_PREFIX} Config loaded from ${configPath}`);
    return config;
  } catch (err) {
    console.error(`${LOG_PREFIX} Warning: could not parse ${configPath}: ${err.message}`);
    return null;
  }
}

/**
 * Resolve a path, applying WSL translation if needed.
 */
function resolvePath(p) {
  if (isWSL()) {
    p = windowsToWSLPath(p);
  }
  return path.resolve(p);
}

/**
 * Resolve all configuration values.
 * Priority: env vars > config file > defaults.
 */
export function resolveConfig(cwd = process.cwd()) {
  const fileConfig = loadConfigFile(cwd) || {};

  const capturesDir = resolvePath(
    process.env[ENV_CAPTURES_DIR]
    || fileConfig.capturesDir
    || path.join(cwd, '.viewgraph', 'captures'),
  );

  const maxCaptures = parseInt(
    process.env[ENV_MAX_CAPTURES]
    || fileConfig.maxCaptures
    || '50',
    10,
  );

  const httpPort = parseInt(
    process.env[ENV_HTTP_PORT]
    || fileConfig.httpPort
    || String(DEFAULT_HTTP_PORT),
    10,
  );

  return { capturesDir, maxCaptures, httpPort };
}
