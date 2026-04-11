# ViewGraph - Strategic Recommendations

**Date:** 2026-04-11
**Source:** Product analysis, competitor research, codebase audit
**Status:** Active

---

## R1: Component Tree Mapping (Priority: P0)

**Gap:** When the agent sees `<div class="sc-bdfBwQ">` in a capture, it has no idea this is a `<ProductCard>` React component. The `find_source` grep works for testids and labels but fails for anonymous wrapper divs that make up 60%+ of a typical React/Vue app.

**What to build:**
- Content script detects framework (React via `__REACT_DEVTOOLS_GLOBAL_HOOK__` or `_reactFiber` on DOM nodes, Vue via `__vue_app__`, Svelte via `__svelte_meta`)
- For React: walk `_reactFiber` on each DOM node to extract component name and source file (if available from source maps)
- For Vue: walk `__vue__` instances to extract component name
- Embed `component` field on each node in the capture: `{ name: "ProductCard", file: "src/components/ProductCard.tsx" }`
- Agent can then jump directly from DOM element to component file without grep

**Impact:** Eliminates the #1 remaining friction in the annotation-to-fix workflow. Agent goes from "div with class hash" to "ProductCard in src/components/ProductCard.tsx" instantly.

**Effort:** 2-3 days. React is the priority (80%+ of MCP agent users). Vue/Svelte are incremental.

**Roadmap link:** M12.3 (Component tree mapping)

---

## R2: Deeper WCAG Coverage (Priority: P1)

**Gap:** ViewGraph's a11y audit covers 6 rules (missing alt, button names, form labels, empty aria-label, contrast, form validation). axe-core has 100+ rules. Teams doing serious accessibility work will still need axe alongside ViewGraph.

**What to build:**
- Don't reimplement axe-core. Instead, integrate it as an optional dependency
- New enrichment collector: `collectAxeResults()` runs axe-core scan in the content script
- Results included in capture as `axe` section
- `audit_accessibility` tool returns ViewGraph's own checks + axe results when available
- If axe-core isn't loaded (CDN or bundled), fall back to ViewGraph's built-in rules

**Impact:** ViewGraph becomes a superset of axe for AI agents. Teams don't need a separate axe MCP server. The agent gets axe-quality a11y data plus all the other enrichment ViewGraph provides.

**Effort:** 1-2 days. axe-core is 300KB - needs to be loaded on-demand, not bundled.

**Roadmap link:** M11.2 extension (deeper a11y), complements existing contrast.js

---

## R3: Playwright Capture Bridge (Priority: P1)

**Gap:** Teams running Playwright E2E tests generate rich browser state during test execution but can't feed it to ViewGraph. The test runner and the review tool are separate worlds.

**What to build:**
- `@viewgraph/playwright` npm package - a Playwright fixture that captures ViewGraph JSON at any point during a test
- Usage: `await page.viewgraph.capture('after-login')` - produces a ViewGraph capture from the current page state
- Captures land in `.viewgraph/captures/` like extension captures
- Agent can then audit, compare, and analyze test-generated captures with all existing MCP tools
- Bonus: `await page.viewgraph.annotate(selector, comment)` - programmatic annotations from test assertions

**Impact:** Bridges the testing and review worlds. A failing Playwright test can produce a ViewGraph capture that the agent can analyze with full context. Teams get ViewGraph's analysis tools on their CI-generated page states.

**Effort:** 3-4 days. Requires a Playwright fixture, a DOM traverser that runs in Playwright's page context, and the serializer ported to run in Node (not just content script).

**Roadmap link:** New milestone - M16: Test Framework Integration

---

## R4: Cross-Page Consistency Checker (Priority: P1)

**Gap:** Design systems break silently. The header on `/products` has 16px padding but the header on `/settings` has 24px. No tool catches this from DOM structure alone.

**What to build:**
- New MCP tool: `check_consistency` - takes 2+ capture filenames, finds structurally similar elements (same tag + role + similar selector pattern), compares their styles
- Matching heuristic: elements with same `data-testid` prefix, same ARIA role, or same CSS class pattern across pages
- Returns inconsistencies: "header.app-header has padding:16px on /products but padding:24px on /settings"
- Works with existing captures - no new extension code needed

**Impact:** Design system enforcement without manual review. Agent can scan all captured pages and flag inconsistencies. Particularly valuable for teams without a dedicated design system tool.

**Effort:** 2-3 days. Server-side analysis only - reads existing captures.

**Roadmap link:** M15.3 (Cross-page consistency checker)

---

## R5: Visual Screenshot Comparison (Priority: P2)

**Gap:** ViewGraph compares DOM structure but not rendered pixels. It catches "button missing" but not "button is 2px misaligned" or "gradient color shifted." Percy and Chromatic own this space.

**What to build:**
- Extension already captures screenshots via `captureVisibleTab()`
- New server module: `screenshot-diff.js` - pixel comparison between two screenshots using canvas-based diffing (no heavy dependency like pixelmatch needed - use a lightweight approach)
- New MCP tool: `compare_screenshots` - returns diff percentage, highlighted regions, and a diff image
- Combine with existing `compare_captures` for a unified regression report: structural diff + visual diff

**Impact:** Closes the biggest competitive gap. ViewGraph becomes the only tool that does both structural AND visual regression in one capture. However, this is P2 because structural comparison already catches 80%+ of real regressions, and pixel comparison is well-served by Percy/Chromatic.

**Effort:** 3-4 days. The screenshot capture infrastructure exists; the diff algorithm is the new work.

**Roadmap link:** New - M17: Visual Regression

---

## R6: Framework-Specific Source Linking (Priority: P2)

**Gap:** `find_source` uses grep which works for testids and labels but produces false positives for common text. React fiber walking would give exact component-to-file mapping.

**What to build:**
- Depends on R1 (component tree mapping) - once we have component names on DOM nodes, source linking becomes: look up component name in the project's import graph
- For React: parse import statements to build component-name-to-file mapping
- For Vue SFCs: component name matches filename by convention
- `find_source` uses component mapping first (high confidence), falls back to grep

**Impact:** Near-perfect source linking for React/Vue projects. Eliminates false positives from grep.

**Effort:** 3-4 days. Depends on R1 being complete first.

**Roadmap link:** M15.1 enhancement (bidirectional element linking)

---

## Implementation Order

```
R1: Component Tree Mapping -----> R6: Framework Source Linking
     (P0, 2-3 days)                   (P2, 3-4 days)

R2: Deeper WCAG (axe-core)
     (P1, 1-2 days)

R3: Playwright Bridge
     (P1, 3-4 days)

R4: Cross-Page Consistency
     (P1, 2-3 days)

R5: Visual Screenshot Diff
     (P2, 3-4 days)
```

Start with R1 (highest impact, unblocks R6), then R2 (quick win), then R3/R4 in parallel.
