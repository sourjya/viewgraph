# F21: HMAC-Signed Localhost Communication - Design

## Architecture

```
Server Startup
  │
  ├── Generate 256-bit secret → .viewgraph/.session-key (0o600)
  │
  └── Start HTTP receiver with auth middleware

Extension Opens Sidebar
  │
  ├── discoverServer() finds port
  │
  ├── GET /handshake → receives challenge nonce
  │
  ├── Read .session-key (via background script)
  │
  ├── POST /handshake/verify { hmac(secret, challenge) }
  │     └── Server validates → returns sessionId
  │
  └── All subsequent requests signed:
        X-VG-Session: <sessionId>
        X-VG-Timestamp: <unix-ms>
        X-VG-Signature: HMAC-SHA256(secret, method+path+ts+bodyHash)
```

## Server Components

### session-key.js
```js
// server/src/auth/session-key.js
export function generateSessionKey(dir)  // → writes .session-key, returns hex string
export function readSessionKey(dir)      // → reads .session-key, returns hex string or null
```

### hmac.js
```js
// server/src/auth/hmac.js
export function sign(secret, method, path, timestamp, bodyHash)  // → hex signature
export function verify(secret, method, path, timestamp, bodyHash, signature)  // → boolean
export function hashBody(body)  // → SHA256 hex of request body
```

### session-store.js
```js
// server/src/auth/session-store.js
export function createSessionStore()
// Returns: { create(challenge) → sessionId, validate(sessionId) → boolean, revoke(sessionId) }
// Sessions expire after 24 hours or server restart
```

### HTTP Middleware
```js
// In http-receiver.js handleRequest():
// 1. Skip auth for: GET /health, GET /handshake, POST /handshake/verify
// 2. If requireAuth=false and no signature headers: allow (unsigned mode)
// 3. If signature headers present: validate or reject
// 4. If requireAuth=true and no signature: reject 401
```

## Extension Components

### auth.js
```js
// extension/lib/auth.js
export async function authenticate(serverUrl)  // → { sessionId, secret } or null
export function signRequest(secret, method, path, body)  // → { headers }
export function isAuthenticated()  // → boolean
export function clearAuth()  // called on destroy
```

### transport.js changes
```js
// Before every _query() and _send():
if (isAuthenticated()) {
  const { headers } = signRequest(secret, method, path, body);
  Object.assign(fetchOptions.headers, headers);
}
```

### discovery.js changes
```js
// After discoverServer() finds a port:
// 1. Attempt authenticate(serverUrl)
// 2. If succeeds: signed mode
// 3. If fails: unsigned mode (log warning)
```

## Endpoint Design

### GET /handshake
```
Response: { challenge: "<random-32-byte-hex>" }
```
No auth required. Challenge is single-use, expires in 60 seconds.

### POST /handshake/verify
```
Request:  { response: "<hmac-sha256(secret, challenge)>" }
Response: { sessionId: "<uuid>", mode: "signed" }
```
No auth required (this IS the auth). Server validates HMAC against stored challenge.

### Protected endpoints (all others)
```
Headers:
  X-VG-Session: <sessionId>
  X-VG-Timestamp: <unix-ms>
  X-VG-Signature: <hmac-sha256(secret, method+path+timestamp+bodyHash)>
```

## Unsigned Mode

When `.session-key` doesn't exist or extension can't read it:
- Extension sends requests without auth headers
- Server accepts if `requireAuth: false` (default)
- Sidebar footer shows a small unlocked icon next to the status dot
- Tooltip: "Unsigned mode - run viewgraph-init for authenticated communication"

## Data Flow

```
Extension                          Server
    │                                 │
    │  GET /handshake                 │
    │ ──────────────────────────────▶ │
    │  { challenge: "abc123..." }     │
    │ ◀────────────────────────────── │
    │                                 │
    │  [read .session-key from disk]  │
    │  [compute hmac(secret, challenge)]
    │                                 │
    │  POST /handshake/verify         │
    │  { response: "def456..." }      │
    │ ──────────────────────────────▶ │
    │  { sessionId: "uuid-..." }      │
    │ ◀────────────────────────────── │
    │                                 │
    │  POST /captures (signed)        │
    │  X-VG-Session: uuid-...         │
    │  X-VG-Timestamp: 1713700000000  │
    │  X-VG-Signature: 789abc...      │
    │ ──────────────────────────────▶ │
    │  { ok: true }                   │
    │ ◀────────────────────────────── │
```

## Performance Budget

| Operation | Cost | When |
|---|---|---|
| Key generation (server) | < 1ms | Server startup (once) |
| Key file write | < 5ms | Server startup (once) |
| Challenge generation | < 1ms | Per handshake |
| HMAC computation (extension) | < 1ms | Per request |
| HMAC verification (server) | < 1ms | Per request |
| Handshake round-trip | < 100ms | Sidebar open (once) |
