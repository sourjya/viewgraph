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
| SRR-007 | 2026-04-27 | T3 | M19 service worker migration | 2 HIGH, 5 MEDIUM, 3 LOW, 5 INFO | [SRR-007](SRR-007-2026-04-27-T3.md) |
| SRR-008 | 2026-04-30 | T3 | Post-MRR-008 + v0.9.x releases | 1 HIGH, 5 MEDIUM, 3 LOW, 4 INFO | [SRR-008](SRR-008-2026-04-30-T3.md) |

## Open Findings

| ID | Severity | Summary | Status |
|---|---|---|---|
| S4-3 | HIGH | Request body not included in HMAC verification | Open (SRR-005) - design issue, needs refactor |
| S3-8 | MEDIUM | filePath parameter allows write to .session-key and config.json | NEW (SRR-008) |
| S5-11 | MEDIUM | Native messaging annotations:resolved uses includes() URL matching | NEW (SRR-008) |
| S1-4 | MEDIUM | Content script still bundles transport.js with direct fetch() capability | Open (SRR-007) |
| S4-5 | MEDIUM | requireAuth defaults to false - auth is opt-in only | Accepted - intentional for beta |
| S7-9 | MEDIUM | innerHTML with hardcoded SVG in sidebar files | Deferred - not exploitable |
| S16-1 | MEDIUM | Log injection via unsanitized filenames in watcher | Open (SRR-004) |
| S16-2 | LOW | source-linker _MAX_FILE_SIZE not enforced | NEW (SRR-008) |
| S14-1 | LOW | No rate limit on POST /captures | Accepted risk (localhost-only) |

## Recently Resolved

| ID | Severity | Summary | Resolved |
|---|---|---|---|
| S3-6 | HIGH | Variable shadowing breaks native messaging annotations:resolved handler | 2026-04-30 - inner variable renamed to resolvedPath |
| S5-10 | MEDIUM | Overly permissive URL matching in /annotations/resolved | 2026-04-30 - HTTP endpoint uses new URL() hostname+port matching (native messaging path tracked as S5-11) |
| S4-6 | LOW | Session store no proactive cleanup | 2026-04-30 - 5-minute sweep interval added |
| Q1-3 | LOW | WS manager event buffer overwrites | 2026-04-30 - Acknowledged as design choice |

## Resolved Findings

| ID | Severity | Summary | Resolved |
|---|---|---|---|
| S3-6 | HIGH | Variable shadowing breaks native messaging annotations:resolved | 2026-04-30 (SRR-008) |
| S5-10 | MEDIUM | Overly permissive URL matching in /annotations/resolved | 2026-04-30 (SRR-008) |
| S4-6 | LOW | Session store no proactive cleanup | 2026-04-30 (SRR-008) |
| S3-4 | MEDIUM | Archive fallback path traversal in get-capture.js | 2026-04-27 (SRR-007) |
| S3-5 | MEDIUM | Native message handler string concat for file paths | 2026-04-27 (SRR-007) |
| S5-9 | LOW | pushSnapshot/pushScreenshot hardcoded SERVER_URL | 2026-04-27 (SRR-007) |
| Q1-1 | LOW | Dead lookupCapturesDir function in background.js | 2026-04-27 (SRR-007) |
| D3-1 | LOW | .gitignore missing credential patterns | 2026-04-27 (SRR-007) |
| S3-3 | MEDIUM | CodeQL js/path-injection - configFile write used unvalidated path | 2026-04-25 (SRR-005) |
| D4-1 | MODERATE | uuid < 14.0.0 missing buffer bounds check | 2026-04-25 (SRR-005) |
| S4-4 | HIGH | Timing attack on handshake verify | 2026-04-24 (SRR-005) |
| S5-8 | MEDIUM | Unguarded JSON.parse on /handshake/verify | 2026-04-24 (SRR-005) |
| S4-7 | LOW | Pending challenges not bounded | 2026-04-24 (SRR-005) |
| S1-3 | HIGH | Native messaging updateConfig bypasses config whitelist | 2026-04-21 (SRR-004) |
| S7-8 | HIGH | F19 wrapping missing on tools returning user text | 2026-04-21 (SRR-004) |
| Q3-1 | MEDIUM | Native messaging writeCapture skips validateCapturePath | 2026-04-21 (SRR-004) |
| S9-1 | MEDIUM | Storage collector misses common session cookie names | 2026-04-21 (SRR-004) |
| S4-1 | LOW | Math.random for chunk IDs in native messaging | 2026-04-21 (SRR-004) |
| S5-6 | MEDIUM | classifyTrust uses pageUrl.includes() - trust gate bypass | 2026-04-19 (SRR-003) |
| S8-1 | MEDIUM | Server persists indefinitely when idle timeout=0 and stdin closes | 2026-04-19 (SRR-003) |
| S3-2 | HIGH | Auto-learn overwrites existing config keys | 2026-04-19 (SRR-002) |
| S5-4 | MEDIUM | URL pattern matching trust gate bypass | 2026-04-19 (SRR-002) |
| S5-5 | LOW | suggestions-ui state not cleared on destroy | 2026-04-19 (SRR-002) |
| S3-1 | HIGH | Auto-learn accepted remote URLs | 2026-04-18 (SRR-001) |
| S1-1 | HIGH | Config body accepted arbitrary keys | 2026-04-18 (SRR-001) |
| S7-1 | MEDIUM | Shadow DOM mode: 'open' | 2026-04-18 (SRR-001) |
| S7-2 | MEDIUM | innerHTML in annotation-sidebar.js | 2026-04-18 (SRR-001) |
| S5-1 | MEDIUM | Missing security response headers | 2026-04-18 (SRR-001) |
| S5-3 | MEDIUM | Error messages expose internals | 2026-04-18 (SRR-001) |
| S5-7 | MEDIUM | /info exposes filesystem paths | Accepted risk (ADR-010) |
| WS-1 | MEDIUM | No WebSocket payload limit | 2026-04-18 (SRR-001) |
| WS-2 | MEDIUM | No WebSocket connection limit | 2026-04-18 (SRR-001) |
