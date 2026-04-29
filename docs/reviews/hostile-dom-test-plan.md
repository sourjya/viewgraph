# ViewGraph - Hostile DOM Test Plan

**Date:** 2026-04-11
**Purpose:** Verify ViewGraph produces correct (or gracefully degraded) output on malformed, extreme, and adversarial pages.

---

## Approach

Each test case is a self-contained HTML file in `docs/test-pages/` that exercises a specific failure mode. The test validates:
1. Extension doesn't crash
2. Capture JSON is valid (parseable, has metadata)
3. Output is correct OR gracefully degraded (not silently wrong)
4. Server tools can read the capture without errors

---

## Test Cases

### T1: Deep Nesting (1000+ levels)

**File:** `deep-nesting.html`
**What:** 1000 nested `<div>` elements, each containing the next.
**Risk:** Stack overflow in tree walker, tooltip breadcrumb overflow, serializer produces huge JSON.
**Validates:** Traverser depth limit, serializer handles deep trees, sidebar tooltip doesn't break.

### T2: Massive Page (5000+ elements)

**File:** `massive-page.html`
**What:** 5000 interactive elements (buttons, links, inputs) in a grid.
**Risk:** Capture takes >5s, JSON exceeds 100KB, browser tab freezes, auto-capture disabled.
**Validates:** Performance limits, `get_latest_capture` returns summary not full JSON, auto-capture skip threshold.

### T3: Zero-Content Page

**File:** `empty-page.html`
**What:** Valid HTML with empty `<body>`.
**Risk:** Capture produces empty nodes, tools return confusing results.
**Validates:** Empty capture handling, tools return meaningful "no elements" messages.

### T4: Detached / Invisible Elements

**File:** `invisible-elements.html`
**What:** Elements with `display:none`, `visibility:hidden`, `opacity:0`, `clip-path:inset(100%)`, off-screen positioning, `display:contents`.
**Risk:** `getBoundingClientRect()` returns 0,0,0,0. Elements scored as visible when they're not.
**Validates:** `isRendered` flag accuracy, salience scorer handles zero-size elements.

### T5: Overlapping Fixed Elements

**File:** `overlapping-fixed.html`
**What:** Multiple `position:fixed` elements stacked (header, modal, toast, dropdown).
**Risk:** `elementFromPoint` returns the topmost element only. Annotation clicks hit the wrong element. Stacking context collector misreports.
**Validates:** Hover/click targets correct element, stacking collector identifies conflicts.

### T6: iframe-Heavy Page

**File:** `iframe-page.html`
**What:** Page with same-origin and cross-origin iframes.
**Risk:** Content inside iframes is invisible to capture. User annotates iframe content but capture has no data for it.
**Validates:** Graceful handling - capture should note iframe presence, not silently omit content.

### T7: Shadow DOM (Open + Closed)

**File:** `shadow-dom.html`
**What:** Web components with open and closed shadow roots containing interactive elements.
**Risk:** Closed shadow roots are completely invisible. Open shadow roots may not be traversed.
**Validates:** Open shadow DOM traversal, closed shadow DOM graceful skip.

### T8: SVG-Heavy Page

**File:** `svg-heavy.html`
**What:** Complex SVG chart with 500+ `<path>`, `<circle>`, `<text>` elements.
**Risk:** SVG elements flood the capture, all scored as low salience, useful elements buried.
**Validates:** SVG element handling, salience scoring doesn't break on SVG, capture size stays reasonable.

### T9: Mid-Render Capture (React Suspense)

**File:** `suspense-page.html`
**What:** Page with React-like skeleton loaders and placeholder content.
**Risk:** Capture gets skeleton state, agent thinks that's the real UI.
**Validates:** Capture metadata should indicate page may be loading (network requests pending, skeleton elements detected).

### T10: Broken Accessibility

**File:** `broken-a11y.html`
**What:** Every a11y anti-pattern: nested interactive elements, missing labels, duplicate IDs, invalid ARIA roles, aria-hidden on focusable elements, tabindex > 0 everywhere.
**Risk:** `audit_accessibility` misses issues or crashes on invalid ARIA.
**Validates:** Audit handles invalid markup gracefully, reports all issues.

### T11: CSS Transform Chaos

**File:** `transform-chaos.html`
**What:** Elements with `transform: rotate(45deg)`, `scale(2)`, `skew(30deg)`, nested transforms.
**Risk:** `getBoundingClientRect()` returns axis-aligned box, not visual box. Overlap detection gives false positives.
**Validates:** Layout audit handles transforms, annotation markers positioned correctly.

### T12: Rapid DOM Mutation

**File:** `rapid-mutation.html`
**What:** JavaScript that adds/removes 100 elements per second.
**Risk:** Capture happens mid-mutation, gets inconsistent state. Auto-capture fires continuously.
**Validates:** Capture is atomic (consistent snapshot), auto-capture debounce works.

### T13: Script Errors on Page

**File:** `script-errors.html`
**What:** Page that throws uncaught errors, unhandled promise rejections, and console.error spam.
**Risk:** Our content script breaks if page errors corrupt global state. Console collector overwhelmed.
**Validates:** Content script isolation, console collector cap (50 entries), capture still works.

### T14: CSP-Restricted Page

**File:** `csp-restricted.html`
**What:** Page with strict Content-Security-Policy that blocks inline scripts and styles.
**Risk:** Our injected styles/scripts blocked. Sidebar can't render. Overlay breaks.
**Validates:** Extension works within CSP constraints (or fails with clear error).

### T15: Enormous Text Content

**File:** `enormous-text.html`
**What:** Single element with 1MB of text content.
**Risk:** Text truncation in capture, serializer produces huge JSON, tools choke on response size.
**Validates:** Text truncation limits, capture size stays under 100KB.

---

## Execution

### Manual Testing
1. Open each test page in Chrome with ViewGraph extension loaded
2. Click ViewGraph icon to enter annotate mode
3. Try to annotate at least one element
4. Click "Send to Agent" (or "Copy MD" if server not running)
5. Verify capture JSON is valid and tools can read it

### Automated Testing
For each test page, create a corresponding test in `extension/tests/integration/`:
- Load the HTML in jsdom
- Run traverseDOM() + scoreAll() + serialize()
- Verify output is valid JSON with expected structure
- Verify no uncaught exceptions

### Server-Side Validation
For each captured JSON:
- `get_capture` returns without error
- `get_page_summary` returns valid summary
- `audit_accessibility` runs without crash
- `audit_layout` runs without crash

---

## Priority

| Priority | Test Cases | Rationale |
|---|---|---|
| P0 - build now | T2, T3, T4, T10, T13 | Most common in real apps, highest risk of silent bad output |
| P1 - build next | T1, T5, T6, T8, T15 | Common but less likely to produce silently wrong data |
| P2 - build later | T7, T9, T11, T12, T14 | Edge cases, framework-specific, or hard to test in jsdom |
