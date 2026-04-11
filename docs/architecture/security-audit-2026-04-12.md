# ViewGraph Security Audit Report

**Date:** 2026-04-12
**Scope:** Full codebase - server/src/ (44 files), extension/lib/ (40 files), extension/entrypoints/ (4 files)
**Method:** Automated agent-driven audit (two parallel reviewers: server + extension) followed by manual remediation
**Status:** 12 of 17 findings remediated. 5 deferred (documented below).

---

## Executive Summary

The ViewGraph codebase has a solid security foundation: path traversal prevention via `validateCapturePath()` on 30+ MCP tools, Zod input validation on all tool parameters, payload size limits, 127.0.0.1 binding, and auth tokens on POST endpoints. No `eval()`, no SSRF vectors, no dynamic code execution.

The audit found 3 HIGH, 8 MEDIUM, and 6 LOW severity issues. All HIGH and MEDIUM issues have been remediated. The remaining LOW issues are documented for future work.

---

## Attack Surface Map

| Surface | Entry Points | Auth | Risk |
|---|---|---|---|
| HTTP server (127.0.0.1:9876) | 15 endpoints (8 GET, 7 POST) | POST: Bearer token. GET: open | Medium - localhost only but any page can reach it |
| WebSocket (ws://127.0.0.1:9876/ws) | Upgrade on /ws path | Token as first message | Medium - now has 5s auth timeout |
| MCP tools (stdio) | 34 tools via JSON-RPC | MCP SDK handles framing | Low - agent-mediated |
| File system | Captures dir read/write | Path validation | Low - sandboxed to captures dir |
| Extension content script | Injected into all pages | None (runs in page context) | Medium - DOM access, fetch to server |
| Extension options page | chrome-extension:// origin | Extension context | Low - elevated privileges |
| chrome.storage | sync + local | Extension-only | Low - writable by content scripts |

---

## Findings and Remediations

### HIGH Severity (3 found, 3 fixed)

#### S1-1: /info Endpoint Leaked Auth Token
- **File:** server/src/http-receiver.js
- **Vector:** Any page on localhost could `fetch('http://127.0.0.1:9876/info')` and read the auth token from the JSON response, then use it to POST crafted captures or resolve annotations.
- **Fix:** Removed `token` field from `/info` response. Extension reads token from `.viewgraph/.token` file on disk.
- **Commit:** `fix(security): remediate 12 findings from security audit`

#### S1-2: POST /baselines Missing Auth Check
- **File:** server/src/http-receiver.js
- **Vector:** Any localhost caller could promote arbitrary captures to baselines without authentication. All other POST endpoints had `checkAuth()` - this one was missed.
- **Fix:** Added `if (!checkAuth(req, res)) return;` as first line of handler.
- **Commit:** Same as above.

#### S5-1: XSS in Options Page via Server Data
- **File:** extension/entrypoints/options/options.js
- **Vector:** `renderAutoMapping()` interpolated `data.serverUrl`, `data.projectRoot`, `data.capturesDir` directly into innerHTML. These values come from the server's `/info` endpoint. A rogue server could return `<img src=x onerror=alert(1)>` as projectRoot, executing in the extension's options page context (elevated privileges: chrome.storage, chrome.tabs).
- **Fix:** Replaced innerHTML with `document.createElement()` + `textContent` for all server-provided values.
- **Commit:** Same as above.

### MEDIUM Severity (8 found, 8 fixed)

#### S1-3: WebSocket Auth Timeout
- **Vector:** Unauthenticated WebSocket connections stayed alive indefinitely via pong keepalive.
- **Fix:** 5-second auth timeout. Pong only sets `isAlive` for authenticated clients.

#### S2-1, S2-2, S2-3: Unguarded JSON.parse in HTTP Handlers
- **Vector:** Malformed JSON in POST body caused unhandled exception, returning no response.
- **Fix:** Wrapped all three handlers (`/requests/create`, `/baselines`, `/requests/:id/decline`) in try/catch returning 400.

#### S2-4: Path Traversal in setBaseline()
- **Vector:** `setBaseline()` used `path.join(capturesDir, filename)` without validation. A crafted filename like `../../etc/passwd` could read files outside captures dir.
- **Fix:** Replaced with `validateCapturePath(filename, capturesDir)`.

#### S4-1: No HTTP Request Timeout
- **Vector:** Slow-loris attack could hold connections open indefinitely.
- **Fix:** Added `server.timeout = 30000` and `server.requestTimeout = 10000`.

#### S5-3: XSS in Sidebar Settings
- **Vector:** Same innerHTML pattern as S5-1 but in the sidebar's settings overlay (content script context).
- **Fix:** Replaced innerHTML with createElement + textContent.

#### S5-4: WebSocket Token Extraction Broken
- **Vector:** Sidebar read `hdrs?.['X-ViewGraph-Token']` but `authHeaders()` returns `{ Authorization: 'Bearer ...' }`. Token was always empty string - WebSocket auth was effectively bypassed.
- **Fix:** Changed to `hdrs?.Authorization?.replace('Bearer ', '')`.

### LOW Severity (6 found, 1 fixed, 5 deferred)

#### Q1-2: Duplicate `transitions` Key in visualize-flow.js (FIXED)
- Object literal had `transitions` twice. Second overwrote first (count lost).
- **Fix:** Renamed first to `transitionCount`.

#### Q1-3: Duplicate `issues` Key in analyze-journey.js (FIXED)
- Same pattern. Count lost.
- **Fix:** Renamed first to `issueCount`.

#### S6-1: /info Exposes Filesystem Paths (DEFERRED)
- `/info` returns `capturesDir` and `projectRoot` absolute paths. Combined with CORS `*`, any website can discover filesystem layout.
- **Mitigation:** Token removed from response (S1-1). Paths are non-sensitive for a dev tool.
- **Future:** Consider requiring auth for path fields.

#### S6-2: Error Messages May Leak Paths (DEFERRED)
- Some error handlers return `err.message` which may contain filesystem paths.
- **Mitigation:** Low risk on localhost. Would matter if server were network-exposed.
- **Future:** Sanitize error messages in HTTP responses.

#### S2-5: compare_screenshots Reads from Parent Dir (DEFERRED)
- Uses `path.resolve(capturesDir, '..')` as base directory. `path.basename` prevents traversal but base is broader than intended.
- **Future:** Use dedicated screenshots directory with `validateCapturePath()`.

#### S5-6: Content Script Auto-Injected on All URLs (DEFERRED)
- Manifest declares `content_scripts` with `<all_urls>`. Content script (786KB) loads on every page including banking sites.
- **Mitigation:** Content script is passive until activated. No data exfiltration.
- **Future:** Remove auto-injection, use `chrome.scripting.executeScript()` on demand only.

#### S5-5: Unauthenticated GET Requests from Content Script (DEFERRED)
- Multiple fetch calls to server don't include auth headers. GET endpoints return annotation comments, capture filenames, page URLs.
- **Mitigation:** Server binds to 127.0.0.1. Data is non-sensitive for a dev tool.
- **Future:** Add auth to all server fetch calls.

---

## Positive Findings

1. `validateCapturePath()` consistently used across 30+ MCP tools
2. Payload size limits: 5MB captures, 10MB snapshots, enforced with connection destruction
3. 127.0.0.1 binding - not network-accessible
4. Auth tokens on all POST endpoints (after S1-2 fix)
5. Zod input validation on all 34 MCP tool parameters
6. No `eval()`, `new Function()`, or dynamic code execution anywhere
7. No SSRF vectors - no user-controlled URLs passed to server-side HTTP clients
8. Graceful shutdown on SIGINT/SIGTERM
9. Parser functions return `{ ok, data/error }` result objects - never throw
10. Prompt injection defense: annotation tools wrap user content with `_notice` fields

---

## CORS Analysis

The server uses `Access-Control-Allow-Origin: *` on all responses. This is intentional:

- Content scripts run in the page's origin (e.g., `http://localhost:3000`), not the extension's origin
- We can't predict which origins will make requests (any dev server URL)
- Security relies on: (a) 127.0.0.1 binding, (b) auth tokens on POST endpoints, (c) no sensitive data in GET responses
- CORS is browser-enforced only - MCP tools bypass it entirely via stdio

The wildcard CORS is documented with rationale in the source code.

---

## Recommendations for Future Hardening

1. **Rate limiting on HTTP endpoints** - prevent brute-force token guessing
2. **Content Security Policy on extension pages** - options.html and popup.html should set strict CSP
3. **Subresource Integrity** - pin hashes of loaded scripts in extension HTML pages
4. **Audit logging** - log all auth failures and suspicious requests to stderr
5. **Token rotation** - rotate auth token on server restart (currently static per session)
