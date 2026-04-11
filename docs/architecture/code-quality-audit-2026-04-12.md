# ViewGraph Code Quality Audit Report

**Date:** 2026-04-12
**Scope:** Full codebase - 58 server source files, 44 extension source files
**Method:** Systematic file-by-file review of all source code
**Focus:** Code smells, DRY violations, optimization opportunities, consistency issues, maintainability

---

## Executive Summary

The codebase is well-structured with clear separation of concerns, consistent naming, and good documentation. The main issues are: (1) a duplicated `buildSelector` function across 5 extension files, (2) a duplicated 15-line enrichment collection block across 4 call sites, (3) the 1800-line `annotation-sidebar.js` god module, (4) a stale token fetch from `/info` that no longer returns a token, and (5) several unused imports. Most issues are DRY violations that increase maintenance burden but don't affect correctness.

17 findings total: 3 HIGH (maintainability), 8 MEDIUM, 6 LOW.

---

## Findings

### CQ-01: buildSelector Duplicated in 5 Files
- **Severity:** HIGH (maintainability)
- **Files:**
  - `extension/lib/traverser.js:72` - `buildSelector(el)` - most complete version
  - `extension/lib/event-listener-collector.js:116` - `buildSelector(el)` - tag#id or tag.class
  - `extension/lib/animation-collector.js:59` - `buildSelector(el)` - tag#id or tag[testid]
  - `extension/lib/intersection-collector.js:68` - `buildSelector(el)` - tag#id or tag[testid]
  - `extension/lib/subtree-capture.js:82` - `buildSelector(el)` - tag#id or tag[testid]
- **Issue:** Five independent implementations of the same concept with subtle differences. The traverser version uses nth-child fallback, the collector versions use class-based fallback. Changes to selector strategy must be replicated in 5 places.
- **Fix:** Extract to `extension/lib/selector.js` with a single `buildSelector(el)` function. All consumers import from there.

### CQ-02: Enrichment Collection Block Duplicated 4 Times
- **Severity:** HIGH (maintainability)
- **Files:**
  - `extension/entrypoints/content.js:68` (capture handler)
  - `extension/entrypoints/content.js:107` (build-report handler)
  - `extension/entrypoints/content.js:131` (send-review handler)
  - `extension/lib/auto-capture.js:95` (auto-capture)
- **Issue:** The exact same 15-line block calling 14 `safeCollect()` wrappers is copy-pasted 4 times. Adding a new enrichment collector requires editing 4 files.
- **Fix:** Extract to `extension/lib/enrichment.js`:
  ```js
  export async function collectAllEnrichment() { ... }
  ```

### CQ-03: annotation-sidebar.js is 1800+ Lines
- **Severity:** HIGH (maintainability)
- **File:** `extension/lib/annotation-sidebar.js` (~1800 lines, 83KB)
- **Issue:** Single `create()` function builds the entire sidebar UI imperatively: header, tabs, mode bar, settings overlay, inspect tab with 8 collapsible sections, capture history, session recording, footer with 3 export buttons, filter tabs, annotation entries, request cards, confirmation dialogs, and WebSocket connection. Untestable in isolation.
- **Fix:** This is a large refactor. Document as tech debt. When touched next, split into:
  - `sidebar-header.js` - header + status + collapse
  - `sidebar-review.js` - annotation list + filters
  - `sidebar-inspect.js` - diagnostics sections
  - `sidebar-settings.js` - settings overlay
  - `sidebar-footer.js` - export buttons

### CQ-04: Stale Token Fetch in constants.js
- **Severity:** MEDIUM
- **File:** `extension/lib/constants.js:66` - `fetchToken()`
- **Issue:** `fetchToken()` reads `data.token` from the `/info` endpoint response. But the security audit removed the `token` field from `/info` (S1-1). So `_cachedToken` is now always `null`, and `authHeaders()` always returns `{}`. This means all POST requests from the extension are unauthenticated.
- **Fix:** The extension needs a different way to get the token. Options:
  1. Read from `.viewgraph/.token` file via native messaging
  2. Add a `/auth` endpoint that requires a one-time filesystem proof
  3. For now: read token from extension settings (user pastes it from server startup log)

### CQ-05: Unused Imports in annotate.js
- **Severity:** LOW
- **File:** `extension/lib/annotate.js:12-14`
- **Issue:** `traverseDOM`, `scoreAll`, and `serialize` are imported but never used. Left over from when annotate.js handled capture directly.
- **Fix:** Remove the three unused imports.

### CQ-06: Unused Import in get-unresolved.js
- **Severity:** LOW
- **File:** `server/src/tools/get-unresolved.js:7`
- **Issue:** `import path from 'path'` is imported but never used.
- **Fix:** Remove the import.

### CQ-07: flashElement Called with Wrong Variable
- **Severity:** MEDIUM
- **File:** `extension/lib/annotate.js` - `freeze()` function
- **Issue:** `flashElement(el)` is called but `el` is not defined in that scope. The correct variable is `currentEl`. The flash effect never fires on element selection.
- **Fix:** Change to `flashElement(currentEl)`.

### CQ-08: No Fetch Timeout on Two Sidebar Calls
- **Severity:** MEDIUM
- **File:** `extension/lib/annotation-sidebar.js:1049-1051`
- **Issue:** Two fetch calls (`/health` and `/captures`) lack `AbortSignal.timeout()`. If the server hangs, these block indefinitely, preventing the Inspect tab from rendering.
- **Fix:** Add `{ signal: AbortSignal.timeout(3000) }` to both calls.

### CQ-09: Serializer Enrichment Block is Repetitive
- **Severity:** MEDIUM
- **File:** `extension/lib/serializer.js:170-185`
- **Issue:** 15 consecutive `if (enrichment.X) capture.X = enrichment.X;` lines. Adding a new enrichment section requires adding a line here AND in the parser AND in the summary.
- **Fix:** Use a loop over a shared enrichment key list:
  ```js
  const ENRICHMENT_KEYS = ['network', 'console', 'breakpoints', ...];
  for (const key of ENRICHMENT_KEYS) { if (enrichment[key]) capture[key] = enrichment[key]; }
  ```

### CQ-10: Parser Enrichment Block is Repetitive
- **Severity:** MEDIUM
- **File:** `server/src/parsers/viewgraph-v2.js:95-112`
- **Issue:** Same pattern as CQ-09 but in the parser. 15 lines of `X: raw.X ?? null`.
- **Fix:** Same loop approach with shared key list.

### CQ-11: HTTP Receiver handleRequest is 250+ Lines
- **Severity:** MEDIUM
- **File:** `server/src/http-receiver.js:90-340`
- **Issue:** Single `handleRequest` function handles all 15 endpoints with nested if/else chains. Each endpoint handler is 10-30 lines inline.
- **Fix:** Extract each endpoint handler to a named function. The main handler becomes a router:
  ```js
  const routes = { 'GET /health': handleHealth, 'POST /captures': handleCaptures, ... };
  ```

### CQ-12: Dynamic Imports Inside Request Handlers
- **Severity:** MEDIUM
- **File:** `server/src/http-receiver.js` - multiple handlers
- **Issue:** Several handlers use `await import(...)` inside the request path (e.g., `const { readFile } = await import('fs/promises')`). This adds latency to every request and is unnecessary since these are standard library modules.
- **Fix:** Move all imports to the top of the file as static imports.

### CQ-13: O(n^2) Sibling Overlap Detection
- **Severity:** LOW
- **File:** `server/src/analysis/layout-analysis.js:120` - `detectOverlaps()`
- **Issue:** Compares every pair of siblings within each parent. For a parent with N children, this is O(N^2). With typical captures (5-20 siblings), this is fine. A flat DOM with 500 children under one parent would produce 124,750 comparisons.
- **Fix:** Add a cap: skip parents with >50 children. Low priority.

### CQ-14: /annotations/resolved Reads All Files Per Request
- **Severity:** MEDIUM
- **File:** `server/src/http-receiver.js:240-260`
- **Issue:** The endpoint iterates ALL indexed captures, reads each from disk, parses JSON, and filters by URL. The extension polls this on sidebar open. With 50 captures, this reads and parses 50 files per request.
- **Fix:** Cache resolved annotations in the indexer (update on file change via watcher).

### CQ-15: Silent catch-continue in Multiple Tools
- **Severity:** LOW
- **File:** Multiple tools (`list_sessions`, `get_session`, `detect_recurring_issues`, `analyze_patterns`, `generate_spec`, `get_capture_stats`, `diff_annotations`)
- **Issue:** `try { ... } catch { continue; }` silently swallows all errors including unexpected ones (permission errors, OOM). Makes debugging difficult.
- **Fix:** Log skipped files: `catch (err) { process.stderr.write(...); continue; }`.

### CQ-16: readBody Double-Settlement Possible
- **Severity:** LOW
- **File:** `server/src/http-receiver.js:55-62` - `readBody()`
- **Issue:** When payload exceeds limit, `req.destroy()` is called and promise rejects. But the `end` listener may still fire, calling `resolve()` after `reject()`. Node.js ignores double-settlement but it's a code smell.
- **Fix:** Add a `settled` flag.

### CQ-17: Unbounded Annotation Storage Growth
- **Severity:** LOW
- **File:** `extension/lib/annotate.js` - `save()` function
- **Issue:** Annotations stored per-URL in `chrome.storage.local` with no eviction. A user annotating 100 pages accumulates 100 storage keys that are never cleaned up.
- **Fix:** Add LRU eviction when saving (prune oldest if >50 URLs).

---

## Summary Table

| ID | Severity | Category | Fix Effort | Description |
|---|---|---|---|---|
| CQ-01 | HIGH | DRY | Small | buildSelector duplicated in 5 files |
| CQ-02 | HIGH | DRY | Small | Enrichment block duplicated 4 times |
| CQ-03 | HIGH | Maintainability | Large | annotation-sidebar.js is 1800 lines |
| CQ-04 | MEDIUM | Bug | Small | Stale token fetch after security fix |
| CQ-05 | LOW | Dead code | Trivial | Unused imports in annotate.js |
| CQ-06 | LOW | Dead code | Trivial | Unused import in get-unresolved.js |
| CQ-07 | MEDIUM | Bug | Trivial | flashElement called with wrong variable |
| CQ-08 | MEDIUM | Reliability | Trivial | Missing fetch timeouts in sidebar |
| CQ-09 | MEDIUM | DRY | Small | Serializer enrichment block repetitive |
| CQ-10 | MEDIUM | DRY | Small | Parser enrichment block repetitive |
| CQ-11 | MEDIUM | Maintainability | Medium | HTTP receiver is 250-line function |
| CQ-12 | MEDIUM | Performance | Small | Dynamic imports in request handlers |
| CQ-13 | LOW | Performance | Trivial | O(n^2) overlap detection |
| CQ-14 | MEDIUM | Performance | Medium | /annotations/resolved reads all files |
| CQ-15 | LOW | Error handling | Small | Silent catch-continue in tools |
| CQ-16 | LOW | Code smell | Trivial | readBody double-settlement |
| CQ-17 | LOW | Resource leak | Small | Unbounded annotation storage |

---

## Positive Observations

1. Consistent file-level JSDoc on every module
2. Clean separation: analysis logic in `analysis/`, tools in `tools/`, parsers in `parsers/`
3. Parser never throws - returns `{ ok, data/error }` result objects
4. `safeCollect()` wrapper prevents enrichment failures from crashing captures
5. Constants centralized in dedicated files (both server and extension)
6. Storage keys centralized in `storage.js` KEYS registry
7. Consistent error handling pattern across MCP tools
8. Good test coverage: 923 tests across 81 test files
