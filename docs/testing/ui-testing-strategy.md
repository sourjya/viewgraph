# UI Testing Strategy - Extension Visual Regression Prevention

## The Problem

Unit tests in jsdom pass but real browser rendering breaks. The svgFromString regression (v0.9.6) proved this: DOMParser behaves differently in shadow DOM contexts. jsdom can't catch these because it doesn't implement shadow DOM rendering, CSS cascade, or SVG namespace handling the same way browsers do.

## Current Coverage Gaps

| Component | Unit Tests | Real Browser Tests | Risk |
|---|---|---|---|
| Annotation panel buttons (idea, close, delete) | ✅ 19 tests | ❌ None | **HIGH** - broke in v0.9.6 |
| SVG icon rendering (svgFromString) | ✅ 40 tests | ❌ None | **HIGH** - DOMParser namespace issues |
| Sidebar creation + all tabs | ✅ 4 tests | ❌ None | MEDIUM |
| Footer export buttons | ✅ 17 tests | ❌ None | MEDIUM |
| Strip collapsed state | ✅ 19 tests | ❌ None | MEDIUM |
| Mode bar buttons | ✅ 6 tests | ❌ None | LOW |
| Tooltip rendering | ✅ 8 tests | ❌ None | LOW |

## Proposed Strategy: 3 Layers

### Layer 1: Element Existence Smoke Test (Playwright, runs in CI)

A single Playwright test that loads the extension in a real Chrome browser, opens the sidebar on the demo page, and verifies every critical UI element exists and is visible.

```
tests/e2e/ui-smoke.spec.ts

1. Load extension in Chrome (--load-extension flag)
2. Navigate to docs/demo/index.html
3. Click ViewGraph toolbar icon (or inject sidebar programmatically)
4. Assert sidebar exists in shadow DOM
5. Assert: Review tab, Inspect tab visible
6. Assert: mode bar has 3 buttons (Element, Region, Page)
7. Assert: footer has Send, Copy MD, Report buttons
8. Assert: strip badge exists when collapsed
9. Click an element on the page
10. Assert: annotation panel opens
11. Assert: panel has idea button (SVG icon visible)
12. Assert: panel has close button (SVG icon visible)
13. Assert: panel has delete button (SVG icon visible)
14. Assert: panel has severity dropdown
15. Assert: panel has comment textarea
16. Type a comment, verify it appears
17. Close panel, verify it closes
```

**Effort:** 2-3 hours (Playwright + extension loading setup)
**Catches:** SVG rendering, shadow DOM issues, CSS visibility, button existence

### Layer 2: Visual Snapshot Tests (Playwright screenshots, runs in CI)

Take screenshots of key UI states and compare against golden baselines. Catches layout shifts, missing icons, color regressions.

```
tests/e2e/visual-snapshots.spec.ts

States to capture:
1. Sidebar open - Review tab (empty state)
2. Sidebar open - Review tab (with 3 annotations)
3. Sidebar open - Inspect tab
4. Annotation panel (element selected)
5. Annotation panel (idea mode active - yellow border)
6. Strip collapsed state
7. Settings screen
8. Help overlay
```

**Effort:** 1-2 hours (after Layer 1 is set up)
**Catches:** Layout regressions, icon visibility, color/theme issues

### Layer 3: Pre-Release Checklist Script (automated, runs in release.sh)

A script that builds the extension, loads it in headless Chrome via Puppeteer, and runs the smoke test. Blocks the release if any element is missing.

```
scripts/pre-release-ui-check.js

1. Build extension (wxt build)
2. Launch Chrome with --load-extension
3. Navigate to demo page
4. Inject sidebar activation
5. Check: all critical elements exist
6. Check: all SVG icons render (width > 0, height > 0)
7. Check: no console errors from extension
8. Exit 0 (pass) or 1 (fail)
```

Add to `release.sh` between tests and version bump:
```bash
echo "  Running UI smoke test..."
node scripts/pre-release-ui-check.js || exit 1
```

**Effort:** 3-4 hours
**Catches:** Everything Layer 1 catches, but blocks releases automatically

## Implementation Priority

1. **Layer 3 first** (pre-release check in release.sh) - prevents shipping broken UI
2. **Layer 1 second** (Playwright e2e in CI) - catches regressions on every push
3. **Layer 2 third** (visual snapshots) - catches subtle visual regressions

## Quick Win: SVG Rendering Unit Test

Even before the Playwright setup, add a unit test that verifies `svgFromString` produces elements with non-zero dimensions in jsdom:

```js
it('svgFromString produces visible SVG element', () => {
  const svg = svgFromString('<svg width="14" height="14" viewBox="0 0 24 24"><path d="M18 6L6 18"/></svg>');
  expect(svg.tagName.toLowerCase()).toBe('svg');
  expect(svg.getAttribute('width')).toBe('14');
  expect(svg.children.length).toBeGreaterThan(0);
});
```

This wouldn't have caught the shadow DOM issue, but it catches parse failures.

## Critical Elements Checklist (for any test layer)

```
Sidebar:
  [data-vg="sidebar"] - main container
  [data-vg="primary-tab"][data-tab="review"] - Review tab
  [data-vg="primary-tab"][data-tab="inspect"] - Inspect tab
  [data-vg="mode-bar"] - mode selector
  [data-vg="list"] - annotation list
  [data-vg="export-buttons"] - footer buttons
  [data-vg="send"] - Send to Agent button
  [data-vg="copy-md"] - Copy MD button
  [data-vg="download"] - Report button
  [data-vg="settings-link"] - Settings link
  [data-vg="status-dot"] - connection status

Annotation Panel:
  [data-vg="panel"] - panel container
  [data-vg="header"] - panel header
  [data-vg="btn"] x3 - idea, delete, close buttons (must have SVG children)
  [data-vg="severity"] - severity selector
  [data-vg="category"] - category selector
  textarea - comment input

Strip (collapsed):
  [data-vg="collapse-badge"] - strip container
  [data-vg-badge-count] - annotation count bubble
  mode buttons x3 - Element, Region, Page
```
