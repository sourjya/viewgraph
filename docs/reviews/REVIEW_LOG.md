# Maintainability Review Log

Tracks all maintainability reviews, findings, and their resolution status.

## Reviews

| # | Date | Scope | Findings | Report |
|---|---|---|---|---|
| MRR-001 | 2026-04-21 | sidebar/*.js, collectors/*.js, tools/*.js, server/src/*.js | 18 findings across 10 categories | [MRR-001](MRR-001-2026-04-21.md) |
| Codebase Review | 2026-04-18 | Full codebase | 18 findings, 5 themes | [Codebase Review](../architecture/codebase-review-2026-04-18.md) |

## Open Findings (MRR-001)

| ID | Severity | Summary | Status |
|---|---|---|---|
| 1.1 | HIGH | 16 server tools bypass readAndParse | Open |
| 1.2 | HIGH | 76 hardcoded CSS colors in sidebar | Open |
| 5.2 | HIGH | F19 wrapping missing on 8+ tools (SRR-004 S7-8) | Open |
| 6.1 | HIGH | 16 server tools have no test files | Open |
| 2.2 | MEDIUM | annotation-sidebar.js still 647 lines/25 imports | Open |
| 2.3 | MEDIUM | WS_MESSAGES duplicate with no sync check | Open |
| 5.1 | MEDIUM | 5 different register() signatures | Open |
| 5.3 | MEDIUM | _notice field inconsistent across tools | Open |
| 6.3 | MEDIUM | sidebar-misc/mcp test files are catch-all monoliths | Open |
| 7.1 | MEDIUM | Missing JSDoc on largest sidebar functions | Open |
| 1.3 | MEDIUM | 40+ hover listener pairs duplicated | Open |
| 4.1 | MEDIUM | styles.js constants defined but underused | Open |
| 6.2 | LOW | diagnostics.js, toggles.js, collector-utils.js untested | Open |
| 5.4 | LOW | 13 innerHTML assignments in sidebar | Open |
| 8.2 | LOW | Port 9876 hardcoded in 3 scripts | Open |
| 10.1 | LOW | _indexer vs indexer naming inconsistency | Open |

## Resolved Findings (Codebase Review 2026-04-18)

| ID | Severity | Summary | Resolved | How |
|---|---|---|---|---|
| Phase 1 | - | jsonResponse/errorResponse helpers | 2026-04-18 | Added to tool-helpers.js, 36 tools migrated |
| Phase 1 | - | FIXTURES_DIR + createFixtureClient | 2026-04-18 | Added to test helpers, 16 files migrated |
| Phase 1 | - | ENV_ALLOWED_DIRS constant | 2026-04-18 | Added to constants.js |
| Phase 1 | - | get-fidelity-report signature fix | 2026-04-18 | Bug fix |
| Phase 2 | - | readAndParse/Pair/Multi migration | 2026-04-18 | 14 tools migrated |
| Phase 2 | - | mockChrome migration | 2026-04-18 | 12 extension tests migrated |
| Phase 2 | - | styles.js COLOR constants | 2026-04-18 | 7 sidebar modules migrated |
