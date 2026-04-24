/**
 * Session Store
 *
 * In-memory store for authenticated sessions. Each session is created
 * during the handshake and validated on every subsequent request.
 * Sessions expire after TTL or server restart.
 *
 * @see docs/decisions/ADR-015-hmac-signed-localhost.md
 */

import { randomUUID } from 'crypto';

/** Default session TTL: 24 hours. */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Create a session store.
 * @returns {{ create: function, validate: function, revoke: function, getChallenge: function }}
 */
export function createSessionStore() {
  const sessions = new Map();

  return {
    /**
     * Create a new session.
     * @param {string} challenge - The handshake challenge nonce
     * @param {{ ttlMs?: number }} [opts]
     * @returns {{ sessionId: string }}
     */
    create(challenge, opts = {}) {
      const sessionId = randomUUID();
      const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
      sessions.set(sessionId, { challenge, createdAt: Date.now(), ttlMs });
      return { sessionId };
    },

    /**
     * Validate a session is active and not expired.
     * @param {string} sessionId
     * @returns {boolean}
     */
    validate(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) return false;
      if (Date.now() - session.createdAt > session.ttlMs) {
        sessions.delete(sessionId);
        return false;
      }
      return true;
    },

    /** Revoke a session. */
    revoke(sessionId) { sessions.delete(sessionId); },

    /** Get the challenge for a session. */
    getChallenge(sessionId) { return sessions.get(sessionId)?.challenge ?? null; },
  };
}
