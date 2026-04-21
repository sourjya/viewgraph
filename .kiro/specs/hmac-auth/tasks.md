# F21: HMAC-Signed Localhost Communication - Tasks

## Phase 1: Server-side auth infrastructure

### Task 1.1: RED - Session key tests
- [ ] Test: generateSessionKey creates 64-char hex file
- [ ] Test: file permissions are 0o600
- [ ] Test: readSessionKey returns the key
- [ ] Test: readSessionKey returns null if file missing
- [ ] Test: key is different on each generation
- **Deliverable:** 5 failing tests in `server/tests/unit/auth/session-key.test.js`

### Task 1.2: GREEN - Implement session-key.js
- [ ] `generateSessionKey(dir)` - crypto.randomBytes(32), write hex to `.session-key`
- [ ] `readSessionKey(dir)` - read file, return hex or null
- [ ] Set file permissions 0o600 via fs.chmodSync
- **Deliverable:** 5 tests pass

### Task 1.3: RED - HMAC signing tests
- [ ] Test: sign() produces consistent output for same inputs
- [ ] Test: sign() produces different output for different inputs
- [ ] Test: verify() returns true for valid signature
- [ ] Test: verify() returns false for tampered signature
- [ ] Test: verify() returns false for wrong timestamp
- [ ] Test: hashBody() produces SHA256 hex
- **Deliverable:** 6 failing tests in `server/tests/unit/auth/hmac.test.js`

### Task 1.4: GREEN - Implement hmac.js
- [ ] `sign(secret, method, path, timestamp, bodyHash)` - HMAC-SHA256
- [ ] `verify(secret, method, path, timestamp, bodyHash, signature)` - constant-time compare
- [ ] `hashBody(body)` - SHA256 of body string
- **Deliverable:** 6 tests pass

### Task 1.5: RED - Session store tests
- [ ] Test: create() returns sessionId
- [ ] Test: validate() returns true for active session
- [ ] Test: validate() returns false for unknown session
- [ ] Test: revoke() invalidates session
- [ ] Test: sessions expire after TTL
- **Deliverable:** 5 failing tests in `server/tests/unit/auth/session-store.test.js`

### Task 1.6: GREEN - Implement session-store.js
- [ ] In-memory Map of sessionId → { createdAt, challenge }
- [ ] create(challenge) → generates UUID sessionId
- [ ] validate(sessionId) → checks existence and TTL
- [ ] revoke(sessionId) → deletes
- **Deliverable:** 5 tests pass

### Task 1.7: RED - Handshake endpoint tests
- [ ] Test: GET /handshake returns challenge nonce
- [ ] Test: POST /handshake/verify with correct HMAC returns sessionId
- [ ] Test: POST /handshake/verify with wrong HMAC returns 401
- [ ] Test: challenge expires after 60 seconds
- **Deliverable:** 4 failing tests

### Task 1.8: GREEN - Implement handshake endpoints
- [ ] Add GET /handshake to http-receiver.js
- [ ] Add POST /handshake/verify to http-receiver.js
- [ ] Generate session key on server startup (index.js)
- **Deliverable:** 4 tests pass

### Task 1.9: RED - Auth middleware tests
- [ ] Test: signed request to /captures passes
- [ ] Test: unsigned request to /captures passes when requireAuth=false
- [ ] Test: unsigned request to /captures rejected when requireAuth=true
- [ ] Test: request with expired timestamp rejected
- [ ] Test: request with tampered signature rejected
- [ ] Test: /health and /handshake bypass auth
- **Deliverable:** 6 failing tests

### Task 1.10: GREEN - Implement auth middleware
- [ ] Extract auth validation into middleware function
- [ ] Apply to all routes except exempted ones
- [ ] Read requireAuth from config (default: false)
- **Deliverable:** 6 tests pass

---

## Phase 2: Extension-side signing

### Task 2.1: RED - Extension auth module tests
- [ ] Test: authenticate() returns sessionId on success
- [ ] Test: authenticate() returns null when key file missing
- [ ] Test: signRequest() adds 3 headers
- [ ] Test: isAuthenticated() reflects state
- [ ] Test: clearAuth() resets state
- **Deliverable:** 5 failing tests in `extension/tests/unit/auth.test.js`

### Task 2.2: GREEN - Implement auth.js
- [ ] authenticate(serverUrl) - handshake flow
- [ ] signRequest(secret, method, path, body) - compute headers
- [ ] isAuthenticated() / clearAuth()
- **Deliverable:** 5 tests pass

### Task 2.3: Wire into transport.js
- [ ] Import auth module
- [ ] Add signing headers to _query() and _send()
- [ ] Skip signing if not authenticated

### Task 2.4: Wire into discovery.js
- [ ] After discoverServer() finds port, attempt authenticate()
- [ ] Log warning if auth fails (unsigned mode)

### Task 2.5: Wire into annotation-sidebar.js
- [ ] Call clearAuth() in destroy()
- [ ] Show unsigned mode indicator in footer if not authenticated

---

## Phase 3: Graceful degradation

### Task 3.1: Unsigned mode indicator
- [ ] Footer shows small unlocked icon when not authenticated
- [ ] Tooltip explains how to enable auth
- [ ] No blocking - everything works, just a visual hint

### Task 3.2: Integration tests
- [ ] Test: full flow - server start → extension handshake → signed capture
- [ ] Test: server start without key → extension works unsigned
- [ ] Test: server restart → extension re-authenticates

---

## Security Checkpoint

- [ ] Verify session key never appears in HTTP headers or logs
- [ ] Verify HMAC uses constant-time comparison (timing attack prevention)
- [ ] Verify challenge nonces are single-use
- [ ] Verify timestamp validation prevents replay
- [ ] Verify file permissions on .session-key
- [ ] Run Tier 1 pre-commit on all new files
