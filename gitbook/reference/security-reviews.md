# Security Review History

ViewGraph undergoes regular security reviews using a three-tier model. Every review produces a numbered report (SRR) with findings, severity ratings, and remediation status. This page documents the complete history.

## Review Tiers

| Tier | When it runs | What it checks |
|---|---|---|
| **Tier 1** | Every git commit | Staged files only. Secrets, unsafe execution, auth bypass. Blocks commit on CRITICAL/HIGH. |
| **Tier 2** | After each feature | Changed files since last review. OWASP categories, BOLA/IDOR, crypto, file uploads. |
| **Tier 3** | End of sprint | Full codebase. Everything in Tier 1 and 2, plus supply chain, headers, logging, rate limiting, test coverage. |

## Review Timeline

### SRR-001 - April 18, 2026 (Tier 2)

**Scope:** Full codebase - first security review after initial development.

**Findings:** 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO

Key findings and resolutions:
- **S1-1 (HIGH):** Auth token exposed in `/info` endpoint response. **Fixed** - token removed from response.
- **S1-2 (HIGH):** `POST /baselines` endpoint missing auth. **Fixed** - auth added.
- **S5-1 (HIGH):** XSS in options page via unsanitized input. **Fixed** - input sanitized.
- **S2-1 through S2-3 (MEDIUM):** Missing JSON.parse try/catch in HTTP handlers. **Fixed** - all wrapped.
- **S4-1 (MEDIUM):** No server timeouts. **Fixed** - 30s connection, 10s request timeouts added.

---

### SRR-002 - April 19, 2026 (Tier 2)

**Scope:** Changes since SRR-001 - native messaging, transport abstraction, sidebar decomposition.

**Findings:** 1 HIGH, 3 MEDIUM, 2 LOW

Key findings and resolutions:
- **S3-1 (HIGH):** Path traversal in capture file reads. **Fixed** - `validateCapturePath` with `startsWith` guard.
- **S5-5 (MEDIUM):** WebSocket token extraction vulnerable to timing attack. **Fixed** - constant-time comparison.

---

### SRR-003 - April 19, 2026 (Tier 2)

**Scope:** Server lifecycle (stdin close detection, idle timeout), auto-learn config, dynamic imports, settings UI.

**Findings:** 0 HIGH, 2 MEDIUM, 3 LOW, 1 INFO

Key findings and resolutions:
- **S8-1 (MEDIUM):** Debug logging enabled by default. **Fixed** - logging gated behind env var.
- **S3-2 (MEDIUM):** Config file path not validated. **Fixed** - `safeConfigPath` validator added.

---

### SRR-004 - April 21, 2026 (Tier 3)

**Scope:** Full codebase - end of first development sprint.

**Findings:** 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO

Key findings and resolutions:
- **S3-3 (HIGH):** CodeQL `js/path-injection` alert in config write. **Fixed** - re-validate path via `safeConfigPath` before `writeFileSync`.
- **S16-1 (MEDIUM):** Log injection via unsanitized filenames. **Open** - accepted risk for localhost-only operation.
- **D1-1 (MEDIUM):** uuid package vulnerability (GHSA-w5hq-g745-h8pq). **Fixed** - upgraded to uuid 14.0.0 via npm override.

---

### SRR-005 - April 24, 2026 (Tier 2)

**Scope:** HMAC auth implementation, resolved annotation markers, sync save, Firefox compatibility.

**Findings:** 1 CRITICAL, 2 HIGH, 2 MEDIUM, 2 LOW, 6 INFO

Key findings and resolutions:
- **S4-1 (CRITICAL):** HMAC handshake challenge reuse allowed replay attacks. **Fixed** - challenges are single-use with 60s TTL.
- **S4-3 (HIGH):** Request body not included in HMAC verification. **Open** - design issue, needs refactor. Accepted for beta (localhost-only).
- **S4-2 (MEDIUM):** HMAC secret sent in `/handshake` response. **Accepted risk** - native messaging is the long-term fix.

---

### SRR-006 - April 27, 2026 (Tier 3)

**Scope:** Full codebase - end of second sprint. Panic capture, live annotation status, rolling archive.

**Findings:** 1 HIGH, 5 MEDIUM, 5 LOW, 4 INFO

Key findings and resolutions:
- **S3-4 (HIGH):** Archive fallback path traversal - `get-capture.js` read paths from `index.json` without validation. **Fixed** - `startsWith` guard added.
- **S3-5 (MEDIUM):** Native message handler used string concatenation for file paths. **Fixed** - `path.basename` + `path.resolve` + `startsWith` guard.
- **Q1-1 (LOW):** Dead `lookupCapturesDir` function (31 lines). **Fixed** - removed.
- **D3-1 (LOW):** `.gitignore` missing credential file patterns. **Fixed** - added `*.pem`, `*.key`, `*.p12`.

---

### SRR-007 - April 27, 2026 (Tier 3)

**Scope:** M19 service worker communication migration - 5 new SW modules, transport-client, updated background.js.

**Findings:** 2 HIGH, 5 MEDIUM, 3 LOW, 5 INFO

Key findings and resolutions:
- **S3-6 (HIGH):** Variable shadowing in native message handler. Inner `const resolved = path.resolve(filePath)` shadowed outer `const resolved = []` array, breaking the `annotations:resolved` handler entirely. **Fixed** - renamed to `resolvedPath`.
- **S5-10 (MEDIUM):** Bidirectional `includes()` URL matching in `/annotations/resolved` could leak annotations across unrelated pages. **Fixed** - replaced with origin + pathname prefix comparison via `new URL()`.
- **S1-4 (MEDIUM):** Content script still bundled `transport.js` because `discovery.js` imported it. **Fixed** - discovery.js decoupled from transport.js (S1-4 resolution in MRR-005).

**M19 security assessment:** The migration is a net positive. All HTTP/WebSocket moved out of the content script. Auth persists in `chrome.storage.session`. Transport handler uses a 14-operation whitelist. Dependencies clean (0 npm audit vulnerabilities).

---

## Cumulative Statistics

| Metric | Count |
|---|---|
| Total reviews | 7 (3 Tier 2, 4 Tier 3) |
| Total findings | 15 HIGH+, 27 MEDIUM, 21 LOW, 22 INFO |
| Findings resolved | 85%+ |
| Open HIGH findings | 1 (S4-3 - HMAC body verification, accepted for beta) |
| Open MEDIUM findings | 4 (accepted risks or deferred) |
| Dependencies with known CVEs | 0 |

## How to Read a Report

Each SRR report follows this structure:

1. **Scope** - what was reviewed and why
2. **Findings table** - every finding with ID, severity, confidence, and status
3. **Finding details** - for each finding: description, code evidence, attack scenario, remediation options
4. **Resolved findings** - what was fixed since the last review
5. **Recommendations** - prioritized action items

Finding IDs use the format `S{category}-{sequence}` for security findings and `Q{category}-{sequence}` for quality findings. Categories map to OWASP and CWE standards.

Severity levels:
- **CRITICAL** - exploitable vulnerability, blocks release
- **HIGH** - significant risk, fix before next release
- **MEDIUM** - moderate risk, fix within the sprint
- **LOW** - minor risk, fix when convenient
- **INFO** - observation, no action required
