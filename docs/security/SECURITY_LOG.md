# Security Review Log

Tracks all security reviews, findings, and their resolution status.

## Reviews

| # | Date | Tier | Scope | Findings | Report |
|---|---|---|---|---|---|
| SRR-001 | 2026-04-18 | T2 | Full codebase | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-001](SRR-001-2026-04-18.md) |
| SRR-002 | 2026-04-19 | T2 | Changes since SRR-001 | 1 HIGH, 3 MEDIUM, 2 LOW | [SRR-002](SRR-002-2026-04-19-T2.md) |

## Open Findings

| ID | Severity | Summary | Status |
|---|---|---|---|
| S1-2 | HIGH | POST /captures unauthenticated injection | Accepted risk (ADR-010) - fix: M17c native messaging |
| S5-2 | MEDIUM | /info exposes filesystem paths | Accepted risk |
| S7-3 | MEDIUM | innerHTML with hardcoded SVG in settings.js | Deferred - not exploitable |
| Q3-3 | MEDIUM | F19 wrapping missing on 4 compare tools | Deferred - roadmap |

## Resolved Findings

| ID | Severity | Summary | Resolved |
|---|---|---|---|
| S3-2 | HIGH | Auto-learn overwrites existing config keys | 2026-04-19 (SRR-002) - merge instead of replace |
| S5-4 | MEDIUM | URL pattern matching trust gate bypass | 2026-04-19 (SRR-002) - hostname+port matching |
| S5-5 | LOW | suggestions-ui state not cleared on destroy | 2026-04-19 (SRR-002) - resetSuggestions() |
| S3-1 | HIGH | Auto-learn accepted remote URLs | 2026-04-18 (SRR-001) - localhost only |
| S1-1 | HIGH | Config body accepted arbitrary keys | 2026-04-18 (SRR-001) - whitelist |
| S7-1 | MEDIUM | Shadow DOM mode: 'open' | 2026-04-18 (SRR-001) - closed |
| S7-2 | MEDIUM | innerHTML in annotation-sidebar.js | 2026-04-18 (SRR-001) - removed |
| S5-1 | MEDIUM | Missing security response headers | 2026-04-18 (SRR-001) - added |
| S5-3 | MEDIUM | Error messages expose internals | 2026-04-18 (SRR-001) - sanitized |
| WS-1 | MEDIUM | No WebSocket payload limit | 2026-04-18 (SRR-001) - 1MB max |
| WS-2 | MEDIUM | No WebSocket connection limit | 2026-04-18 (SRR-001) - 10 max |
