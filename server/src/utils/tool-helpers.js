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
    return { ok: false, error: { content: [{ type: 'text', text: `Error: Invalid filename  -  ${filename}` }], isError: true } };
  }

  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    const msg = err.code === 'ENOENT'
      ? await buildNotFoundMessage(filename, capturesDir)
      : `Error reading capture: ${err.message}`;
    return { ok: false, error: { content: [{ type: 'text', text: msg }], isError: true } };
  }

  const parseFn = level === 'summary' ? parseSummary : level === 'metadata' ? parseMetadata : parseCapture;
  const result = parseFn(content);
  if (!result.ok) {
    return { ok: false, error: { content: [{ type: 'text', text: `Error parsing capture: ${result.error}` }], isError: true } };
  }

  return { ok: true, parsed: result.data };
}

/**
 * Build a helpful not-found error message with filename suggestions.
 * Lists the 3 most recent captures so the agent can pick the right one.
 */
async function buildNotFoundMessage(filename, capturesDir) {
  let suggestion = '';
  try {
    const files = await readdir(capturesDir);
    const captures = files.filter((f) => f.endsWith('.json')).sort().reverse().slice(0, 3);
    if (captures.length > 0) {
      suggestion = '\nAvailable captures (most recent first):\n' + captures.map((f) => `  - ${f}`).join('\n') + '\nUse list_captures to see all files.';
    }
  } catch { /* dir not readable */ }
  return `Error: Capture not found: "${filename}".${suggestion || ' Use list_captures to see available files.'}`;
}
