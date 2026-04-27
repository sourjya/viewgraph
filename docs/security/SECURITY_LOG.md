# Security Review Log

Tracks all security reviews, findings, and their resolution status.

## Reviews

| # | Date | Tier | Scope | Findings | Report |
|---|---|---|---|---|---|
| SRR-001 | 2026-04-18 | T2 | Full codebase | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-001](SRR-001-2026-04-18.md) |
| SRR-002 | 2026-04-19 | T2 | Changes since SRR-001 | 1 HIGH, 3 MEDIUM, 2 LOW | [SRR-002](SRR-002-2026-04-19-T2.md) |
| SRR-003 | 2026-04-19 | T2 | stdin lifecycle, auto-learn, dynamic import, settings, footer, bin | 0 HIGH, 2 MEDIUM, 3 LOW, 1 INFO | [SRR-003](SRR-003-2026-04-19-T2.md) |
| SRR-004 | 2026-04-21 | T3 | Full codebase (sprint end) | 2 HIGH, 5 MEDIUM, 4 LOW, 3 INFO | [SRR-004](SRR-004-2026-04-21-T3.md) |
| SRR-005 | 2026-04-24 | T2 | HMAC auth, resolved markers, sync save, Firefox bump, svgFromString, transport | 1 CRITICAL, 2 HIGH, 2 MEDIUM, 2 LOW, 6 INFO | [SRR-005](SRR-005-2026-04-24-T2.md) |
| SRR-006 | 2026-04-27 | T3 | Full codebase (sprint end) | 1 HIGH, 5 MEDIUM, 5 LOW, 4 INFO | [SRR-006](SRR-006-2026-04-27-T3.md) |

## Open Findings

| ID | Severity | Summary | Status |
|---|---|---|---|
| S4-3 | HIGH | Request body not included in HMAC verification | Open (SRR-005) - design issue, needs refactor |
| S3-4 | MEDIUM | Archive fallback reads path from index.json without validation | NEW (SRR-006) |
| S3-5 | MEDIUM | Native message handler uses string concat for file paths | NEW (SRR-006) |
| S4-2 | MEDIUM | HMAC secret in /handshake response (localhost-only) | Accepted risk - native messaging is the fix |
| S4-5 | MEDIUM | requireAuth defaults to false - auth is opt-in only | Accepted - intentional for beta |
| S7-9 | MEDIUM | innerHTML with hardcoded SVG in 6 sidebar files | Deferred - not exploitable |
| S16-1 | MEDIUM | Log injection via unsanitized filenames in watcher | Open (SRR-004) |
| S5-9 | LOW | pushSnapshot/pushScreenshot use hardcoded SERVER_URL | NEW (SRR-006) |
| Q1-1 | LOW | Dead lookupCapturesDir function in background.js | NEW (SRR-006) |
| S4-6 | LOW | Session store no proactive cleanup | Open (SRR-005) |
| S14-1 | LOW | No rate limit on POST /captures | Accepted risk (localhost-only) |
| D3-1 | LOW | .gitignore missing .pem/.key patterns | Open (SRR-004) |

## Recently Resolved

| ID | Severity | Summary | Resolved |
|---|---|---|---|
| S3-3 | MEDIUM | CodeQL js/path-injection - configFile write used unvalidated path | 2026-04-25 - re-validate via safeConfigPath before writeFileSync |
| D4-1 | MODERATE | uuid < 14.0.0 missing buffer bounds check (GHSA-w5hq-g745-h8pq) | 2026-04-25 - npm override pins uuid@14.0.0 |
| S4-4 | HIGH | Timing attack on handshake verify | 2026-04-24 (SRR-005) - uses timingSafeEqual |
| S5-8 | MEDIUM | Unguarded JSON.parse on /handshake/verify | 2026-04-24 (SRR-005) - try/catch added |
| S4-7 | LOW | Pending challenges not bounded | 2026-04-24 (SRR-005) - max 50 |
| S1-3 | HIGH | Native messaging updateConfig bypasses config whitelist | 2026-04-21 (SRR-004) - shared ALLOWED_CONFIG_KEYS |
| S7-8 | HIGH | F19 wrapping missing on tools returning user text | 2026-04-21 - wrapped compare-captures, compare-baseline, get-latest + standardized notices |
| Q3-1 | MEDIUM | Native messaging writeCapture skips validateCapturePath | 2026-04-21 (SRR-004) |
| S9-1 | MEDIUM | Storage collector misses common session cookie names | 2026-04-21 (SRR-004) |
| S4-1 | LOW | Math.random for chunk IDs in native messaging | 2026-04-21 (SRR-004) |

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
| S5-7 | MEDIUM | /info exposes filesystem paths | Accepted risk (ADR-010) |
| WS-1 | MEDIUM | No WebSocket payload limit | 2026-04-18 (SRR-001) - 1MB max |
| WS-2 | MEDIUM | No WebSocket connection limit | 2026-04-18 (SRR-001) - 10 max |
