# ADR-015: HMAC-Signed Localhost Communication

- **Status**: Accepted
- **Date**: 2026-04-21

## Context

ViewGraph's extension communicates with the MCP server via unauthenticated localhost HTTP. Any process on the machine can POST to port 9876-9879. This is the #1 remaining security gap identified across SRR-001 through SRR-004 (threat #1: malicious page POSTs fake captures, threat #3: page JS reads /info).

Previous attempt (pre-beta): bearer token in headers. Failed because:
- Token was visible in DevTools Network tab
- Token sync between extension and server was fragile (race conditions on startup)
- Token rotation required restart
- Users reported "silent auth failures" as the #1 support issue

ADR-010 removed HTTP auth for beta. This ADR introduces a replacement that avoids those problems.

## Decision

Implement HMAC-signed requests for all extension-to-server HTTP communication. The shared secret is file-based (never transmitted over HTTP), and each request signature is unique (replay-proof).

### Protocol

**Server startup:**
1. Server generates a 256-bit random secret using `crypto.randomBytes(32)`
2. Writes to `.viewgraph/.session-key` (hex-encoded, 64 chars)
3. File permissions set to owner-only (`0o600`)
4. Secret rotates on every server restart (no persistence across sessions)

**Extension handshake:**
1. Extension calls `GET /handshake` (unauthenticated, localhost only)
2. Server returns a one-time `challenge` nonce
3. Extension reads `.session-key` via `chrome.runtime.sendMessage` to background script
4. Background script reads the file using `fetch('file://...')` or native messaging
5. Extension computes `HMAC-SHA256(secret, challenge)` and sends to `POST /handshake/verify`
6. Server validates, returns a `sessionId` (UUID)
7. All subsequent requests include `X-VG-Session` header with the sessionId

**Request signing (every request after handshake):**
```
X-VG-Session: <sessionId>
X-VG-Timestamp: <unix-ms>
X-VG-Signature: HMAC-SHA256(secret, method + path + timestamp + bodyHash)
```

**Server validation:**
1. Check `X-VG-Session` matches an active session
2. Check `X-VG-Timestamp` is within 30 seconds of server time (replay window)
3. Compute expected signature, compare with `X-VG-Signature`
4. Reject if any check fails (401 Unauthorized)

**Exemptions (unauthenticated):**
- `GET /health` - needed for port scanning/discovery
- `GET /handshake` - initiates the auth flow
- `POST /handshake/verify` - completes the auth flow

### Why HMAC Over Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Bearer token** (previous) | Simple | Visible in headers, replayable, sync issues | Rejected (failed in practice) |
| **HMAC-signed** (this ADR) | Secret never in headers, replay-proof, file-based | More complex, requires crypto | **Accepted** |
| **mTLS** | Industry standard | Overkill for localhost, certificate management | Rejected |
| **OAuth/OIDC** | Standard auth flow | Requires auth server, way too heavy | Rejected |
| **WebAuthn** | Hardware-backed | Browser API, not applicable to extension-server | Rejected |
| **Native messaging** | Eliminates HTTP entirely | Requires host manifest install, not default yet | Future (ADR-016) |

### Why File-Based Secret

The secret lives in `.viewgraph/.session-key` on the filesystem. This means:
- Only processes with filesystem access to the project directory can authenticate
- A malicious website cannot read local files (browser sandbox prevents this)
- A rogue browser extension would need `file://` access AND knowledge of the project path
- The secret rotates on every server restart (no long-lived credentials)

This is the same trust model as SSH keys, Docker sockets, and Kubernetes kubeconfig files.

## Implementation Plan

### Phase 1: Server-side signing infrastructure
- `server/src/auth/session-key.js` - generate, write, read session key
- `server/src/auth/hmac.js` - sign and verify functions
- `server/src/auth/session-store.js` - active session tracking
- Middleware in `http-receiver.js` - validate signature on protected routes
- `/handshake` and `/handshake/verify` endpoints

### Phase 2: Extension-side signing
- `extension/lib/auth.js` - read session key, compute HMAC, manage session
- Update `transport.js` - add signing headers to all requests
- Update `discovery.js` - handshake after port discovery
- Background script file reader for `.session-key`

### Phase 3: Graceful degradation
- If extension can't read session key (permissions, file not found): fall back to unsigned mode
- Server config option: `requireAuth: true|false` (default: false for beta, true post-1.0)
- Warning banner in sidebar when running in unsigned mode

### Phase 4: Native messaging default (ADR-016)
- `viewgraph-init` registers native messaging host manifest
- Extension auto-detects native messaging availability
- Falls back to HMAC-signed HTTP if native messaging unavailable
- Eliminates need for HMAC entirely when native messaging is active

## Security Properties

| Property | How it's achieved |
|---|---|
| **No visible credentials** | Secret never in HTTP headers (only the signature) |
| **Replay protection** | Timestamp + 30s window, unique signature per request |
| **Origin verification** | File-based secret = only local processes with fs access |
| **Session isolation** | Each extension connection gets a unique sessionId |
| **Rotation** | Secret regenerated on every server restart |
| **Graceful degradation** | Falls back to unsigned mode if auth unavailable |

## Threats Mitigated

| Threat (from STRIDE model) | Before | After |
|---|---|---|
| #1: Malicious page POSTs fake captures | Open (any localhost process) | Mitigated (requires HMAC signature) |
| #3: Page JS reads /info and /captures | Open | Mitigated (requires session) |
| S1-2: Unauthenticated capture injection | Accepted risk (ADR-010) | Mitigated |
| S1-3: Config poisoning via native messaging | Fixed (whitelist) | Also signed when via HTTP |

## Consequences

- Extension startup adds ~100ms for handshake
- Server writes one file on startup (`.session-key`)
- `transport.js` adds 3 headers to every request (~200 bytes)
- Unsigned mode remains available for development/debugging
- Native messaging (Phase 4) makes HMAC unnecessary but HMAC remains as fallback

## References

- [ADR-010](ADR-010-remove-http-auth-beta.md) - Why bearer token was removed
- [SRR-001](../security/SRR-001-2026-04-18.md) - S1-2: unauthenticated injection finding
- [SRR-004](../security/SRR-004-2026-04-21-T3.md) - S1-3: native messaging whitelist bypass
- [STRIDE Threat Model](../architecture/threat-model-stride.md) - Threats #1, #3
