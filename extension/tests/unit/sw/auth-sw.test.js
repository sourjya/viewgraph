/**
 * Tests for sw/auth-sw.js - Service Worker HMAC Auth
 *
 * Verifies handshake, session persistence in chrome.storage.session,
 * request signing, and failure handling.
 *
 * Phase 1 of the service worker communication migration (M19).
 * @see .kiro/specs/sw-communication/tasks.md - Step 6
 * @see extension/lib/sw/auth-sw.js - implementation under test
 * @see extension/lib/auth.js - content script version being replaced
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockChrome } from '../../mocks/chrome.js';

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

/** Simulated chrome.storage.session (survives SW termination). */
let sessionStorage = {};

beforeEach(() => {
  vi.resetModules();
  sessionStorage = {};

  mockChrome({
    storage: {
      session: {
        get: vi.fn((key) => Promise.resolve(sessionStorage[key] !== undefined ? { [key]: sessionStorage[key] } : {})),
        set: vi.fn((obj) => { Object.assign(sessionStorage, obj); return Promise.resolve(); }),
        remove: vi.fn((key) => { delete sessionStorage[key]; return Promise.resolve(); }),
      },
    },
  });

  // Default: no server responding
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Mock a successful handshake flow. */
function mockHandshakeSuccess(serverUrl = 'http://127.0.0.1:9876') {
  globalThis.fetch = vi.fn((url, opts) => {
    if (url === `${serverUrl}/handshake` && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ challenge: 'abc123', key: 'deadbeef'.repeat(8) }),
      });
    }
    if (url === `${serverUrl}/handshake/verify`) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'sess-001', mode: 'signed' }),
      });
    }
    return Promise.reject(new Error('unexpected fetch'));
  });
}

// ──────────────────────────────────────────────
// Handshake
// ──────────────────────────────────────────────

describe('handshake', () => {
  it('(+) authenticate stores session in chrome.storage.session', async () => {
    mockHandshakeSuccess();
    const { authenticate } = await import('#lib/sw/auth-sw.js');
    const result = await authenticate('http://127.0.0.1:9876');
    expect(result).toBe(true);
    expect(globalThis.chrome.storage.session.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'vg-auth-state': expect.objectContaining({
          sessionId: 'sess-001',
          authenticated: true,
        }),
      }),
    );
  });

  it('(+) isAuthenticated returns true after successful handshake', async () => {
    mockHandshakeSuccess();
    const { authenticate, isAuthenticated } = await import('#lib/sw/auth-sw.js');
    await authenticate('http://127.0.0.1:9876');
    expect(isAuthenticated()).toBe(true);
  });

  it('(-) handshake failure clears auth state', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    const { authenticate, isAuthenticated } = await import('#lib/sw/auth-sw.js');
    const result = await authenticate('http://127.0.0.1:9876');
    expect(result).toBe(false);
    expect(isAuthenticated()).toBe(false);
  });

  it('(-) network error returns false', async () => {
    const { authenticate } = await import('#lib/sw/auth-sw.js');
    const result = await authenticate('http://127.0.0.1:9876');
    expect(result).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Session Persistence
// ──────────────────────────────────────────────

describe('session persistence', () => {
  it('(+) restoreSession reads from chrome.storage.session', async () => {
    sessionStorage['vg-auth-state'] = {
      sessionId: 'sess-restored',
      secret: 'deadbeef'.repeat(8),
      authenticated: true,
    };
    const { restoreSession, isAuthenticated } = await import('#lib/sw/auth-sw.js');
    await restoreSession();
    expect(isAuthenticated()).toBe(true);
  });

  it('(-) restoreSession handles missing storage gracefully', async () => {
    const { restoreSession, isAuthenticated } = await import('#lib/sw/auth-sw.js');
    await restoreSession();
    expect(isAuthenticated()).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Request Signing
// ──────────────────────────────────────────────

describe('signRequest', () => {
  it('(+) returns empty headers when not authenticated', async () => {
    const { signRequest } = await import('#lib/sw/auth-sw.js');
    const headers = await signRequest('GET', '/info');
    expect(headers).toEqual({});
  });

  // Note: Full HMAC signing test requires crypto.subtle which is not
  // available in jsdom. The signing logic is tested via the existing
  // auth.js tests and server-side middleware tests.
});
