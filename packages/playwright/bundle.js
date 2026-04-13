/**
 * ViewGraph Bundle Builder for Playwright
 *
 * Reads ViewGraph extension source modules and produces a single
 * injectable script string for Playwright's page.addScriptTag().
 * Reuses the same pattern proven in the bulk capture experiment.
 *
 * The extension modules use ES module syntax (import/export) which
 * can't run inside page.evaluate(). This bundler strips the module
 * syntax and exposes all needed functions on window.__vg.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path to the extension lib directory relative to this package. */
const EXT_LIB = join(__dirname, '..', '..', 'extension', 'lib');

/**
 * Files to bundle, in dependency order.
 * Each file's exports are collected and exposed on window.__vg.
 */
const MODULE_FILES = [
  'visibility-collector.js',
  'traverser.js',
  'salience.js',
  'serializer.js',
  'html-snapshot.js',
];

/**
 * Strip ES module import/export syntax from source code.
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

/** Cached bundle string - built once per process. */
let _cached = null;

/**
 * Build the injectable script string from extension modules.
 * When running from the repo, reads source files directly.
 * When installed from npm, falls back to the pre-built bundle.
 * Cached after first call.
 * @returns {Promise<string>}
 */
export async function buildBundle() {
  if (_cached) return _cached;

  // Try reading from extension source files (repo context)
  try {
    const parts = ['(function() {', '"use strict";'];
    for (const file of MODULE_FILES) {
      const source = await readFile(join(EXT_LIB, file), 'utf-8');
      parts.push(`\n// --- ${file} ---`);
      parts.push(stripModuleSyntax(source));
    }
    parts.push('\nwindow.__vg = { checkRendered, traverseDOM, scoreElement, classifyTier, scoreAll, serialize, captureSnapshot };');
    parts.push('})();');
    _cached = parts.join('\n');
    return _cached;
  } catch {
    // Extension sources not available (npm install context) - use pre-built
  }

  // Fall back to pre-built bundle
  try {
    const { PREBUILT_BUNDLE } = await import('./bundle-prebuilt.js');
    _cached = PREBUILT_BUNDLE;
    return _cached;
  } catch {
    throw new Error(
      '@viewgraph/playwright: bundle not found. If running from the repo, ensure extension/lib/ exists. ' +
      'If installed from npm, the package may be corrupted - try reinstalling.',
    );
  }
}
