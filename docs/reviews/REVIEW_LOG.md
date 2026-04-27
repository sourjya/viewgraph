# Maintainability Review Log

Tracks all maintainability reviews, findings, and their resolution status.

## Reviews

| # | Date | Scope | Findings | Report |
|---|---|---|---|---|
| MRR-005 | 2026-04-27 | M19 service worker migration - sw/, transport-client, discovery, sidebar, background, mock, prompts | 12 new findings (1 HIGH, 6 MEDIUM, 5 LOW), 13 carried | [MRR-005](MRR-005-2026-04-27.md) |
| MRR-004 | 2026-04-27 | Full codebase - server/src/, extension/lib/, extension/entrypoints/ | 14 new findings (4 HIGH, 6 MEDIUM, 4 LOW), 13 carried | [MRR-004](MRR-004-2026-04-27.md) |
| MRR-003 | 2026-04-24 | Auth modules, annotate.js markers, sync.js, transport.js, settings.js, help.js | 4 new findings, 3 Phase 1 items resolved | [MRR-003](MRR-003-2026-04-24.md) |
| MRR-001 | 2026-04-21 | sidebar/*.js, collectors/*.js, tools/*.js, server/src/*.js | 18 findings across 10 categories | [MRR-001](MRR-001-2026-04-21.md) |
| Codebase Review | 2026-04-18 | Full codebase | 18 findings, 5 themes | [Codebase Review](../architecture/codebase-review-2026-04-18.md) |

## Open Findings

### MRR-005 (New)

| ID | Severity | Summary | Status |
|---|---|---|---|
| 12.1 | HIGH | Triple-maintained transport OPS map (handler + client + mock) | Open |
| 12.2 | MEDIUM | Duplicated chrome.storage key strings across 5 files | Open |
| 12.3 | MEDIUM | Redeclared network constants in discovery-sw.js | Open |
| 12.4 | HIGH | Duplicate discoverServer block persists (supersedes 11.1) | Open |
| 12.5 | MEDIUM | mockChrome missing storage.session in defaults | Open |
| 12.6 | MEDIUM | mockChrome double-merge pattern is fragile | Open |
| 12.7 | MEDIUM | server/src/prompts.js has no test file | Open |
| 12.8 | LOW | Hardcoded badge color in sync-alarms.js | Open |
| 12.9 | LOW | discovery.js getAllServers() is a degraded stub | Open |
| 12.10 | LOW | 15 empty catch blocks in sw/ modules (3 uncommented) | Open |
| 12.11 | LOW | vg-debug-fullstack.md missing [CAPTURED_TEXT] delimiter docs | Open |
| 12.12 | LOW | annotation-sidebar.js uses relative import instead of #lib/ | Open |

### MRR-004 (Carried)

| ID | Severity | Summary | Status |
|---|---|---|---|
| 11.1 | HIGH | Duplicate discoverServer block | **Superseded by 12.4** |
| 11.8 | HIGH | 17 server tools bypass readAndParse | Open |
| 11.9 | HIGH | 84 hardcoded hex colors | Open |
| 11.12 | HIGH | 17 server tools have no dedicated test file (was 16, +prompts.js) | Open |
| 11.3 | MEDIUM | pushSnapshot/pushScreenshot hardcoded SERVER_URL | **Improved** by M19 |
| 11.6 | MEDIUM | Duplicate height-collapse animation pattern | Open |
| 11.7 | MEDIUM | options.js hardcodes port 9876 | Open |
| 11.10 | MEDIUM | 7 register() signature variations across 38 tools | Open |
| 11.11 | MEDIUM | 76 lines import+register boilerplate in server/index.js | Open |
| 11.13 | MEDIUM | sidebar/toggles.js has no test file | Open |
| 11.2 | LOW | Dead lookupCapturesDir function in background.js | Open |
| 11.5 | LOW | Double import in get-unresolved.js | Open |
| 11.14 | LOW | 14 innerHTML assignments in sidebar modules | Open |

### MRR-003 (Carried)

| ID | Severity | Summary | Status |
|---|---|---|---|
| 10.1 | HIGH | Extension auth.js has zero tests (103 lines crypto code) | Open |
| 10.2 | HIGH | Auth design requires rework (S4-2 secret leak, coupled fix) | Open - blocked on SRR-005 |
| 10.3 | LOW | sync.js mixed static/dynamic imports from same module | Open |

### MRR-001 (Carried - superseded items removed)

| ID | Severity | Summary | Status |
|---|---|---|---|
| 5.2 | HIGH | F19 wrapping missing on tools (improved to 13/37) | Open - improved |
| 2.2 | MEDIUM | annotation-sidebar.js still 838 lines/25 imports | Open |
| 6.3 | MEDIUM | sidebar-misc/mcp test files are catch-all monoliths | Open |
| 7.1 | MEDIUM | Missing JSDoc on largest sidebar functions | Open |
| 1.3 | MEDIUM | Hover listener pairs use raw mouseenter/mouseleave | Open |

### MRR-001 Phase 1 Progress

| # | Item | Status |
|---|---|---|
| P1.1 | icons.js default colors → COLOR.muted | Open |
| P1.2 | DEFAULT_PORT in scripts | Open → **Superseded by 11.7** |
| P1.3 | _notice constants in tool-helpers.js | **Done** |
| P1.4 | WS_MESSAGES sync check in CI | **Done** |
| P1.5 | JSDoc on top 5 sidebar functions | Open |
| P1.6 | addHover helper extraction | **Done** |

## Resolved Findings

### MRR-004 → MRR-005

| ID | Severity | Summary | Resolved | How |
|---|---|---|---|---|
| 11.3 | MEDIUM | pushSnapshot/pushScreenshot hardcoded SERVER_URL | 2026-04-27 | M19: pushResult._serverUrl passed through capture handler |
| 11.4 | LOW | Unused extVer variable in annotation-sidebar.js | 2026-04-27 | M19: variable renamed to extVersion, used in version check |

### Superseded by MRR-005

| ID | Severity | Summary | Superseded by |
|---|---|---|---|
| 11.1 | HIGH | Duplicate discoverServer block | 12.4 (still open, M19 did not fix) |

### MRR-001 → MRR-003

| ID | Severity | Summary | Resolved | How |
|---|---|---|---|---|
| 2.3 | MEDIUM | WS_MESSAGES duplicate with no sync check | 2026-04-24 | pre-commit.sh diffs the two files (P1.4) |
| 5.3 | MEDIUM | _notice field inconsistent across tools | 2026-04-24 | NOTICE_CAPTURE and NOTICE_PAGE_DATA constants (P1.3) |
| 10.1 | LOW | _indexer vs indexer naming inconsistency | - | Accepted - underscore correctly signals unused |

### Superseded by MRR-004

| ID | Severity | Summary | Superseded by |
|---|---|---|---|
| 1.1 | HIGH | 16 server tools bypass readAndParse | 11.8 (grew to 17) |
| 1.2 | HIGH | 75 hardcoded CSS colors | 11.9 (grew to 84) |
| 6.1 | HIGH | 13 server tools have no test files | 11.12 (grew to 16) |
| 5.1 | MEDIUM | 5 different register() signatures | 11.10 (grew to 7) |
| 4.1 | MEDIUM | styles.js constants underused | 11.9 |
| 10.4 | LOW | settings.js innerHTML inconsistency | 11.14 |
| 5.4 | LOW | 14 innerHTML assignments | 11.14 |
| 8.2 | LOW | Port 9876 hardcoded in scripts | 11.7 |

### Codebase Review 2026-04-18

| ID | Severity | Summary | Resolved | How |
|---|---|---|---|---|
| Phase 1 | - | jsonResponse/errorResponse helpers | 2026-04-18 | Added to tool-helpers.js, 36 tools migrated |
| Phase 1 | - | FIXTURES_DIR + createFixtureClient | 2026-04-18 | Added to test helpers, 16 files migrated |
| Phase 1 | - | ENV_ALLOWED_DIRS constant | 2026-04-18 | Added to constants.js |
| Phase 1 | - | get-fidelity-report signature fix | 2026-04-18 | Bug fix |
| Phase 2 | - | readAndParse/Pair/Multi migration | 2026-04-18 | 14 tools migrated |
| Phase 2 | - | mockChrome migration | 2026-04-18 | 12 extension tests migrated |
| Phase 2 | - | styles.js COLOR constants | 2026-04-18 | 7 sidebar modules migrated |
