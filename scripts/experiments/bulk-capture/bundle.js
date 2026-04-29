/**
 * Extension Code Bundler
 *
 * Reads ViewGraph extension source modules and produces a single
 * injectable script string for Puppeteer's page.addScriptTag().
 *
 * The extension modules use ES module syntax (import/export) which
 * can't run inside page.evaluate(). This bundler strips the module
 * syntax and exposes all needed functions on window.__vg.
 *
 * Dependency chain:
 *   visibility-collector.js  -> checkRendered
 *   traverser.js             -> traverseDOM (uses checkRendered)
 *   salience.js              -> scoreAll, scoreElement, classifyTier
 *   serializer.js            -> serialize
 *   html-snapshot.js         -> captureSnapshot (independent)
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path to the extension lib directory relative to this file. */
const EXT_LIB = join(__dirname, '..', '..', '..', 'extension', 'lib');

/**
 * Files to bundle, in dependency order. Each file's exports are
 * collected and exposed on window.__vg at the end.
 */
const MODULE_FILES = [
  'collectors/visibility-collector.js',
  'capture/traverser.js',
  'capture/salience.js',
  'capture/serializer.js',
  'capture/html-snapshot.js',
];

/**
 * Strip ES module import/export syntax from source code.
 * Converts `export function foo()` to `function foo()` and
 * removes `import { ... } from '...'` lines entirely (deps
 * are already concatenated in order).
 * @param {string} source - Raw module source
 * @returns {string} Browser-safe source
 */
function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^export\s+(function|const|let|var|class)\s/gm, '$1 ')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
}

/**
 * Build a single injectable script string from extension modules.
 * All public functions are exposed on window.__vg for page.evaluate() access.
 * @returns {Promise<string>} Injectable script content
 */
export async function buildBundle() {
  const parts = [];

  parts.push('// ViewGraph bulk-capture bundle (auto-generated)');
  parts.push('(function() {');
  parts.push('"use strict";');

  for (const file of MODULE_FILES) {
    const source = await readFile(join(EXT_LIB, file), 'utf-8');
    parts.push(`\n// --- ${file} ---`);
    parts.push(stripModuleSyntax(source));
  }

  // Expose key functions on window.__vg
  parts.push('\nwindow.__vg = {');
  parts.push('  checkRendered,');
  parts.push('  traverseDOM,');
  parts.push('  scoreElement,');
  parts.push('  classifyTier,');
  parts.push('  scoreAll,');
  parts.push('  serialize,');
  parts.push('  captureSnapshot,');
  parts.push('};');
  parts.push('})();');

  return parts.join('\n');
}
