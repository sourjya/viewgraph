# Telemetry Endpoint Authentication - Spec

## Problem Statement

The current telemetry design (M17) has an open HTTPS endpoint that accepts anonymous JSON. This is trivially abusable:

1. **Data flooding** - anyone who discovers the endpoint URL (it's in the open-source codebase) can POST millions of fake events, corrupting analytics data and inflating costs
2. **Data poisoning** - an attacker can send plausible-looking but fabricated events (e.g., fake tool_called events with inflated durations) to skew product decisions
3. **Replay attacks** - captured legitimate payloads can be replayed indefinitely
4. **Impersonation** - anyone can generate a UUID and pretend to be a ViewGraph install

Client-side rate limiting is meaningless - an attacker bypasses the client entirely and hits the endpoint directly.

## Threat Model

| Threat | Severity | Current Mitigation | Gap |
|---|---|---|---|
| Bulk fake events from scripts | High | None | Endpoint is open |
| Poisoned events with plausible data | High | None | No proof of origin |
| Replay of captured legitimate payloads | Medium | None | No replay protection |
| Enumeration of install IDs | Low | Random UUIDs | UUIDs are unguessable but unverified |
| DDoS on telemetry endpoint | Medium | None | Standard infra problem |
| Reverse-engineering the auth scheme | Medium | N/A | Attacker has full source code |

The fundamental constraint: **the source code is open (AGPL)**. Any secret embedded in the code is not a secret. The auth scheme must work even when the attacker has read every line of the implementation.

## Design: Signed Telemetry with Registration Handshake

### Core Idea

Each ViewGraph install registers once with the telemetry server and receives a signing key. All subsequent event batches are signed with HMAC-SHA256 using that key. The server verifies the signature before accepting events.

This doesn't prevent a determined attacker from registering their own install and sending fake data - but it raises the cost from "one curl command" to "write a program that mimics the full registration flow," and it gives the server the ability to revoke abusive installs.

### Registration Flow

```
INSTALL (first run)                    TELEMETRY SERVER
    |                                       |
    |  1. POST /v1/register                 |
    |     { installId, platform, version,   |
    |       challenge: sha256(installId +   |
    |         timestamp + buildHash) }      |
    |  -----------------------------------> |
    |                                       |  2. Validate challenge
    |                                       |     (proves client has real build)
    |                                       |  3. Generate HMAC signing key
    |                                       |  4. Store: installId -> key
    |  <----------------------------------- |
    |  { signingKey: "hex...",              |
    |    expiresAt: "2026-07-12T..." }      |
    |                                       |
    |  5. Store signingKey locally          |
    |     (chrome.storage.local /           |
    |      .viewgraph/.telemetry-key)       |
```

### Event Submission Flow

```
CLIENT                                 TELEMETRY SERVER
    |                                       |
    |  POST /v1/events                      |
    |  Headers:                             |
    |    X-VG-Install: <installId>          |
    |    X-VG-Timestamp: <unix-ms>          |
    |    X-VG-Signature: <hmac-sha256>      |
    |  Body: { events: [...] }              |
    |  -----------------------------------> |
    |                                       |  1. Look up signingKey by installId
    |                                       |  2. Verify HMAC signature
    |                                       |  3. Check timestamp within 5-min window
    |                                       |  4. Check per-install rate limit
    |                                       |  5. Accept or reject
    |  <----------------------------------- |
    |  200 OK / 401 / 429                   |
```

### Signature Computation

```javascript
const payload = JSON.stringify(body);
const message = `${installId}:${timestamp}:${payload}`;
const signature = hmacSha256(signingKey, message);
```

The signature covers:
- **installId** - ties the signature to a specific install
- **timestamp** - prevents replay (server rejects if > 5 minutes old)
- **payload** - prevents tampering with event data in transit

### Build Hash Challenge

The registration challenge proves the client is running a real ViewGraph build, not a script:

```javascript
const buildHash = sha256(TELEMETRY_BUILD_TOKEN);
const challenge = sha256(installId + timestamp + buildHash);
```

`TELEMETRY_BUILD_TOKEN` is a value injected at build time by the CI/CD pipeline. It's not in the source code - it's set as a build environment variable and embedded into the compiled extension and server bundles.

- **Open source repo:** contains `process.env.VG_BUILD_TOKEN || 'dev'`
- **Official builds:** CI injects a real token that changes per release
- **Dev builds:** use `'dev'` - the telemetry server accepts dev tokens but flags them separately

This means:
- Official extension store builds have a valid token that attackers can't predict for future releases
- Self-built copies work but are distinguishable from official builds
- Attackers can extract the token from a published build, but it rotates on each release

### Key Rotation

- Signing keys expire after 90 days
- Client detects `401 Expired` response and re-registers automatically
- Server can force rotation by returning `401 Rotate` on any request
- Old keys are invalidated immediately on rotation

### Revocation

The server can revoke any install ID:
- Revoked installs get `403 Revoked` on all requests
- Client stops sending telemetry (treats as permanent disable)
- Used for: detected abuse patterns, anomalous event volumes, poisoned data sources

## Server-Side Protections (Defense in Depth)

These apply regardless of the auth scheme:

### Rate Limiting

| Scope | Limit | Window |
|---|---|---|
| Per install ID | 1 request | 4 minutes |
| Per install ID | 50 requests | 24 hours |
| Per IP (registration only) | 10 registrations | 1 hour |
| Global | 10,000 requests | 1 minute |

Rate limits are enforced server-side. Exceeding returns `429`.

### Payload Validation

- Max body size: 50KB
- Max events per batch: 100
- Each event must have: `event` (string, from known enum), `installId` (UUID format), `timestamp` (ISO 8601, within 24 hours of server time)
- Unknown event names are rejected (not silently accepted)
- Unknown parameters are stripped (not stored)
- All string values truncated to 200 chars

### Anomaly Detection

Server-side heuristics (not in client code):
- Flag installs sending > 10x median event volume
- Flag installs sending events for tools that don't exist in their declared version
- Flag installs with registration timestamps far in the future
- Flagged installs are quarantined (data stored separately, excluded from analytics)

### Replay Protection

- Timestamp in signature must be within 5 minutes of server time
- Server tracks last-seen timestamp per install ID - rejects timestamps older than the last accepted batch (monotonic enforcement)
- Same payload+timestamp combination rejected (dedup by hash)

## What This Does NOT Prevent

Being honest about limitations:

1. **Determined attacker with official build** - can extract the build token, register, and send plausible fake data. Mitigation: anomaly detection flags unusual patterns.
2. **Sybil attack** - attacker registers thousands of installs. Mitigation: per-IP registration rate limit + anomaly detection on registration patterns.
3. **Slow-drip poisoning** - attacker sends a small number of plausible events over time. Mitigation: this is the hardest attack to detect. Statistical outlier detection on event distributions is the only defense.

The goal is not perfect security (impossible with open-source client) but raising the cost of abuse high enough that it's not worth the effort for the data we're collecting (anonymous feature usage counts).

## Privacy Implications

The auth scheme introduces two new pieces of data:

1. **Signing key per install** - stored locally and on the telemetry server. The server can correlate all events from one install, which was already true with the install ID. No new privacy risk.
2. **Build hash** - reveals whether the user is running an official build vs. self-built. This is not PII but should be documented in TELEMETRY.md.
3. **IP address at registration** - used for rate limiting only, not stored with the install record. Must be explicitly excluded from logs.

## Changes to Existing Telemetry Spec

### requirements.md additions

- FR-5.8: All event batches must be signed with HMAC-SHA256 using a per-install signing key
- FR-5.9: Signing keys are obtained via a one-time registration handshake on first telemetry flush
- FR-5.10: Registration includes a build-hash challenge proving the client is a real ViewGraph build
- FR-5.11: Signing keys expire after 90 days; client re-registers automatically
- FR-5.12: Server rejects events with timestamps more than 5 minutes from server time
- FR-5.13: Server enforces per-install rate limits (1 req/4min, 50 req/day)
- FR-5.14: Server validates event names against a known enum; unknown events are rejected
- FR-5.15: Server can revoke install IDs; revoked clients stop sending permanently

### design.md additions

- Registration flow diagram
- Signature computation algorithm
- Build token injection via CI
- Key rotation and revocation flows
- Server-side rate limiting and anomaly detection

## Tasks

### Task A: Build token infrastructure
- [ ] Add `VG_BUILD_TOKEN` env var to CI/CD pipeline (GitHub Actions)
- [ ] Inject token at build time into extension bundle (`wxt.config.js` define) and server bundle
- [ ] Fallback to `'dev'` for local development builds
- [ ] Document in CI config

### Task B: Registration endpoint
- [ ] `POST /v1/register` - accepts installId, platform, version, challenge, timestamp
- [ ] Validate challenge: `sha256(installId + timestamp + buildHash)` matches known build tokens
- [ ] Generate random 256-bit signing key, store in DB keyed by installId
- [ ] Return `{ signingKey, expiresAt }` (90-day expiry)
- [ ] Per-IP rate limit: 10 registrations per hour
- [ ] Tests: valid registration succeeds, invalid challenge rejected, rate limit enforced

### Task C: Signed event submission
- [ ] Client: compute HMAC-SHA256 signature over `installId:timestamp:payload`
- [ ] Client: include `X-VG-Install`, `X-VG-Timestamp`, `X-VG-Signature` headers
- [ ] Server: verify signature, check timestamp window (5 min), check rate limit
- [ ] Server: return 401 on invalid signature, 401 Expired on expired key, 429 on rate limit
- [ ] Client: on 401 Expired, re-register and retry once
- [ ] Client: on 403 Revoked, permanently disable telemetry for this install
- [ ] Tests: valid signature accepted, tampered payload rejected, expired key triggers re-register, replay rejected

### Task D: Payload validation
- [ ] Server: validate event names against known enum (reject unknown)
- [ ] Server: validate installId is UUID format
- [ ] Server: validate timestamp within 24 hours of server time
- [ ] Server: strip unknown parameters from events
- [ ] Server: enforce 50KB max body, 100 events max per batch
- [ ] Server: monotonic timestamp enforcement per install
- [ ] Tests: unknown event rejected, oversized payload rejected, future timestamp rejected

### Task E: Anomaly detection (server-side, post-MVP)
- [ ] Track event volume per install per day
- [ ] Flag installs > 10x median volume
- [ ] Flag installs claiming tool names not in their declared version
- [ ] Quarantine flagged installs (separate storage, excluded from analytics)
- [ ] Admin endpoint to review and revoke flagged installs

### Task F: Update TELEMETRY.md
- [ ] Document the registration handshake
- [ ] Document that build hash reveals official vs. self-built (not PII)
- [ ] Document signing key storage locations
- [ ] Document what happens on revocation
