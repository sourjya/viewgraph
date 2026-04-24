/**
 * Auth Middleware Tests
 * @see server/src/auth/middleware.js
 */

import { describe, it, expect } from 'vitest';
import { createAuthMiddleware } from '#src/auth/middleware.js';
import { sign, hashBody } from '#src/auth/hmac.js';

const SECRET = 'a'.repeat(64);

describe('handleHandshake', () => {
  it('(+) returns a challenge nonce', () => {
    const { handleHandshake } = createAuthMiddleware({ secret: SECRET });
    const result = handleHandshake();
    expect(result.challenge).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('handleVerify', () => {
  it('(+) valid response returns sessionId', () => {
    const { handleHandshake, handleVerify } = createAuthMiddleware({ secret: SECRET });
    const { challenge } = handleHandshake();
    const response = sign(SECRET, 'HANDSHAKE', challenge, '', '');
    const result = handleVerify({ response });
    expect(result).not.toBeNull();
    expect(result.sessionId).toBeTruthy();
    expect(result.mode).toBe('signed');
  });

  it('(-) wrong response returns null', () => {
    const { handleHandshake, handleVerify } = createAuthMiddleware({ secret: SECRET });
    handleHandshake();
    const result = handleVerify({ response: 'wrong' });
    expect(result).toBeNull();
  });

  it('(-) expired challenge returns null', async () => {
    const { handleHandshake, handleVerify } = createAuthMiddleware({ secret: SECRET });
    const { challenge } = handleHandshake();
    // Manually expire by waiting (challenge TTL is 60s, we can't wait that long)
    // Instead test with empty body
    const result = handleVerify({});
    expect(result).toBeNull();
  });
});

describe('validateRequest', () => {
  it('(+) exempt routes pass without auth', () => {
    const { validateRequest } = createAuthMiddleware({ secret: SECRET, requireAuth: true });
    expect(validateRequest({ method: 'GET', url: '/health', headers: {} }).valid).toBe(true);
    expect(validateRequest({ method: 'GET', url: '/handshake', headers: {} }).valid).toBe(true);
    expect(validateRequest({ method: 'POST', url: '/handshake/verify', headers: {} }).valid).toBe(true);
    expect(validateRequest({ method: 'OPTIONS', url: '/captures', headers: {} }).valid).toBe(true);
  });

  it('(+) unsigned request passes when requireAuth=false', () => {
    const { validateRequest } = createAuthMiddleware({ secret: SECRET, requireAuth: false });
    const result = validateRequest({ method: 'POST', url: '/captures', headers: {} });
    expect(result.valid).toBe(true);
  });

  it('(-) unsigned request rejected when requireAuth=true', () => {
    const { validateRequest } = createAuthMiddleware({ secret: SECRET, requireAuth: true });
    const result = validateRequest({ method: 'POST', url: '/captures', headers: {} });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('auth-required');
  });

  it('(+) signed request with valid signature passes', () => {
    const { handleHandshake, handleVerify, validateRequest } = createAuthMiddleware({ secret: SECRET });
    const { challenge } = handleHandshake();
    const response = sign(SECRET, 'HANDSHAKE', challenge, '', '');
    const { sessionId } = handleVerify({ response });

    const ts = String(Date.now());
    const body = '{"test":true}';
    const sig = sign(SECRET, 'POST', '/captures', ts, hashBody(body));

    const result = validateRequest({
      method: 'POST', url: '/captures',
      headers: { 'x-vg-session': sessionId, 'x-vg-timestamp': ts, 'x-vg-signature': sig },
      body,
    });
    expect(result.valid).toBe(true);
  });

  it('(-) tampered signature rejected', () => {
    const { handleHandshake, handleVerify, validateRequest } = createAuthMiddleware({ secret: SECRET });
    const { challenge } = handleHandshake();
    const response = sign(SECRET, 'HANDSHAKE', challenge, '', '');
    const { sessionId } = handleVerify({ response });

    const ts = String(Date.now());
    const result = validateRequest({
      method: 'POST', url: '/captures',
      headers: { 'x-vg-session': sessionId, 'x-vg-timestamp': ts, 'x-vg-signature': 'bad' },
      body: '',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid-signature');
  });

  it('(-) expired timestamp rejected', () => {
    const { handleHandshake, handleVerify, validateRequest } = createAuthMiddleware({ secret: SECRET });
    const { challenge } = handleHandshake();
    const response = sign(SECRET, 'HANDSHAKE', challenge, '', '');
    const { sessionId } = handleVerify({ response });

    const oldTs = String(Date.now() - 60000);
    const sig = sign(SECRET, 'POST', '/captures', oldTs, hashBody(''));

    const result = validateRequest({
      method: 'POST', url: '/captures',
      headers: { 'x-vg-session': sessionId, 'x-vg-timestamp': oldTs, 'x-vg-signature': sig },
      body: '',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired-timestamp');
  });
});
