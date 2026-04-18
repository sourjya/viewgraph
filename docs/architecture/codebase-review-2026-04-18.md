# ViewGraph Codebase Review - Comprehensive Refactor Plan

**Date:** 2026-04-18
**Scope:** Full repository (server + extension + tests + scripts)
**Codebase:** 36,798 LOC across 1,146 files, 299 source files

---

## A. Executive Summary

### Most Important Maintainability Risks

1. **Server tool file-reading fragmentation** - 21 of 37 MCP tools manually reimplement file reading instead of using the shared `readAndParse` helper. This means 21 tools lack fuzzy filename suggestions, have inconsistent error messages, and duplicate ~200 lines of validation/parse/error logic.

2. **F19 prompt injection defense gaps** - 12 tools return user-provided text without `wrapCapturedText`/`wrapComment` wrapping. The defense-in-depth strategy has holes in `find-missing-testids`, `detect-recurring-issues`, `analyze-patterns`, `generate-spec`, `diff-annotations`, `compare-captures`, `compare-baseline`, `get-latest`, `get-session`, `check-annotation-status`, `check-consistency`.

3. **WS_MESSAGES copy-paste between workspaces** - `server/src/ws-message-types.js` and `extension/lib/ws-message-types.js` are identical 22-line files with a "must stay in sync" comment but no enforcement. Adding a new message type to one side silently breaks the protocol.

### Strongest Reuse Opportunities

1. **`jsonResponse(data)` + `errorResponse(msg)` helpers** - would eliminate 92 repeated response constructions across 36 tool files
2. **`readAndParseMulti(filenames, capturesDir)` helper** - would eliminate loop boilerplate in 7 multi-file tools
3. **Server test `createFixtureClient` helper** - would eliminate 3-line boilerplate from 21 test files (63 lines)
4. **Extension `mockChrome()` migration** - 12 test files define inline chrome mocks instead of using the existing shared helper

### Areas with Highest Duplication

1. **Sidebar CSS colors** - 245 hardcoded color values across 13 sidebar files. `styles.js` exists with constants but is ignored by 90% of consumers.
2. **Server tool response formatting** - 92 identical `JSON.stringify` + MCP response wrapper constructions
3. **Collector DOM traversal** - 6 collectors copy-paste the same TreeWalker + ATTR skip + max cap pattern
4. **Test setup boilerplate** - 21 server tool tests repeat identical cleanup wiring; 12 extension tests repeat inline chrome mocks

### Highest-Confidence Quick Wins

1. Add `jsonResponse()` + `errorResponse()` to `tool-helpers.js` (0 risk, 36 files simplified)
2. Export `FIXTURES_DIR` from server test helpers (0 risk, 18 files simplified)
3. Add `ENV_ALLOWED_DIRS` to `constants.js` (0 risk, consistency fix)
4. Fix `get-fidelity-report.js` register signature (bug fix, 1 file)

---

## B. Findings Table

| # | Title | Severity | Category | Scope | Evidence | Why It Matters | Recommended Refactor | Effort | Risk | Payoff |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Legacy file-reading in 21 tools | High | Duplication | Systemic | 21 of 37 tool files use manual validateCapturePath + readFile + parse instead of readAndParse | No fuzzy filename suggestions, inconsistent errors, 200+ duplicated lines | Migrate to readAndParse; add readAndParseMulti for loop tools, readAndParsePair for comparison tools | Medium | Low | High |
| 2 | F19 wrapping gaps in 12 tools | High | Security | Systemic | find-missing-testids, detect-recurring-issues, analyze-patterns, generate-spec, diff-annotations, compare-captures, compare-baseline, get-latest, get-session, check-annotation-status, check-consistency, get-capture | Prompt injection defense has holes - user text reaches agent unwrapped | Add wrapCapturedText/wrapComment to all tools returning user text | Low | Low | High |
| 3 | WS_MESSAGES duplicate across workspaces | High | Duplication | Systemic | server/src/ws-message-types.js and extension/lib/ws-message-types.js (identical 22 lines) | Adding a message type to one side silently breaks protocol | Add build-time sync check or extract to shared package | Low | Low | Medium |
| 4 | 92 repeated JSON response constructions | High | Duplication | Systemic | 36 tool files, 40 success + 52 error response patterns | Every new tool copies the same 1-line wrapper | Add jsonResponse(data) + errorResponse(msg) to tool-helpers.js | Low | None | High |
| 5 | 245 hardcoded CSS colors in sidebar | High | Constants | Systemic | 13 sidebar files, top offenders: #666 (48x), #9ca3af (34x), #4ade80 (26x), #f59e0b (24x), #6366f1 (20x) | styles.js exists but is ignored; theme changes require touching 13 files | Add ~10 semantic color constants to styles.js, migrate consumers | Medium | Low | High |
| 6 | styles.js defined but unused | Medium | Dead Code | Systemic | styles.js defines TOGGLE_ON/OFF, DESC_STYLE, ICON_BTN_STYLE etc. but only suggestions-ui.js imports FONT | Constants exist but nobody uses them | Migrate toggles.js, diagnostics.js, captures.js to import from styles.js | Low | None | Medium |
| 7 | 6 collectors duplicate TreeWalker boilerplate | Medium | Duplication | Repeated | stacking-collector, component-collector, event-listener-collector, scroll-collector, focus-collector, animation-collector | ~60 lines of identical DOM walking code | Extract walkDOM() generator to collector-utils.js | Low | Low | Medium |
| 8 | 21 server tool tests repeat cleanup boilerplate | Medium | Test Duplication | Systemic | All tool test files: let cleanup; afterEach; const { client, cleanup: c } = await createTestClient(...); cleanup = c; | 63 duplicated lines, every new tool test copies the pattern | Add createFixtureClient() to helpers.js | Low | None | Medium |
| 9 | 18 test files repeat FIXTURES_DIR definition | Medium | Test Duplication | Systemic | const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures') in 18 files | Identical line in every tool test | Export from helpers.js | Low | None | Low |
| 10 | 12 extension tests define inline chrome mocks | Medium | Test Duplication | Systemic | annotation-sidebar.test.js, annotate.test.js, transport.test.js, storage.test.js, etc. | mockChrome() exists in mocks/chrome.js but only 1 file uses it | Migrate all 12 files to shared mockChrome(overrides) | Medium | Low | Medium |
| 11 | get-fidelity-report.js broken register signature | Medium | Bug | Local | register(server, capturesDir) - missing indexer param, inconsistent with all other tools | Caller passes (server, indexer, capturesDir) - capturesDir receives indexer object | Fix to register(server, _indexer, capturesDir) | Low | Low | Low |
| 12 | 5 different register function signatures | Medium | Inconsistency | Systemic | (server, _indexer, capturesDir) x18, (server, indexer, capturesDir) x11, (server, indexer) x2, (server, queue) x2, (server, capturesDir) x1 | Confusing for contributors, error-prone when adding tools | Standardize on (server, deps) object pattern or document the variants | Low | Medium | Low |
| 13 | Inconsistent _notice field across tools | Medium | Inconsistency | Systemic | 5 of 37 tools include _notice, each with different wording | No standard notice text, inconsistent agent guidance | Add NOTICE constants to tool-helpers.js, apply to all text-returning tools | Low | None | Medium |
| 14 | Missing ENV_ALLOWED_DIRS constant | Low | Constants | Local | server/src/config.js accesses process.env.VIEWGRAPH_ALLOWED_DIRS directly; other env vars use ENV_ constants | Inconsistent with ENV_CAPTURES_DIR, ENV_MAX_CAPTURES, ENV_HTTP_PORT, ENV_IDLE_TIMEOUT pattern | Add to constants.js | Low | None | Low |
| 15 | FORMAT_VERSION hardcoded in extension serializer | Low | Constants | Local | server/src/constants.js exports FORMAT_VERSION; extension/lib/capture/serializer.js hardcodes 'viewgraph-v2' | Cross-workspace, can't import directly | Document sync requirement, add comment | Low | None | Low |
| 16 | 40+ mouseenter/mouseleave hover pairs in sidebar | Low | Duplication | Systemic | header.js, footer.js, strip.js, review.js, settings.js, help.js, suggestions-ui.js, inspect.js | ~80 event listener registrations for hover effects | Extract addHover(el, enterStyle, leaveStyle) helper | Low | None | Low |
| 17 | Collector return shape inconsistency | Low | Inconsistency | Repeated | 4 collectors return {data, issues}, 7 return flat objects, 1 returns null, 1 returns boolean | diagnostics.js must handle each shape differently | Document expected shapes; unify to {data, issues?} envelope long-term | Medium | Medium | Low |
| 18 | Hardcoded port 9876 in 8 script locations | Low | Constants | Repeated | viewgraph-status.js, viewgraph-init.js, viewgraph-doctor.js (5x) | Scripts can't import from server/extension constants | Define const DEFAULT_PORT = 9876 at top of each script | Low | None | Low |

---

## C. Refactor Roadmap

### Phase 1: Safe Quick Wins (1-2 days, zero regression risk)

**Why these first:** No behavior change, pure code reduction, can be reviewed in small PRs.

| # | Item | Files | Lines saved |
|---|---|---|---|
| 1a | Add `jsonResponse(data)` + `errorResponse(msg)` to tool-helpers.js | 1 new, 36 updated | ~90 |
| 1b | Export `FIXTURES_DIR` from server test helpers.js | 1 updated, 18 simplified | ~18 |
| 1c | Add `ENV_ALLOWED_DIRS` to constants.js, use in config.js | 2 files | ~2 |
| 1d | Fix get-fidelity-report.js register signature | 1 file | Bug fix |
| 1e | Add `NOTICE_CAPTURED_TEXT` + `NOTICE_USER_COMMENT` constants | 1 new, 5 updated | Consistency |
| 1f | Define `const DEFAULT_PORT = 9876` in scripts that hardcode it | 3 files | Clarity |

**Test after:** Run full server + extension test suites. All 1498 tests must pass.

### Phase 2: Moderate Refactors (3-5 days, low regression risk)

**Why second:** These touch more files but follow established patterns.

| # | Item | Files | Impact |
|---|---|---|---|
| 2a | Migrate 3 single-file tools to readAndParse (get-component-coverage, validate-capture, get-fidelity-report) | 3 files | ~30 lines removed, adds fuzzy matching |
| 2b | Add readAndParsePair() for comparison tools (compare-captures, compare-styles, compare-baseline, check-annotation-status) | 1 new, 4 updated | ~50 lines removed |
| 2c | Add readAndParseMulti() for loop tools (analyze-journey, visualize-flow, diff-annotations, check-consistency, detect-recurring, analyze-patterns, generate-spec) | 1 new, 7 updated | ~80 lines removed |
| 2d | Add wrapCapturedText/wrapComment to 12 tools missing F19 wrapping | 12 files | Security gap closed |
| 2e | Add createFixtureClient() to server test helpers | 1 updated, 21 simplified | ~63 lines removed |
| 2f | Migrate 12 extension tests to shared mockChrome() | 12 files | Consistent mocking |
| 2g | Add semantic color constants to styles.js, migrate toggles.js | 2 files | Pattern established |

**Dependencies:** 2a-2c depend on 1a (jsonResponse/errorResponse). 2d is independent. 2e depends on 1b.
**Test after:** Full test suites. Verify F19 wrapping tests cover new tools.

### Phase 3: Structural Improvements (1-2 weeks, moderate risk)

**Why third:** These are broader changes that benefit from Phase 1-2 being stable.

| # | Item | Files | Impact |
|---|---|---|---|
| 3a | Migrate remaining 11 legacy tools to readAndParse variants | 11 files | All 37 tools use shared helpers |
| 3b | Extract collector-utils.js (walkDOM, isZeroSize, isVisuallyHidden) | 1 new, 6 updated | ~60 lines removed |
| 3c | Migrate all sidebar files to styles.js color constants | 13 files, 245 occurrences | Theme-changeable |
| 3d | Add WS_MESSAGES sync check to build/CI | 1 script | Protocol safety |
| 3e | Split annotation-sidebar.test.js monolith (1366 lines) into 8 files | 1 split into 8 | Test parallelism |
| 3f | Extract addHover() helper for sidebar | 1 new, 8 updated | ~80 listeners consolidated |

**Dependencies:** 3a depends on 2a-2c. 3c depends on 2g. 3e is independent.
**Test after:** Full suites + manual sidebar verification for 3c and 3f.

---

## D. Top 5 Patch Proposals

### D1. jsonResponse + errorResponse helpers

```js
// server/src/utils/tool-helpers.js - add these exports

export function jsonResponse(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function errorResponse(msg) {
  return { content: [{ type: 'text', text: msg }], isError: true };
}
```

Then in every tool: `return jsonResponse({ summary, elements });` instead of `return { content: [{ type: 'text', text: JSON.stringify({ summary, elements }, null, 2) }] };`

### D2. readAndParseMulti helper

```js
// server/src/utils/tool-helpers.js

export async function readAndParseMulti(filenames, capturesDir, level = 'full') {
  const results = [];
  for (const filename of filenames) {
    const { ok, parsed, error } = await readAndParse(filename, capturesDir, level);
    if (ok) results.push({ filename, parsed });
    // Skip failures silently (consistent with existing loop tools)
  }
  return results;
}
```

### D3. Server test FIXTURES_DIR + createFixtureClient

```js
// server/tests/unit/tools/helpers.js - add these exports

import path from 'path';
import { createIndexer } from '#src/indexer.js';

export const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

export async function createFixtureClient(registerFn) {
  const indexer = createIndexer({ maxCaptures: 10 });
  return createTestClient((s) => registerFn(s, indexer, FIXTURES_DIR));
}
```

### D4. F19 wrapping for find-missing-testids

```js
// server/src/tools/find-missing-testids.js - add import and wrap
import { wrapCapturedText } from '#src/utils/sanitize.js';

// In the response mapping:
id: n.id, tag: n.tag, text: wrapCapturedText(n.text),
```

Same pattern for all 12 tools listed in Finding #2.

### D5. Semantic color constants in styles.js

```js
// extension/lib/sidebar/styles.js - add these

export const COLOR = {
  muted: '#666',
  secondary: '#9ca3af',
  success: '#4ade80',
  warning: '#f59e0b',
  error: '#f87171',
  primary: '#6366f1',
  primaryLight: '#a5b4fc',
  primaryHover: '#818cf8',
  border: '#333',
  borderLight: '#2a2a3a',
  dim: '#555',
  white: '#fff',
  bgDark: '#1a1a2e',
  bgCard: '#16161e',
  bgHover: '#2a2a4a',
  bgHoverLight: 'rgba(255,255,255,0.06)',
};
```

---

## E. Consolidation Themes

### Theme 1: Server Tool Standardization
Findings: #1, #2, #4, #11, #12, #13
**One workstream:** Migrate all 37 tools to use shared helpers (readAndParse variants, jsonResponse, errorResponse, wrapping, notices). Eliminates ~400 lines of duplication and closes F19 security gaps.

### Theme 2: CSS Design Token Centralization
Findings: #5, #6, #16
**One workstream:** Populate styles.js with semantic color constants, migrate all 13 sidebar files. Enables future theming and reduces 245 hardcoded values to ~15 constant references.

### Theme 3: Test Infrastructure Consolidation
Findings: #8, #9, #10
**One workstream:** Extend server and extension test helpers with shared fixtures, mocks, and setup utilities. Simplifies 40+ test files.

### Theme 4: Collector Infrastructure
Findings: #7, #17
**One workstream:** Extract walkDOM + visibility helpers to collector-utils.js. Lower priority since collectors are stable and rarely modified.

### Theme 5: Cross-Workspace Sync
Findings: #3, #15
**One workstream:** Add build-time checks for WS_MESSAGES and FORMAT_VERSION sync between server and extension workspaces.

---

## F. Do Not Miss Checklist

| Area | Reviewed | Issues Found |
|---|---|---|
| Constants and magic values | Yes | 245 CSS colors, 16 timeout values, 8 port hardcodes |
| DTO and schema duplication | Yes | WS_MESSAGES duplicated; collector return shapes inconsistent |
| Auth and permission checks | Yes | No auth (removed for beta per ADR-010) - consistent |
| Logging and exception handling | Yes | Consistent stderr logging via LOG_PREFIX; safeCollect wrapper for collectors |
| API response consistency | Yes | 92 repeated response constructions; 5 different _notice wordings |
| Database access patterns | N/A | No database in this project |
| Validation paths | Yes | validateCapturePath used consistently; readAndParse adds fuzzy matching |
| Frontend form/state duplication | Yes | Sidebar hover effects (40+ pairs); button creation (3 patterns) |
| Test utilities and fixtures | Yes | Major duplication: 21 cleanup patterns, 18 FIXTURES_DIR, 12 inline chrome mocks |
| Config and environment access | Yes | Clean - only 1 violation (scripts, acceptable). Missing ENV_ALLOWED_DIRS. |
| Dependency duplication | Yes | No overlapping packages. Clean dependency tree. |
| Dead code and unused abstractions | Yes | styles.js constants defined but unused. No other dead code found. |
| Public contract drift | Yes | get-fidelity-report.js has broken register signature |
| Naming drift | Yes | _indexer vs indexer (18 vs 11 files); FIXTURES vs FIXTURES_DIR in tests |
| Async lifecycle safety | Yes | Steering rule added for extension async guards. Server has stdin close + idle timeout. |
| Cross-cutting concerns | Yes | F19 wrapping applied inconsistently (5 of 37 tools). |
