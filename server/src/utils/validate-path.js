/**
 * Path Validation Utility
 *
 * Shared across all MCP tools that accept filename inputs. Strips directory
 * components via path.basename, then resolves against the captures directory
 * and verifies the result is still within bounds. Prevents path traversal.
 */

import path from 'path';

/**
 * Validate and resolve a capture filename against the allowed directory.
 * @param {string} filename - User-provided filename (from MCP tool input)
 * @param {string} capturesDir - Absolute path to the captures directory
 * @returns {string} Resolved absolute path
 * @throws {Error} If path escapes the captures directory
 */
export function validateCapturePath(filename, capturesDir) {
  const safe = path.basename(filename);
  const resolved = path.resolve(capturesDir, safe);
  if (!resolved.startsWith(path.resolve(capturesDir))) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}
