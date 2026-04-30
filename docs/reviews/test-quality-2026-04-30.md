# Test Quality Audit - 2026-04-30

## Executive Summary

**Suite size:** 1795 tests across 160 files (1259 extension, 536 server). All green. Zero skipped unit/integration tests.

**Overall assessment:** The test suite provides solid regression safety for the core capture pipeline, HMAC auth, path traversal, and MCP tool layer. Assertion quality is generally strong (2045 strong assertions vs 213 weak out of 2926 total). The (+)/(-) naming convention is well-adopted (1030 positive, 321 negative, 495 unlabeled). Shared test helpers (chrome mock, server mock, MCP test client) reduce duplication effectively.

**Key gaps:**
1. No tests for the `setSvg`/`svgFromString` functions despite a known SVG regression
2. 20 server source files lack dedicated unit tests (some covered indirectly via integration)
3. Real `setTimeout` in continuous-capture tests creates flakiness risk
4. E2E tier is entirely placeholder (26 `.todo` tests, zero implemented)
5. CI does not publish coverage reports or test result artifacts
6. `annotate.test.js` at 2047 lines / 239 tests is a maintenance risk

**Pyramid balance:** Heavy unit base (good), thin integration layer (4 files), zero E2E. The pyramid shape is correct but the integration tier is thin for a browser extension + MCP server project.

**Refactor safety:** The suite would catch most regressions in capture format, auth, path security, MCP tools, and DOM traversal. It would miss regressions in the sidebar orchestration layer (`annotation-sidebar.js`, 777 lines, untested) and enrichment pipeline composition.

---

## Findings

### F1: No dedicated tests for setSvg/svgFromString (SVG regression gap)

| Field | Content |
|---|---|
| Severity | **High** |
| Category | Changed code without tests |
| Scope | Local |
| Evidence | `extension/lib/sidebar/icons.js` exports `setSvg` (line 231) and `svgFromString` (line 240). No test file imports or tests either function. The icons.test.js tests icon factory functions but not the `setSvg`/`svgFromString` helpers that were part of the SVG regression. `annotate.test.js` lines 872-889 test SVG success states but only assert against hardcoded HTML strings, not actual production code behavior. |
| Failure mode | A repeat of the svgFromString→setSvg migration regression would go undetected. The `setSvg` function uses `innerHTML` assignment; `svgFromString` creates a wrapper span. Behavioral differences between these two approaches (e.g., namespace handling, event listener loss) are untested. |
| Fix | Add unit tests for `setSvg` and `svgFromString` in `icons.test.js` or a new `svg-helpers.test.js`. Test: (1) SVG renders with correct namespace, (2) child elements survive `replaceChildren`, (3) `setSvg` vs `svgFromString` produce equivalent DOM output. |
| Effort | Low |
| Requires prod change | No |

### F2: annotate.test.js SVG success state tests assert string literals, not behavior

| Field | Content |
|---|---|
| Severity | **Medium** |
| Category | Assertion quality |
| Scope | Local |
| Evidence | `annotate.test.js` lines 872-883: tests create a hardcoded HTML string and assert it contains `'polyline'` and `'Sent!'`. This tests the test data, not production code. Removing the production code would not fail these tests. |
| Failure mode | False confidence. These tests pass regardless of what the production code does. |
| Fix | Rewrite to call the actual production function that renders the success state, then assert the DOM output contains an SVG element and the expected text. |
| Effort | Low |
| Requires prod change | No |

### F3: Real setTimeout in continuous-capture tests (flakiness)

| Field | Content |
|---|---|
| Severity | **Medium** |
| Category | Flakiness patterns |
| Scope | Local (1 file, 5 occurrences) |
| Evidence | `extension/tests/unit/session/continuous-capture.test.js` lines 36, 48, 88, 97, 105 use `await new Promise((r) => setTimeout(r, 2200-2500))` with real timers. The same file also has tests using `vi.useFakeTimers()` correctly (lines 53-73), showing the pattern is known but inconsistently applied. |
| Failure mode | Under CI load or slow environments, the 2200ms wait may not be enough for the 2000ms debounce + MutationObserver flush. These tests will intermittently fail. |
| Fix | Convert all 5 real-timer tests to use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`, matching the pattern already used in the rate-limiting test in the same file. |
| Effort | Low |
| Requires prod change | No |

### F4: E2E tier entirely unimplemented

| Field | Content |
|---|---|
| Severity | **Medium** |
| Category | Test type imbalance |
| Scope | Systemic |
| Evidence | `extension/tests/e2e/capture-flow.e2e.js` contains 26 `it.todo()` tests across 6 describe blocks. Zero implemented. Comment says "planned for M7." |
| Failure mode | No automated verification of the full capture→push→MCP flow. Extension injection, CSP handling, and cross-origin iframe behavior are untested end-to-end. |
| Fix | Implement the top 5 highest-value E2E tests using Playwright with `--load-extension`. Priority: capture flow, HTTP push, content script injection on chrome:// pages. |
| Effort | High |
| Requires prod change | No |

### F5: annotation-sidebar.js (777 lines) has no unit tests

| Field | Content |
|---|---|
| Severity | **Medium** |
| Category | Coverage gaps on critical paths |
| Scope | Local |
| Evidence | `extension/lib/annotation-sidebar.js` (777 lines) is the main orchestrator for the sidebar UI. No test file exists for it. Individual sub-modules (header, footer, strip, review, etc.) are tested, but the orchestration logic (initialization, tab switching, state management, event wiring) is not. |
| Failure mode | Regressions in sidebar initialization order, tab switching, or event delegation would go undetected. |
| Fix | Add `sidebar/annotation-sidebar.test.js` testing: initialization, tab switching, collapse/expand, event delegation to sub-modules. |
| Effort | Medium |
| Requires prod change | No |

### F6: 20 server tool/analysis files lack dedicated unit tests

| Field | Content |
|---|---|
| Severity | **Low** |
| Category | Coverage gaps |
| Scope | Repeated |
| Evidence | These server source files have no dedicated test file: `validate-capture.js`, `get-unresolved.js`, `get-capture-stats.js`, `compare-baseline.js`, `compare-screenshots.js`, `set-baseline.js`, `list-baselines.js`, `list-sessions.js`, `visualize-flow.js`, `detect-recurring-issues.js`, `diff-annotations.js`, `generate-spec.js`, `analyze-journey.js`, `analyze-patterns.js`, `check-annotation-status.js`, `check-consistency.js`, `recurring-issues.js`, `constants.js`, `ws-message-types.js`, `tool-helpers.js`. Some are exercised indirectly via `full-server.test.js` (integration) or other test files (e.g., `tool-helpers.js` is tested via `fuzzy-filename.test.js`). |
| Failure mode | Regressions in individual tool logic would only be caught by integration tests, which are coarser and slower to diagnose. |
| Fix | Prioritize unit tests for `validate-capture.js` (security-critical), `get-unresolved.js` (used in prompt injection wrapping), and `compare-screenshots.js` (complex image diffing). The rest are lower priority since they're thin wrappers over tested analysis functions. |
| Effort | Medium |
| Requires prod change | No |

### F7: Duplicate `makeCapture`/`validCapture` factory functions

| Field | Content |
|---|---|
| Severity | **Low** |
| Category | Repeated setup and teardown |
| Scope | Repeated (5 files) |
| Evidence | `makeCapture()` is defined independently in: `annotation-diff.test.js`, `capture-diff.test.js`, `archive.test.js`, `resolve-annotation.test.js`. `validCapture()` is defined in `http-receiver-security.test.js`. Each has a slightly different shape. |
| Failure mode | When the capture format changes, each factory must be updated independently. Risk of test drift where factories produce captures that don't match the current format spec. |
| Fix | Extract a shared `createTestCapture()` factory into `server/tests/fixtures/factory.js` with sensible defaults and override support. |
| Effort | Low |
| Requires prod change | No |

### F8: CI does not publish coverage reports or JUnit XML

| Field | Content |
|---|---|
| Severity | **Low** |
| Category | CI orchestration gaps |
| Scope | Systemic |
| Evidence | `.github/workflows/ci.yml` runs `npm run test:server` and `npm run test:ext` but does not: (1) generate coverage reports, (2) upload coverage as artifacts, (3) export JUnit XML for PR annotations, (4) enforce coverage thresholds. Extension vitest config has coverage configured (`v8` provider, `json-summary` + `html` reporters) but CI doesn't invoke it. Node matrix is `[22]` only despite the comment mentioning 18/20/22. |
| Failure mode | Coverage regressions go unnoticed. No trend data. No PR-level feedback on test gaps. |
| Fix | Add `--coverage` flag to CI test commands. Upload `coverage/` as artifact. Add `vitest --reporter=junit --outputFile=results.xml` for PR annotations. Expand node matrix to `[18, 22]` as originally planned. |
| Effort | Low |
| Requires prod change | No |

### F9: enrichment.js excluded from coverage and untested

| Field | Content |
|---|---|
| Severity | **Low** |
| Category | Coverage gaps |
| Scope | Local |
| Evidence | `extension/vitest.config.js` line 16 explicitly excludes `lib/enrichment.js` from coverage. The file (115 lines) is the single entry point that orchestrates all 21 enrichment collectors. Individual collectors are well-tested, but the composition (error isolation via `safeCollect`, collector ordering) is not. |
| Failure mode | A broken import or incorrect `safeCollect` wrapping would silently drop enrichment data from captures. |
| Fix | Add `enrichment.test.js` testing: (1) all collectors are called, (2) one failing collector doesn't crash others, (3) output shape matches expected enrichment schema. Remove from coverage exclusion. |
| Effort | Low |
| Requires prod change | No |

### F10: WebSocket server test uses real network (classification mismatch)

| Field | Content |
|---|---|
| Severity | **Low** |
| Category | Under-isolation |
| Scope | Local |
| Evidence | `server/tests/unit/ws-server.test.js` creates a real HTTP server, binds to port 0, and connects real WebSocket clients. This is an integration test classified as a unit test. The `afterEach` cleanup is thorough (terminates clients, closes server), but port binding can fail under parallel test execution. |
| Failure mode | Unlikely to cause issues with vitest's default isolation, but misclassification makes the unit test suite slower and less predictable. |
| Fix | Move to `server/tests/integration/` or mock the WebSocket layer for true unit testing. Low priority since the test is well-written and cleanup is correct. |
| Effort | Low |
| Requires prod change | No |

---

## Coverage Gap Map

| Module | Unit | Integration | E2E | Critical Path | Priority |
|---|---|---|---|---|---|
| HMAC auth (server) | ✅ Full | ✅ | ❌ | Full | Acceptable |
| Auth middleware (server) | ✅ Full | ✅ | ❌ | Full | Acceptable |
| Path traversal (server) | ✅ Full | ✅ | ❌ | Full | Acceptable |
| HTTP receiver (server) | ✅ Full | ✅ | ❌ | Full | Acceptable |
| MCP tools (server, 41) | ✅ ~25 tested | ✅ smoke | ❌ | Partial | Medium |
| Capture format v2 (server) | ✅ Full | ✅ | ❌ | Full | Acceptable |
| DOM traverser (extension) | ✅ Full | ✅ hostile | ❌ | Full | Acceptable |
| Sidebar icons/SVG (extension) | ✅ Partial | ❌ | ❌ | Partial | **High** |
| Annotation sidebar (extension) | ❌ None | ✅ lifecycle | ❌ | None | **High** |
| Enrichment pipeline (extension) | ❌ None | ❌ | ❌ | None | Medium |
| Transport/discovery (extension) | ✅ Full | ❌ | ❌ | Full | Acceptable |
| WebSocket server | ✅ (misclassified) | ❌ | ❌ | Partial | Low |
| Collectors (extension, 21) | ✅ Full | ❌ | ❌ | Full | Acceptable |
| Export (markdown/zip) | ✅ Full | ❌ | ❌ | Full | Acceptable |
| Session management | ✅ Full | ❌ | ❌ | Full | Acceptable |
| Prompt injection defense | ✅ Full | ❌ | ❌ | Full | Acceptable |

---

## Refactor Roadmap

### Phase 1: Fix false confidence (1-2 days)

1. **Rewrite annotate.test.js SVG success state tests** to call production code instead of asserting string literals (F2)
2. **Add setSvg/svgFromString tests** to prevent SVG regression recurrence (F1)
3. **Convert continuous-capture real timers to fake timers** (F3)
4. **Extract shared capture factory** from 5 duplicate definitions (F7)

Validate: All 1795 tests still pass. No new failures introduced.

### Phase 2: Fill critical path gaps (3-5 days)

1. **Add annotation-sidebar.js tests** - initialization, tab switching, event delegation (F5)
2. **Add enrichment.js tests** - composition, error isolation (F9)
3. **Add unit tests for top-priority untested server tools**: `validate-capture.js`, `get-unresolved.js`, `compare-screenshots.js` (F6)
4. **Enable CI coverage reporting** with threshold enforcement (F8)

Validate: Coverage increases. CI reports coverage on every PR.

### Phase 3: Structural improvements (ongoing)

1. **Implement top 5 E2E tests** with Playwright (F4)
2. **Move ws-server.test.js to integration/** (F10)
3. **Add remaining server tool unit tests** for the lower-priority 17 files (F6)
4. **Split annotate.test.js** (2047 lines) into focused test files by concern

Validate: E2E tests catch real browser integration issues. Test suite runs in < 60s.

---

## Do Not Miss Checklist

- [x] Assertion quality across all test files — 2045 strong / 213 weak / 2926 total. One false-confidence pattern found (F2).
- [x] Mock depth and whether mocked code is the code under test — Chrome mock and server mock are well-designed with realistic behavior. No over-mocking detected.
- [x] Auth and permission path test coverage — HMAC sign/verify, middleware handshake, session validation, timestamp expiry all tested with positive and negative cases.
- [x] Payment, mutation, and job processing coverage — N/A (no payments or job processing).
- [x] API contract and service boundary tests — MCP tool tests use InMemoryTransport for full protocol path. HTTP receiver tests use real HTTP.
- [x] Edge cases: null, empty, boundary values, invalid input — Path traversal tests cover null bytes, URL encoding, backslash, empty string, dot-only. Trust classification covers empty URLs, invalid URLs, IPv6.
- [x] Async and timing-sensitive test patterns — One flakiness risk found (F3). Most async tests use fake timers correctly.
- [x] Skipped or disabled tests with no explanation — Zero skipped unit/integration tests. 26 E2E todos are documented with rationale.
- [x] Test data and fixture duplication — 5 duplicate capture factories found (F7). Shared fixtures directory exists and is used.
- [x] Test naming clarity and failure message quality — (+)/(-) convention well-adopted (73% of tests). Names are descriptive.
- [x] Changed or new modules without corresponding test updates — setSvg/svgFromString migration lacks tests (F1).
- [x] CI artifact publication, report format, and matrix coverage — No coverage artifacts, no JUnit XML, node matrix reduced from planned 18/20/22 to just 22 (F8).
- [x] AI-generated bulk test artifacts — No evidence of bulk-generated tests. Test structure is consistent and purposeful.
- [x] Lambda handler coverage — N/A (no Lambda handlers).
- [x] Test portfolio balance — Strong unit base, thin integration, zero E2E. Pyramid shape correct but missing top tier.
