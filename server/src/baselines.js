/**
 * Baseline Storage
 *
 * Manages golden capture baselines in .viewgraph/baselines/. Each baseline
 * is a copy of a capture file keyed by normalized URL. Used for structural
 * regression detection - compare new captures against the baseline to find
 * missing elements, layout shifts, and testid changes.
 *
 * @see .kiro/specs/regression-baselines/design.md
 * @see #src/analysis/capture-diff.js - reused for structural comparison
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Normalize a URL into a filesystem-safe baseline key.
 * Strips protocol, query params, hash. Replaces / with -.
 * e.g. "http://localhost:3000/login?foo=1" -> "localhost-3000--login"
 * @param {string} url - Page URL
 * @returns {string} Baseline key (no extension)
 */
export function normalizeUrlToKey(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/:/g, '-');
    const pathPart = parsed.pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index';
    return `${host}--${pathPart}`;
  } catch {
    // Fallback for malformed URLs
    return url.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 100);
  }
}

/**
 * Resolve the baselines directory path from the captures directory.
 * Baselines live alongside captures: .viewgraph/baselines/
 * @param {string} capturesDir - Absolute path to captures directory
 * @returns {string} Absolute path to baselines directory
 */
export function baselinesDir(capturesDir) {
  return path.join(path.dirname(capturesDir), 'baselines');
}

/**
 * Ensure the baselines directory exists.
 * @param {string} capturesDir - Absolute path to captures directory
 */
export async function ensureBaselinesDir(capturesDir) {
  await fs.mkdir(baselinesDir(capturesDir), { recursive: true });
}

/**
 * Save a capture as the baseline for its URL.
 * Copies the file to baselines/ keyed by normalized URL.
 * @param {string} capturesDir - Captures directory path
 * @param {string} filename - Capture filename to promote
 * @returns {{ ok: boolean, baselineKey: string, url: string }}
 */
export async function setBaseline(capturesDir, filename) {
  const srcPath = path.join(capturesDir, filename);
  const content = await fs.readFile(srcPath, 'utf-8');
  const capture = JSON.parse(content);
  const url = capture.METADATA?.url || capture.url;
  if (!url) throw new Error('Capture has no URL in metadata');
  const key = normalizeUrlToKey(url);
  await ensureBaselinesDir(capturesDir);
  const destPath = path.join(baselinesDir(capturesDir), `${key}.json`);
  await fs.writeFile(destPath, content, 'utf-8');
  return { ok: true, baselineKey: key, url };
}

/**
 * Load the baseline capture for a URL.
 * @param {string} capturesDir - Captures directory path
 * @param {string} url - Page URL to look up
 * @returns {object|null} Parsed capture JSON, or null if no baseline
 */
export async function getBaseline(capturesDir, url) {
  const key = normalizeUrlToKey(url);
  const filePath = path.join(baselinesDir(capturesDir), `${key}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * List all stored baselines with metadata.
 * @param {string} capturesDir - Captures directory path
 * @param {string} [urlFilter] - Optional substring filter on URL
 * @returns {Array<{ key: string, url: string, timestamp: string, nodeCount: number }>}
 */
export async function listBaselines(capturesDir, urlFilter) {
  const dir = baselinesDir(capturesDir);
  let files;
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const results = [];
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const content = await fs.readFile(path.join(dir, file), 'utf-8');
      const capture = JSON.parse(content);
      const url = capture.METADATA?.url || capture.url || '';
      if (urlFilter && !url.includes(urlFilter)) continue;
      results.push({
        key: file.replace('.json', ''),
        url,
        timestamp: capture.METADATA?.timestamp || '',
        nodeCount: capture.SUMMARY?.totalElements || capture.NODES?.length || 0,
      });
    } catch { /* skip malformed */ }
  }
  return results;
}
