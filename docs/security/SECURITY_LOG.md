# Security Review Log

Tracks all security reviews, findings, and their resolution status.

## Reviews

| # | Date | Scope | Findings | Report |
|---|---|---|---|---|
| SRR-001 | 2026-04-18 | Full codebase | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-001](SRR-001-2026-04-18.md) |

## Open Findings

| ID | Severity | Summary | Status | Owner |
|---|---|---|---|---|
| S1-1 | HIGH | PUT /config unauthenticated config write | Open - needs schema validation | — |
| S1-2 | HIGH | POST /captures unauthenticated injection | Accepted risk (ADR-010) - fix: M17c native messaging | — |
| S3-1 | MEDIUM | Auto-learn writes URL from untrusted metadata | Open | — |
| S5-1 | MEDIUM | Missing security response headers | Open | — |
| S5-2 | MEDIUM | /info exposes filesystem paths | Accepted risk | — |
| S7-1 | MEDIUM | Shadow DOM mode: 'open' | Open | — |
| S7-2 | MEDIUM | innerHTML with server version string | Open | — |
| WS-1 | LOW | WebSocket no maxPayload | Open | — |
| WS-2 | LOW | WebSocket no connection limit | Open | — |
| S5-3 | LOW | Error messages leak paths | Open | — |
| Q3-1 | LOW | F19 wrapping gaps in 12 tools | Open | — |

## Resolved Findings

| ID | Severity | Summary | Resolved | How |
|---|---|---|---|---|
| — | — | (none yet) | — | — |
