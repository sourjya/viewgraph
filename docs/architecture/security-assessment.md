# ViewGraph Security Assessment

**Date:** 2026-04-08
**Scope:** MCP server, browser extension, HTTP communication layer
**Audience:** Developers and testers using ViewGraph in local development environments

---

## Threat Model

ViewGraph is a developer tool that runs entirely on localhost. The threat model
assumes a trusted developer operating on their own machine. The primary risks
come from other software on the same machine (malicious websites, compromised
browser tabs) interacting with the localhost HTTP receiver.

---

## Assessed Risks

### 1. Unauthorized HTTP POST to localhost receiver

**Risk:** Any page or script running in the browser can make requests to
`localhost:9876`. A malicious website could submit fake captures, flood the
request queue, or inject crafted JSON that an agent later reads and acts on.

**Severity:** Medium

**Status:** MITIGATED

**Fix:** Shared secret token authentication on all POST endpoints.
- Server generates a random UUID token at startup (or reads from `VIEWGRAPH_HTTP_SECRET` env var)
- Token is logged to stderr so the developer can configure the extension
- All POST requests must include `Authorization: Bearer <token>`
- GET endpoints (/health, /requests/pending) remain open for monitoring
- Extension reads the token from `chrome.storage.local`

**Residual risk:** The token is transmitted in plaintext over localhost HTTP.
Acceptable because localhost traffic is not routable and cannot be intercepted
without local machine compromise, which is outside our threat model.

### 2. Path traversal on capture/snapshot writes

**Risk:** The HTTP receiver generates filenames from capture metadata (URL,
timestamp). A crafted `metadata.url` could produce a filename containing
path traversal sequences (`../`), writing files outside the captures directory.

**Severity:** Medium

**Status:** MITIGATED

**Fix:** All write paths now use `validateCapturePath()` which:
1. Strips directory components via `path.basename()`
2. Resolves against the target directory
3. Verifies the resolved path is still within bounds
4. Applied to both `/captures` and `/snapshots` endpoints

### 3. Capture content injection (prompt injection via DOM data)

**Risk:** A crafted capture could contain malicious text in node attributes,
visible text, or aria-labels that influences agent behavior when the agent
reads the capture through MCP tools. Annotation comments are a higher-risk
vector since they're free-text that the agent reads as context.

**Severity:** Low

**Status:** MITIGATED (defense in depth)

**Mitigations:**
- MCP tool responses wrap annotations with `_notice` field marking them as
  user-provided UI feedback, not instructions
- Steering docs instruct the agent to treat annotation comments as bug
  reports, never as system instructions
- Comment length capped at 500 chars in the extension
- DOM content is inherently untrusted - same as any web page the agent reads

### 4. Extension permissions scope

**Risk:** The extension requests `<all_urls>` host permission and `scripting`
permission, allowing it to read any page's DOM and inject content scripts.

**Severity:** Low

**Status:** ACCEPTED (acceptable risk)

**Rationale:** These permissions are required for the core functionality
(capturing any page the developer is working on). The extension is loaded
unpacked in development and is not distributed to end users. Developers
should install it only in development browser profiles.

### 5. Data at rest (capture files on disk)

**Risk:** Capture files contain full DOM content including potentially
sensitive data visible on the page (form values, user data, etc.).

**Severity:** Low

**Status:** ACCEPTED (acceptable risk)

**Rationale:** Captures are stored on the developer's local machine in a
directory they control. The data is no more sensitive than what's already
visible in the browser. Encryption at rest would add complexity without
meaningful security benefit for a local dev tool.

### 6. MCP stdio transport

**Risk:** The MCP server communicates with the agent over stdin/stdout.

**Severity:** Negligible

**Status:** ACCEPTED (no action needed)

**Rationale:** Stdio transport is a local IPC mechanism between processes
on the same machine. It cannot be intercepted remotely. The agent process
spawns the server directly.

### 7. Network exposure of HTTP receiver

**Risk:** The HTTP receiver could be accessible from the network.

**Severity:** Low

**Status:** MITIGATED (by design)

**Rationale:** The HTTP server binds to `127.0.0.1` only (not `0.0.0.0`).
It is not accessible from other machines on the network. This is enforced
in the `server.listen()` call in `http-receiver.js`.

### 8. Payload size limits

**Risk:** A malicious client could send extremely large payloads to exhaust
server memory.

**Severity:** Low

**Status:** MITIGATED (by design)

**Rationale:** The HTTP receiver enforces payload limits:
- Captures: 5MB max (typical captures are 100-200KB)
- Snapshots: 10MB max
- Requests exceeding the limit are rejected with 413 and the connection is destroyed

---

## Summary

| # | Risk | Severity | Status | Action |
|---|---|---|---|---|
| 1 | Unauthorized localhost POST | Medium | Mitigated | Shared secret auth |
| 2 | Path traversal on writes | Medium | Mitigated | validateCapturePath |
| 3 | Capture content injection | Low | Accepted | Inherent to DOM capture |
| 4 | Extension permissions | Low | Accepted | Dev-only tool |
| 5 | Data at rest | Low | Accepted | Local dev machine |
| 6 | MCP stdio transport | Negligible | Accepted | Local IPC |
| 7 | Network exposure | Low | Mitigated | 127.0.0.1 binding |
| 8 | Payload size | Low | Mitigated | Size limits enforced |

---

## Recommendations for Future Work

- **Extension options page:** Add a UI for configuring the shared secret token
  instead of requiring manual `chrome.storage` setup.
- **Token rotation:** Consider rotating the token on each server restart
  (current default behavior) vs. persisting it across restarts (env var).
- **Content Security Policy:** If the extension is ever published to the
  Chrome Web Store, add a strict CSP to the extension manifest.
- **Audit logging:** Log all rejected auth attempts to stderr for debugging.
