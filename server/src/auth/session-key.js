/**
 * Session Key Management
 *
 * Generates and reads a 256-bit random secret for HMAC request signing.
 * The key is written to .viewgraph/.session-key with owner-only permissions.
 * Rotates on every server restart (no persistence across sessions).
 *
 * @see docs/decisions/ADR-015-hmac-signed-localhost.md
 */

import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';

const KEY_FILE = '.session-key';

/**
 * Generate a new 256-bit session key and write to disk.
 * @param {string} dir - Directory to write .session-key into
 * @returns {string} Hex-encoded key (64 chars)
 */
export function generateSessionKey(dir) {
  const key = randomBytes(32).toString('hex');
  const filePath = join(dir, KEY_FILE);
  writeFileSync(filePath, key, 'utf-8');
  chmodSync(filePath, 0o600);
  return key;
}

/**
 * Read the session key from disk.
 * @param {string} dir - Directory containing .session-key
 * @returns {string|null} Hex-encoded key or null if not found
 */
export function readSessionKey(dir) {
  try {
    return readFileSync(join(dir, KEY_FILE), 'utf-8').trim();
  } catch {
    return null;
  }
}
