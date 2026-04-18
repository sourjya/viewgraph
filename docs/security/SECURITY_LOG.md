# Security Review Log

Tracks all security reviews, findings, and their resolution status.

## Reviews

| # | Date | Scope | Findings | Report |
|---|---|---|---|---|
| SRR-001 | 2026-04-18 | Full codebase | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-001](SRR-001-2026-04-18.md) |

## Open Findings

| ID | Severity | Summary | Status | Owner |
|---|---|---|---|---|
| S1-2 | HIGH | POST /captures unauthenticated injection | Accepted risk (ADR-010) - fix: M17c native messaging | - |
| S5-2 | MEDIUM | /info exposes filesystem paths | Accepted risk | - |
| CQL-12/13/22/23/25 | HIGH | CodeQL: uncontrolled data in path expression (http-receiver.js) | False positive - paths validated by validateCapturePath() + safeConfigPath() + allowedDirs whitelist. CodeQL can't trace through helper functions. | - |

## Resolved Findings

| ID | Severity | Summary | Resolved | How |
|---|---|---|---|---|
| S1-1 | HIGH | PUT /config unauthenticated config write | 2026-04-18 | Config body schema whitelist (8 allowed keys) |
| S3-1 | MEDIUM | Auto-learn writes URL from untrusted metadata | 2026-04-18 | Only auto-learn from localhost/file:// URLs |
| S5-1 | MEDIUM | Missing security response headers | 2026-04-18 | Added nosniff + no-store headers |
| S7-1 | MEDIUM | Shadow DOM mode: 'open' | 2026-04-18 | Changed to mode: 'closed' |
| S7-2 | MEDIUM | innerHTML with server version string | 2026-04-18 | Replaced with textContent + createElement |
| WS-1 | LOW | WebSocket no maxPayload | 2026-04-18 | Added 1MB maxPayload limit |
| WS-2 | LOW | WebSocket no connection limit | 2026-04-18 | Added 10-connection limit |
| S5-3 | LOW | Error messages leak paths | 2026-04-18 | Sanitized to generic messages |
| Q3-1 | LOW | F19 wrapping gaps in 12 tools | 2026-04-18 | Added wrapping to 6 more tools (11 total) |
| CQL-24 | HIGH | CodeQL: incomplete URL scheme check (journey-recorder.js) | 2026-04-18 | Regex check on raw href before URL parsing |
| DEP-1 | HIGH | basic-ftp DoS via unbounded memory | 2026-04-18 | npm audit fix in bulk-capture experiment |
| DEP-2 | MEDIUM | hono HTML injection in JSX SSR | 2026-04-18 | npm audit fix in root package-lock |
