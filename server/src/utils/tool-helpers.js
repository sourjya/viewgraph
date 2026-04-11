/**
 * Tool Helpers - Shared Utilities for MCP Tool Handlers
 *
 * Common patterns extracted from 13+ tool files to reduce duplication.
 * Each helper returns MCP-formatted responses on error so tools can
 * early-return without duplicating error handling.
 *
 * @see docs/architecture/code-quality-audit-2026-04-12.md - CQ-14 pattern
 */

import { readFile } from 'fs/promises';
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
      ? `Error: Capture not found: ${filename}. Use list_captures to see available files.`
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
