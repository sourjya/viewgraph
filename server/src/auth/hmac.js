/**
 * HMAC Request Signing
 *
 * Signs and verifies HTTP requests using HMAC-SHA256.
 * The signature covers method + path + timestamp + body hash,
 * making each request unique and replay-proof.
 *
 * @see docs/decisions/ADR-015-hmac-signed-localhost.md
 */

import { createHmac, createHash, timingSafeEqual } from 'crypto';

/**
 * Sign a request.
 * @param {string} secret - Hex-encoded session key
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Request path (/captures, /info, etc.)
 * @param {string} timestamp - Unix ms as string
 * @param {string} bodyHash - SHA256 hex of request body
 * @returns {string} HMAC-SHA256 hex signature
 */
export function sign(secret, method, path, timestamp, bodyHash) {
  const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  return createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Verify a request signature using constant-time comparison.
 * @param {string} secret - Hex-encoded session key
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} timestamp - Unix ms as string
 * @param {string} bodyHash - SHA256 hex of request body
 * @param {string} signature - Signature to verify
 * @returns {boolean}
 */
export function verify(secret, method, path, timestamp, bodyHash, signature) {
  const expected = sign(secret, method, path, timestamp, bodyHash);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

/**
 * Hash a request body.
 * @param {string} body - Request body string
 * @returns {string} SHA256 hex
 */
export function hashBody(body) {
  return createHash('sha256').update(body || '').digest('hex');
}
