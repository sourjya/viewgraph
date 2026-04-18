/**
 * Tool Helpers - Shared Utilities for MCP Tool Handlers
 *
 * Common patterns extracted from 13+ tool files to reduce duplication.
 * Each helper returns MCP-formatted responses on error so tools can
 * early-return without duplicating error handling.
 *
 * @see docs/architecture/code-quality-audit-2026-04-12.md - CQ-14 pattern
 */

import { readFile, readdir } from 'fs/promises';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture, parseSummary, parseMetadata } from '#src/parsers/viewgraph-v2.js';

/**
 * Format a successful MCP tool response with JSON data.
 * @param {object} data - Response data to serialize
 * @returns {{ content: Array }}
 */
export function jsonResponse(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * Format an MCP tool error response.
 * @param {string} msg - Error message
 * @returns {{ content: Array, isError: true }}
 */
export function errorResponse(msg) {
  return { content: [{ type: 'text', text: msg }], isError: true };
}

/**
 * Compute Levenshtein edit distance between two strings.
 * Used for fuzzy filename matching in "did you mean" suggestions.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function editDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Find the closest matching capture filename using fuzzy matching.
 * Returns the best match if the edit distance is within threshold,
 * or if the query is a substring of a filename. Returns null if
 * no reasonable match is found.
 *
 * @param {string} query - The filename the agent provided
 * @param {string} capturesDir - Captures directory path
 * @returns {Promise<string|null>} Best matching filename or null
 */
export async function suggestFilename(query, capturesDir) {
  let files;
  try {
    files = (await readdir(capturesDir)).filter((f) => f.endsWith('.json'));
  } catch { return null; }
  if (files.length === 0) return null;

  const q = query.toLowerCase();

  // Exact substring match (e.g., partial filename without viewgraph- prefix)
  const substringMatch = files.find((f) => f.toLowerCase().includes(q));
  if (substringMatch) return substringMatch;

  // Missing .json extension - exact match
  const withExt = q.endsWith('.json') ? q : q + '.json';
  const exactWithExt = files.find((f) => f.toLowerCase() === withExt);
  if (exactWithExt) return exactWithExt;

  // Levenshtein distance - find closest match
  const maxDist = Math.max(5, Math.floor(query.length * 0.2));
  let best = null;
  let bestDist = Infinity;
  for (const f of files) {
    const d = editDistance(q, f.toLowerCase());
    if (d < bestDist) { bestDist = d; best = f; }
  }
  return bestDist <= maxDist ? best : null;
}

/**
 * Validate a filename, read the capture file, and parse it.
 * Returns `{ ok: true, parsed }` on success, or `{ ok: false, error }` with
 * an MCP-formatted error response on failure.
 *
 * @param {string} filename - Capture filename
 * @param {string} capturesDir - Captures directory path
 * @param {'full'|'summary'|'metadata'} [level='full'] - Parse level
 * @returns {Promise<{ ok: true, parsed: object } | { ok: false, error: object }>}
 */
export async function readAndParse(filename, capturesDir, level = 'full') {
  let filePath;
  try {
    filePath = validateCapturePath(filename, capturesDir);
  } catch {
    return { ok: false, error: errorResponse(`Error: Invalid filename  -  ${filename}`) };
  }

  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    const msg = err.code === 'ENOENT'
      ? await buildNotFoundMessage(filename, capturesDir)
      : `Error reading capture: ${err.message}`;
    return { ok: false, error: errorResponse(msg) };
  }

  const parseFn = level === 'summary' ? parseSummary : level === 'metadata' ? parseMetadata : parseCapture;
  const result = parseFn(content);
  if (!result.ok) {
    return { ok: false, error: errorResponse(`Error parsing capture: ${result.error}`) };
  }

  return { ok: true, parsed: result.data };
}

/**
 * Read and parse two capture files in parallel.
 * Used by comparison tools (compare-captures, compare-styles, etc.).
 * @param {string} fileA - First capture filename
 * @param {string} fileB - Second capture filename
 * @param {string} capturesDir - Captures directory path
 * @param {'full'|'summary'|'metadata'} [level='full'] - Parse level
 * @returns {Promise<{ ok: true, a: object, b: object } | { ok: false, error: object }>}
 */
export async function readAndParsePair(fileA, fileB, capturesDir, level = 'full') {
  const [resA, resB] = await Promise.all([
    readAndParse(fileA, capturesDir, level),
    readAndParse(fileB, capturesDir, level),
  ]);
  if (!resA.ok) return { ok: false, error: resA.error };
  if (!resB.ok) return { ok: false, error: resB.error };
  return { ok: true, a: resA.parsed, b: resB.parsed };
}

/**
 * Read and parse multiple capture files, skipping failures.
 * Used by loop tools (analyze-journey, visualize-flow, etc.).
 * @param {string[]} filenames - Capture filenames
 * @param {string} capturesDir - Captures directory path
 * @param {'full'|'summary'|'metadata'} [level='full'] - Parse level
 * @returns {Promise<Array<{ filename: string, parsed: object }>>}
 */
export async function readAndParseMulti(filenames, capturesDir, level = 'full') {
  const results = [];
  for (const filename of filenames) {
    const { ok, parsed } = await readAndParse(filename, capturesDir, level);
    if (ok) results.push({ filename, parsed });
  }
  return results;
}

/**
 * Build a helpful not-found error message with filename suggestions.
 * Lists the 3 most recent captures so the agent can pick the right one.
 */
async function buildNotFoundMessage(filename, capturesDir) {
  let suggestion = '';
  try {
    // Try fuzzy match first
    const match = await suggestFilename(filename, capturesDir);
    if (match) {
      suggestion = `\nDid you mean: ${match}`;
    } else {
      const files = await readdir(capturesDir);
      const captures = files.filter((f) => f.endsWith('.json')).sort().reverse().slice(0, 3);
      if (captures.length > 0) {
        suggestion = '\nAvailable captures (most recent first):\n' + captures.map((f) => `  - ${f}`).join('\n') + '\nUse list_captures to see all files.';
      }
    }
  } catch { /* dir not readable */ }
  return `Error: Capture not found: "${filename}".${suggestion || ' Use list_captures to see available files.'}`;
}
