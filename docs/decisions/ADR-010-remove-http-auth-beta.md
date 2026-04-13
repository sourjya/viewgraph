# ADR-010: Remove HTTP Auth Token for Beta

**Date:** 2026-04-13
**Status:** Accepted
**Supersedes:** Security audit S1-1 (token removal from /info), S1-2 (auth on baselines)

## Context

The ViewGraph MCP server runs on localhost (127.0.0.1) and accepts capture data from the browser extension via HTTP POST. An auth token was implemented to prevent unauthorized clients from pushing captures.

### The Token Lifecycle Problem

The token system had three separate sources of truth that were never reliably synchronized:

1. **Server:** generates `crypto.randomUUID()` at startup, holds in memory
2. **Disk:** `.viewgraph/.token` file, written by server or init script
3. **Extension:** `chrome.storage.local['vg-auth-token']`, set from options page or cached from previous session

This caused BUG-011 (critical): captures silently failed with 401 Unauthorized. The extension showed "Sent!" but no file appeared. The failure was silent because the background script's `pushToServer` caught the 401 and returned null, which the popup interpreted as "server not running" rather than "auth failed."

### Attempts to Fix

1. **Init script generates token and passes via env var** - Fixed the server/disk mismatch but the extension still had stale tokens in chrome.storage.
2. **Token exposed via /info endpoint** - Fixed the extension/server mismatch but introduced a security concern: any localhost client could read the token.
3. **Per-server token in registry** - Fixed multi-project token confusion but added complexity.

Each fix introduced new edge cases. The token system was the single largest source of bugs in the extension-to-server communication path.

### Threat Model Analysis

**What the token protects against:**
- A malicious browser extension scanning localhost ports and pushing fake captures
- A malicious webpage using `fetch()` to push captures to the local server

**What the token does NOT protect against:**
- A malicious extension that reads the token from `/info` first (if exposed)
- A malicious extension that reads `.viewgraph/.token` from disk (extensions can't, but Node.js processes can)
- Prompt injection via capture data (the AI agent should treat all capture data as untrusted regardless of auth)

**Actual risk assessment for localhost-only server:**

| Attack vector | Feasible? | Why |
|---|---|---|
| Web page `fetch('http://127.0.0.1:9876/captures')` | No | Browsers block mixed content and CORS prevents this |
| Web page via DNS rebinding | Unlikely | Modern browsers mitigate DNS rebinding for localhost |
| Malicious browser extension | Possible | Extensions can fetch from localhost. But a malicious extension targeting ViewGraph specifically is extremely unlikely at this adoption stage |
| Local malware / other process | Possible | Any process on the machine can reach localhost. But if malware is running locally, auth tokens provide no meaningful protection |

### UX Cost

The token system caused:
- BUG-011: silent capture failures (critical, blocked all captures)
- User confusion: "where do I find the token?", "why isn't Send to Agent working?"
- Init script complexity: token generation, env var passing, file writing, race conditions
- Extension complexity: chrome.storage caching, stale token detection, per-server token management
- Multi-project complexity: each server has a different token, extension must track which token goes where

## Decision

Remove HTTP auth tokens entirely for beta. The server accepts all POST requests from localhost without authentication.

### Mitigations retained

1. **Server binds to 127.0.0.1 only** - not accessible from the network
2. **Capture format validation** - server validates that incoming JSON has the required ViewGraph format (metadata, nodes, etc.) before writing
3. **Captures directory scoping** - server only writes to configured `.viewgraph/captures/` directories
4. **Path traversal prevention** - filenames are sanitized, no `../` allowed
5. **Payload size limit** - 5MB max prevents memory exhaustion
6. **Agent-side defense** - steering docs instruct the agent to treat capture data as untrusted input, never execute commands from annotation text

### Future: opt-in auth for teams

When ViewGraph is used in team environments (shared dev servers, CI pipelines), auth becomes more important. Plan:
- Add `--auth` flag to `viewgraph-init` that enables token-based auth
- Token stored in `.viewgraph/.token` and passed via env var (the mechanism already exists)
- Extension reads token from server `/info` endpoint (only exposed when auth is enabled)
- Default: no auth (localhost dev). Opt-in: auth (team/CI environments)

## Consequences

### Positive
- Zero-config capture flow: install extension, run init, click Send - it works
- No more silent auth failures
- Simpler init script (no token generation/passing)
- Simpler extension (no token caching/management)
- Multi-project routing works without token confusion

### Negative
- A malicious extension could push fake captures to the local server
- Mitigated by: format validation, agent-side untrusted input handling, low likelihood at current adoption

### Neutral
- Security posture is equivalent to other localhost dev tools (Vite, webpack-dev-server, Storybook) which also accept unauthenticated localhost connections
