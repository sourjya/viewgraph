/**
 * Source Linker
 *
 * Maps DOM elements to source files by searching the project codebase for
 * matching identifiers: data-testid, aria-label, component names, and text.
 *
 * Search strategy (ordered by confidence):
 * 1. data-testid - grep for exact testid string in source files
 * 2. aria-label - grep for exact label string
 * 3. CSS selector fragments - grep for id or class names
 * 4. Visible text - grep for unique text content (lowest confidence)
 *
 * Only searches UI source files (.jsx, .tsx, .vue, .svelte, .html, .js, .ts).
 * Skips node_modules, dist, build, .git, and other non-source directories.
 *
 * @see docs/roadmap/roadmap.md - M15.1 bidirectional element linking
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';

/** File extensions to search. */
const SOURCE_EXTS = new Set(['.jsx', '.tsx', '.vue', '.svelte', '.html', '.js', '.ts', '.css']);

/** Directories to skip. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', '.nuxt', '.output', '.viewgraph', 'coverage']);

/** Maximum files to search (safety limit). */
const MAX_FILES = 5000;

/** Maximum file size to read (skip large bundles). */
const MAX_FILE_SIZE = 200 * 1024;

/**
 * Find source file locations for a DOM element.
 * @param {string} projectRoot - Absolute path to the project root
 * @param {{ testid?: string, ariaLabel?: string, selector?: string, text?: string }} query
 * @returns {Promise<Array<{ file: string, line: number, match: string, confidence: string }>>}
 */
export async function findSource(projectRoot, query) {
  const results = [];
  const files = await collectSourceFiles(projectRoot);

  // Build search terms ordered by confidence
  const searches = [];
  if (query.testid) {
    searches.push({ pattern: query.testid, confidence: 'high', label: `data-testid="${query.testid}"` });
  }
  if (query.ariaLabel) {
    searches.push({ pattern: query.ariaLabel, confidence: 'high', label: `aria-label="${query.ariaLabel}"` });
  }
  if (query.selector) {
    // Extract id or meaningful class from selector
    const idMatch = query.selector.match(/#([\w-]+)/);
    if (idMatch) searches.push({ pattern: idMatch[1], confidence: 'medium', label: `id="${idMatch[1]}"` });
    const classMatch = query.selector.match(/\.([\w-]{4,})/);
    if (classMatch) searches.push({ pattern: classMatch[1], confidence: 'low', label: `class="${classMatch[1]}"` });
  }
  if (query.text && query.text.length >= 4 && query.text.length <= 60) {
    searches.push({ pattern: query.text, confidence: 'low', label: `text "${query.text}"` });
  }

  if (searches.length === 0) return results;

  for (const file of files) {
    let content;
    try { content = await readFile(file, 'utf-8'); } catch { continue; }

    const lines = content.split('\n');
    for (const search of searches) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(search.pattern)) {
          const relPath = path.relative(projectRoot, file);
          results.push({
            file: relPath,
            line: i + 1,
            match: search.label,
            confidence: search.confidence,
            context: lines[i].trim().slice(0, 120),
          });
        }
      }
    }
    // Stop early if we have enough high-confidence results
    if (results.filter((r) => r.confidence === 'high').length >= 5) break;
  }

  // Sort: high confidence first, then by file path
  results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.confidence] - order[b.confidence]) || a.file.localeCompare(b.file);
  });

  return results.slice(0, 20);
}

/**
 * Recursively collect source files from a project directory.
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>}
 */
async function collectSourceFiles(dir) {
  const files = [];
  await walk(dir, files);
  return files;
}

/** Recursive directory walker with safety limits. */
async function walk(dir, files, depth = 0) {
  if (depth > 10 || files.length >= MAX_FILES) return;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (files.length >= MAX_FILES) return;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), files, depth + 1);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SOURCE_EXTS.has(ext)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
}
