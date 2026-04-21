# F21: HMAC-Signed Localhost Communication - Requirements

## User Stories

### US-1: Authenticated capture submission
**As a** developer running ViewGraph,
**I want** the server to reject capture submissions from unauthorized processes,
**So that** a malicious website or rogue script can't inject fake captures into my project.

**Acceptance criteria:**
- Server generates a session key on startup, writes to `.viewgraph/.session-key`
- Extension reads the key and signs every HTTP request with HMAC-SHA256
- Server validates the signature before processing any capture or config request
- Unsigned requests to protected endpoints return 401

### US-2: Replay protection
**As a** developer,
**I want** each request signature to be unique and time-bound,
**So that** a captured request can't be replayed by an attacker.

**Acceptance criteria:**
- Each request includes a timestamp header
- Server rejects requests with timestamps older than 30 seconds
- Same signature can't be reused (timestamp makes each unique)

### US-3: Graceful degradation
**As a** developer who hasn't run viewgraph-init,
**I want** the extension to still work without authentication,
**So that** the zero-config install path isn't broken.

**Acceptance criteria:**
- If `.session-key` doesn't exist, extension operates in unsigned mode
- Server accepts unsigned requests when `requireAuth` is false (default)
- Sidebar shows a warning indicator when running in unsigned mode
- No user action required to use unsigned mode

### US-4: Transparent to the user
**As a** developer,
**I want** authentication to happen automatically without any configuration,
**So that** I don't need to manage tokens, passwords, or certificates.

**Acceptance criteria:**
- No user-visible auth configuration
- Handshake happens automatically on sidebar open
- Session persists until sidebar close or server restart
- No prompts, dialogs, or manual steps

## Non-Functional Requirements

### NFR-1: Performance
- Handshake adds < 200ms to sidebar open
- Signature computation adds < 1ms per request
- No noticeable latency increase on capture send

### NFR-2: Security
- Session key is 256-bit random (crypto.randomBytes)
- File permissions 0o600 (owner-only read/write)
- Key rotates on every server restart
- HMAC-SHA256 for signature computation
- 30-second replay window

### NFR-3: Compatibility
- Works with existing `npx -y @viewgraph/core` install path
- Works with `npm install -g` install path
- Works with native messaging (key read via native host)
- No new browser permissions required

## Out of Scope

- mTLS or certificate-based auth
- User accounts or registration
- Cross-machine authentication
- Key persistence across server restarts
- Auth for the MCP stdio transport (already process-isolated)
