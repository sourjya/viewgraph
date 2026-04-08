# ViewGraph Scans and Recommendations

**Date:** 2026-04-08

**Status:** Living document - add new scans as we identify them

**Purpose:** Catalog of automated scans ViewGraph runs against captures,
producing actionable recommendations that agents can act on immediately.
This is a core product differentiator - we don't just capture, we analyze
and recommend.

Each scan follows the pattern:
1. Detect the problem in the capture
2. Explain why it matters
3. Recommend a specific fix
4. Provide enough context for an agent to implement the fix

---

## Scan Categories

| Category | Focus |
|---|---|
| Selector stability | Fragile selectors, missing testids, locator strategy |
| Accessibility | WCAG violations, missing semantics, AT gaps |
| Test coverage | Untestable elements, missing hooks, interaction gaps |
| Regression risk | Layout fragility, z-index issues, overflow problems |
| Performance signals | DOM bloat, deep nesting, excessive nodes |
| Design consistency | Style drift, pattern violations, spacing anomalies |

---

## Selector Stability Scans

### SCAN-001: Missing data-testid on interactive elements

**Detects:** Buttons, links, inputs, selects without `data-testid`

**Why it matters:** Without testids, test automation falls back to CSS
selectors that break on refactor. This is the #1 cause of brittle tests.

**Recommendation:** Add `data-testid` with suggested value based on
element role and text content.

**Output:**
```json
{
  "scan": "missing-testid",
  "severity": "warning",
  "element": { "nid": 5, "tag": "button", "text": "Submit" },
  "recommendation": "Add data-testid=\"button-submit\" to this element",
  "suggestedCode": "<button data-testid=\"button-submit\">Submit</button>"
}
```

**Status:** Implemented (`find_missing_testids` tool)

---

### SCAN-002: Fragile CSS selectors (positional/structural)

**Detects:** Elements whose best available selector relies on `:nth-child`,
deep descendant chains (>3 levels), or generated class names (hashes,
CSS modules patterns like `_abc123`).

**Why it matters:** These selectors break when siblings are reordered,
wrappers are added/removed, or CSS modules regenerate class names.

**Recommendation:** Add a stable identifier (testid, aria-label, or
semantic role) so tests don't depend on DOM structure.

**Output:**
```json
{
  "scan": "fragile-selector",
  "severity": "warning",
  "element": { "nid": 12, "tag": "div", "selector": "div.app > div:nth-child(3) > div._a3f2x > button" },
  "reasons": ["nth-child", "deep-chain", "generated-classname"],
  "recommendation": "This selector will break on DOM restructure. Add data-testid or use role-based locator.",
  "suggestedLocator": { "strategy": "role", "value": "button", "name": "Save Changes" }
}
```

**Status:** Not yet implemented

---

### SCAN-003: Duplicate testids

**Detects:** Multiple elements sharing the same `data-testid` value.

**Why it matters:** Test frameworks expect testids to be unique. Duplicates
cause tests to target the wrong element silently.

**Recommendation:** Make each testid unique, typically by appending context
(e.g., `save-btn-header` vs `save-btn-footer`).

**Status:** Not yet implemented

---

### SCAN-004: Locator strategy ranking

**Detects:** For each interactive element, evaluates available locator
strategies and reports which is most stable.

**Why it matters:** Agents should use the most stable locator. If testid
exists, use it. If not, role+name. CSS selector is last resort.

**Recommendation:** Per-element report of available strategies ranked by
stability, with the recommended one highlighted.

**Status:** Specced in v2.1 (multi-locator model), not yet implemented

---

## Accessibility Scans

### SCAN-010: Button without accessible name

**Detects:** Buttons with no text content and no `aria-label`.

**Why it matters:** Screen readers announce "button" with no context.
Users can't tell what the button does.

**Recommendation:** Add `aria-label` describing the action, or add
visible text content.

**Status:** Implemented (`audit_accessibility` - `button-no-name` rule)

---

### SCAN-011: Image without alt text

**Detects:** `<img>` elements without `alt` attribute.

**Why it matters:** Screen readers skip the image or read the filename.
Informative images need descriptive alt text.

**Recommendation:** Add `alt` with a description of the image content.
For decorative images, use `alt=""`.

**Status:** Implemented (`audit_accessibility` - `missing-alt` rule)

---

### SCAN-012: Form input without label

**Detects:** Inputs, textareas, selects without `aria-label`,
`aria-labelledby`, or associated `<label>`.

**Why it matters:** Screen readers can't announce what the field is for.
Users can't fill forms without sighted assistance.

**Recommendation:** Add `aria-label` or associate a `<label>` element.

**Status:** Implemented (`audit_accessibility` - `missing-form-label` rule)

---

### SCAN-013: Missing heading hierarchy

**Detects:** Pages that skip heading levels (h1 -> h3, no h2) or have
multiple h1 elements.

**Why it matters:** Screen reader users navigate by heading level.
Skipped levels break that mental model.

**Recommendation:** Restructure headings to follow sequential order.

**Status:** Not yet implemented

---

### SCAN-014: Missing landmark regions

**Detects:** Pages without `<main>`, `<nav>`, `<header>`, `<footer>` or
equivalent ARIA landmarks.

**Why it matters:** Landmark navigation is a primary way screen reader
users orient themselves on a page.

**Recommendation:** Wrap major page sections in semantic landmark elements.

**Status:** Not yet implemented

---

### SCAN-015: Low color contrast (computed)

**Detects:** Text elements where foreground/background color contrast
ratio falls below WCAG AA thresholds (4.5:1 normal, 3:1 large text).

**Why it matters:** Low contrast text is hard to read for users with
low vision and in bright environments.

**Recommendation:** Adjust colors to meet minimum contrast ratio.

**Status:** Not yet implemented (requires computed style data in capture)

---

### SCAN-016: Interactive element too small

**Detects:** Clickable/tappable elements with bbox smaller than 44x44 CSS
pixels (WCAG 2.5.8 target size).

**Why it matters:** Small touch targets cause misclicks, especially on
mobile and for users with motor impairments.

**Recommendation:** Increase element size or add padding to meet minimum
target size.

**Status:** Not yet implemented

---

## Test Coverage Scans

### SCAN-020: Interactive elements without any locator

**Detects:** Clickable/fillable elements that have no testid, no id, no
aria-label, and no unique text - making them effectively untestable
without fragile structural selectors.

**Why it matters:** These elements can't be reliably targeted in tests.
Any test that targets them will be brittle.

**Recommendation:** Add at least one stable identifier (testid preferred).

**Status:** Not yet implemented

---

### SCAN-021: Form without submit mechanism

**Detects:** Forms that contain inputs but no submit button or
`type="submit"` input.

**Why it matters:** Test automation needs to submit forms. Without a
clear submit mechanism, tests have to guess (Enter key? Click outside?).

**Recommendation:** Add an explicit submit button to the form.

**Status:** Not yet implemented

---

### SCAN-022: Dynamic content without test hooks

**Detects:** Elements that appear to be dynamically loaded (loading
spinners, skeleton screens, empty containers with data-loading attributes)
without corresponding `data-testid` for state verification.

**Why it matters:** Tests need to wait for content to load. Without hooks
to detect loading state, tests use fragile timeouts.

**Recommendation:** Add testids for loading states (e.g.,
`data-testid="loading-spinner"`, `data-testid="content-loaded"`).

**Status:** Not yet implemented

---

## Regression Risk Scans

### SCAN-030: High z-index stacking

**Detects:** Elements with z-index > 1000.

**Why it matters:** High z-index values indicate potential stacking
context issues. Modals, dropdowns, and tooltips can overlap unexpectedly.

**Recommendation:** Review z-index values and establish a z-index scale.

**Status:** Implemented (hints system in DETAILS)

---

### SCAN-031: Elements partially offscreen

**Detects:** Elements whose bounding box extends beyond the document
boundaries.

**Why it matters:** May indicate overflow bugs, broken layouts, or
elements that should be hidden but aren't.

**Recommendation:** Check if the element should be clipped, hidden, or
repositioned.

**Status:** Implemented (hints system in DETAILS)

---

### SCAN-032: Layout shift risk (absolute/fixed positioning)

**Detects:** Elements using `position: absolute` or `position: fixed`
without explicit dimensions, especially near interactive elements.

**Why it matters:** These elements can shift or overlap other content
when viewport size changes, causing visual regressions.

**Recommendation:** Add explicit dimensions or use relative/flex layout.

**Status:** Not yet implemented

---

## Performance Signal Scans

### SCAN-040: Deep DOM nesting

**Detects:** Elements nested more than 15 levels deep.

**Why it matters:** Deep nesting slows rendering, increases memory usage,
and makes the page harder to maintain and test.

**Recommendation:** Flatten the DOM structure. Consider component
extraction.

**Status:** Not yet implemented

---

### SCAN-041: Excessive DOM size

**Detects:** Pages with more than 1500 DOM nodes.

**Why it matters:** Large DOMs slow rendering, increase memory usage,
and make captures larger. Google Lighthouse flags >1500 nodes.

**Recommendation:** Virtualize long lists, lazy-load offscreen content,
remove unnecessary wrapper divs.

**Status:** Partially implemented (node count in metadata stats)

---

## Design Consistency Scans

### SCAN-050: Inconsistent spacing

**Detects:** Sibling elements within the same container using different
margin/padding values where a consistent pattern is expected.

**Why it matters:** Inconsistent spacing looks unprofessional and
indicates missing design tokens or ad-hoc styling.

**Recommendation:** Use consistent spacing values from a design token
scale.

**Status:** Not yet implemented

---

### SCAN-051: Font size proliferation

**Detects:** Pages using more than 8 distinct font sizes.

**Why it matters:** Too many font sizes indicate missing typographic
scale. Makes the page visually noisy and hard to maintain.

**Recommendation:** Consolidate to a typographic scale (e.g., 12, 14,
16, 20, 24, 32px).

**Status:** Not yet implemented (data available in SUMMARY styles)

---

### SCAN-052: Color palette drift

**Detects:** Colors used on the page that don't match the declared
primary palette in SUMMARY.

**Why it matters:** Color drift indicates ad-hoc styling that bypasses
the design system.

**Recommendation:** Replace one-off colors with design token values.

**Status:** Not yet implemented

---

## Implementation Plan

### Phase 1 (current - M2)

Already implemented:
- SCAN-001 (missing testids)
- SCAN-010, 011, 012 (basic a11y)
- SCAN-030, 031 (z-index, offscreen hints)

### Phase 2 (M9 - advanced tools)

Priority additions:
- SCAN-002 (fragile selectors) - highest value, core differentiator
- SCAN-003 (duplicate testids)
- SCAN-013 (heading hierarchy)
- SCAN-016 (target size)
- SCAN-020 (untestable elements)

### Phase 3 (future)

Remaining scans as capture fidelity improves:
- SCAN-014, 015 (landmarks, contrast - need full AX + computed styles)
- SCAN-032, 040, 041 (layout risk, DOM depth/size)
- SCAN-050, 051, 052 (design consistency - need style analysis)

---

## Adding New Scans

When adding a new scan:

1. Assign the next SCAN-### number in the appropriate category
2. Document: detects, why it matters, recommendation, output format
3. Add to implementation phase
4. Implement as an analysis rule in `server/src/analysis/`
5. Expose via MCP tool (either existing tool or new dedicated scan tool)
6. Add tests (positive + negative cases)
