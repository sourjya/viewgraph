/**
 * Session Store Tests
 * @see server/src/auth/session-store.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSessionStore } from '#src/auth/session-store.js';

let store;
beforeEach(() => { store = createSessionStore(); });

describe('createSessionStore', () => {
  it('(+) create returns sessionId and stores challenge', () => {
    const { sessionId } = store.create('challenge123');
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(10);
  });

  it('(+) validate returns true for active session', () => {
    const { sessionId } = store.create('challenge123');
    expect(store.validate(sessionId)).toBe(true);
  });

  it('(-) validate returns false for unknown session', () => {
    expect(store.validate('nonexistent')).toBe(false);
  });

  it('(+) revoke invalidates session', () => {
    const { sessionId } = store.create('challenge123');
    store.revoke(sessionId);
    expect(store.validate(sessionId)).toBe(false);
  });

  it('(+) getChallenge returns stored challenge', () => {
    const { sessionId } = store.create('my-challenge');
    expect(store.getChallenge(sessionId)).toBe('my-challenge');
  });

  it('(-) expired sessions are invalid', () => {
    vi.useFakeTimers();
    const { sessionId } = store.create('challenge', { ttlMs: 1000 });
    expect(store.validate(sessionId)).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(store.validate(sessionId)).toBe(false);
    vi.useRealTimers();
  });
});
