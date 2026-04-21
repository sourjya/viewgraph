# Security Review Log

Tracks all security reviews, findings, and their resolution status.

## Reviews

| # | Date | Tier | Scope | Findings | Report |
|---|---|---|---|---|---|
| SRR-001 | 2026-04-18 | T2 | Full codebase | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-001](SRR-001-2026-04-18.md) |
| SRR-002 | 2026-04-19 | T2 | Changes since SRR-001 | 1 HIGH, 3 MEDIUM, 2 LOW | [SRR-002](SRR-002-2026-04-19-T2.md) |
| SRR-003 | 2026-04-19 | T2 | stdin lifecycle, auto-learn, dynamic import, settings, footer, bin | 0 HIGH, 2 MEDIUM, 3 LOW, 1 INFO | [SRR-003](SRR-003-2026-04-19-T2.md) |
| SRR-004 | 2026-04-21 | T3 | Full codebase (sprint end) | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-004](SRR-004-2026-04-21-T3.md) |

## Open Findings

| ID | Severity | Summary | Status |
|---|---|---|---|
| S5-2 | MEDIUM | /info exposes filesystem paths | Accepted risk |
| S7-3 | MEDIUM | innerHTML with hardcoded SVG in settings.js | Deferred - not exploitable |

## Recently Resolved

| ID | Severity | Summary | Resolved |
|---|---|---|---|
| S7-8 | HIGH | F19 wrapping missing on tools returning user text | 2026-04-21 - wrapped compare-captures, compare-baseline, get-latest + standardized notices |
|---|---|---|---|
| S1-3 | HIGH | Native messaging updateConfig bypasses config whitelist | 2026-04-21 (SRR-004) - shared ALLOWED_CONFIG_KEYS |

| ID | Severity | Summary | Status |
|---|---|---|---|
| S1-3 | HIGH | Native messaging config:put bypasses ALLOWED_CONFIG_KEYS whitelist | NEW (SRR-004) |
| S7-8 | HIGH | F19 wrapping missing on 8+ tools returning user text | NEW (SRR-004) |
| S9-1 | MEDIUM | Storage collector misses common session cookie names (connect.sid, PHPSESSID) | NEW (SRR-004) |
| S5-7 | MEDIUM | /info exposes filesystem paths | Accepted risk (ADR-010) |
| S16-1 | MEDIUM | Log injection via unsanitized filenames in watcher | NEW (SRR-004) |
| S7-9 | MEDIUM | innerHTML with hardcoded SVG in 5 sidebar files | Deferred - not exploitable |
| Q3-1 | MEDIUM | Native messaging writeCapture skips validateCapturePath | NEW (SRR-004) |
| S4-1 | LOW | Math.random for chunk IDs in native messaging | NEW (SRR-004) |
| S14-1 | LOW | No rate limit on POST /captures | Accepted risk (localhost-only) |
| D3-1 | LOW | .gitignore missing .pem/.key patterns | NEW (SRR-004) |

## Resolved Findings

| ID | Severity | Summary | Resolved |
|---|---|---|---|
| S5-6 | MEDIUM | classifyTrust uses pageUrl.includes() - trust gate bypass | 2026-04-19 (SRR-003) |
| S8-1 | MEDIUM | Server persists indefinitely when idle timeout=0 and stdin closes | 2026-04-19 (SRR-003) |
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
