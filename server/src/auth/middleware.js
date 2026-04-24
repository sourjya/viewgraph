/**
 * HTTP Auth Middleware
 *
 * Validates HMAC-signed requests. Provides handshake endpoints for
 * session establishment. Supports unsigned mode when requireAuth=false.
 *
 * Exempt routes: GET /health, GET /handshake, POST /handshake/verify
 *
 * @see docs/decisions/ADR-015-hmac-signed-localhost.md
 */

import { randomBytes } from 'crypto';
import { sign, verify, hashBody } from './hmac.js';
import { createSessionStore } from './session-store.js';

/** Max age for request timestamps (30 seconds). */
const MAX_TIMESTAMP_AGE_MS = 30_000;

/** Challenge nonce TTL (60 seconds). */
const CHALLENGE_TTL_MS = 60_000;

/** Routes that bypass auth. */
const EXEMPT_ROUTES = new Set(['/health', '/handshake']);

/**
 * Create the auth middleware and handshake handlers.
 * @param {{ secret: string, requireAuth?: boolean }} opts
 * @returns {{ handleHandshake, handleVerify, validateRequest }}
 */
export function createAuthMiddleware({ secret, requireAuth = false }) {
  const sessionStore = createSessionStore();
  const pendingChallenges = new Map();

  /**
   * GET /handshake - issue a challenge nonce.
   * @returns {{ challenge: string }}
   */
  function handleHandshake() {
    const challenge = randomBytes(32).toString('hex');
    pendingChallenges.set(challenge, Date.now());
    // Clean expired challenges and enforce max size
    for (const [c, t] of pendingChallenges) {
      if (Date.now() - t > CHALLENGE_TTL_MS) pendingChallenges.delete(c);
    }
    if (pendingChallenges.size > 50) {
      const oldest = [...pendingChallenges.entries()].sort((a, b) => a[1] - b[1])[0];
      if (oldest) pendingChallenges.delete(oldest[0]);
    }
    return { challenge, key: secret };
  }

  /**
   * POST /handshake/verify - validate challenge response and create session.
   * @param {{ response: string }} body
   * @returns {{ sessionId: string, mode: string } | null}
   */
  function handleVerify(body) {
    if (!body?.response || !secret) return null;
    // Find matching challenge
    for (const [challenge, timestamp] of pendingChallenges) {
      if (Date.now() - timestamp > CHALLENGE_TTL_MS) {
        pendingChallenges.delete(challenge);
        continue;
      }
      // Compute expected: HMAC(secret, challenge)
      const expected = sign(secret, 'HANDSHAKE', challenge, '', '');
      if (body.response.length === expected.length && verify(secret, 'HANDSHAKE', challenge, '', '', body.response)) {
        pendingChallenges.delete(challenge);
        const { sessionId } = sessionStore.create(challenge);
        return { sessionId, mode: 'signed' };
      }
    }
    return null;
  }

  /**
   * Validate a request's HMAC signature.
   * @param {{ method: string, url: string, headers: object, body?: string }} req
   * @returns {{ valid: boolean, reason?: string }}
   */
  function validateRequest(req) {
    const { method, url } = req;
    const path = url.split('?')[0];

    // Exempt routes
    if (EXEMPT_ROUTES.has(path)) return { valid: true };
    if (method === 'POST' && path === '/handshake/verify') return { valid: true };
    if (method === 'OPTIONS') return { valid: true };

    const sessionId = req.headers['x-vg-session'];
    const timestamp = req.headers['x-vg-timestamp'];
    const signature = req.headers['x-vg-signature'];

    // No auth headers - check if unsigned mode is allowed
    if (!sessionId && !signature) {
      return requireAuth ? { valid: false, reason: 'auth-required' } : { valid: true };
    }

    // Has auth headers - validate them
    if (!sessionId || !timestamp || !signature) {
      return { valid: false, reason: 'incomplete-headers' };
    }

    // Validate session
    if (!sessionStore.validate(sessionId)) {
      return { valid: false, reason: 'invalid-session' };
    }

    // Validate timestamp (30s window)
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_TIMESTAMP_AGE_MS) {
      return { valid: false, reason: 'expired-timestamp' };
    }

    // Validate signature
    const bodyHash = hashBody(req.body || '');
    if (!verify(secret, method, path, timestamp, bodyHash, signature)) {
      return { valid: false, reason: 'invalid-signature' };
    }

    return { valid: true };
  }

  return { handleHandshake, handleVerify, validateRequest };
}
