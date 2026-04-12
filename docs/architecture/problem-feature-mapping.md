# ViewGraph - Problem-to-Feature Mapping

**Date:** 2026-04-08

**Purpose:** Map each core problem to specific ViewGraph features, MCP tools,
and workflows. These are our USPs and key differentiators. Each section
describes the pain, how ViewGraph solves it, and what we need to build.

---

## 1. Weak Test Generation

### The pain

Agents generate tests from code alone. They guess selectors, invent element
names, and produce tests that fail on first run because the live page looks
nothing like what the agent imagined.

### How ViewGraph solves it

The agent captures the live page, then generates tests from real elements
with real selectors, real text content, and real interactive states.

### Workflow

```
User: "Generate Playwright tests for the login form"
Agent: [calls get_latest_capture] -> gets live page context
Agent: [calls get_interactive_elements] -> gets all form inputs with selectors
Agent: [calls get_elements_by_role({ role: "input" })] -> gets email, password fields
Agent: writes tests using real data-testid values, real placeholder text,
       real button labels, real form structure
```

### MCP tools involved

- `get_interactive_elements` - all clickable/fillable elements with selectors
- `get_elements_by_role` - filter by role (input, button, link)
- `find_missing_testids` - flag elements that need testids before tests work
- `get_capture` / `get_latest_capture` - full page context

### What we have today

All four tools are built and tested (M1 + M2). The workflow works now.

### What we still need

- **Prompt templates** showing exact prompts for Playwright/Cypress/Testing Library
  test generation from captures. Ship as docs + example files.
- **Multi-locator output** (v2.1 spec) - agents pick the most stable locator
  strategy (testId > role > css > xpath) instead of just CSS selectors.
- **Demo video** showing the full workflow end-to-end.

---

## 2. Brittle Selectors

### The pain

Agents generate CSS selectors by guessing DOM structure. After a refactor,
every selector breaks. Teams waste hours fixing tests that were "working."

### How ViewGraph solves it

ViewGraph provides ranked multi-strategy locators for every element. The
agent picks the most stable one. If `data-testid` exists, use it. If not,
use role + accessible name. CSS is the last resort.

### Workflow

```
Agent: [calls get_interactive_elements]
Response includes per-element:
  locators: [
    { strategy: "testId", value: "submit-btn", rank: 1 },
    { strategy: "role", value: "button", name: "Submit", rank: 2 },
    { strategy: "css", value: "form > button.primary", rank: 3 }
  ]
Agent: uses rank-1 locator in generated code
```

### What we have today

Current tools return a single `selector` field. The multi-locator model is
specced in v2.1 but not yet implemented in the extension capture logic.

### What we still need

- **Multi-locator generation in the extension** - produce testId, role, css,
  xpath locators during capture. Rank by stability heuristic.
- **Update analysis tools** to surface locators array instead of single selector.
- **`find_missing_testids` with suggested locator fallbacks** - when testid is
  missing, suggest the next-best locator the agent should use.

---

## 3. Missed Regressions

### The pain

UI changes slip through because there's no structural diff. Visual diff
tools catch pixel changes but miss semantic ones (removed button, changed
aria-label, shifted layout, lost testid).

### How ViewGraph solves it

`compare_captures` diffs two captures structurally: added/removed elements,
layout shifts, testid changes. This catches regressions that pixel diffs miss.

### Workflow

```
User: "Compare the login page before and after my refactor"
Agent: [calls compare_captures({ file_a: "before.json", file_b: "after.json" })]
Response:
  added: [{ id: "div:error-banner", tag: "div" }]
  removed: [{ id: "link:forgot-password", tag: "a" }]
  moved: [{ id: "button:submit", before: [100,400,200,40], after: [100,450,200,40] }]
  testidChanges: { removed: ["forgot-password-link"] }
Agent: "The forgot-password link was removed and its testid is gone.
        The submit button shifted down 50px. A new error banner appeared."
```

### What we have today

`compare_captures` is built and tested. Works with real captures.

### What we still need

- **CI integration** - capture before deploy, capture after, diff automatically.
  Ship as a GitHub Action or CLI command: `npx viewgraph diff before.json after.json`
- **Threshold-based alerts** - "flag if more than N elements changed" for
  automated regression gates.
- **Capture history per URL** (M9 roadmap) - track changes over time without
  manual before/after management.

---

## 4. Vague QA Handoffs

### The pain

QA finds a bug, takes a screenshot, draws an arrow, writes "this looks wrong."
The developer gets a Jira ticket with a blurry PNG and no actionable context.

### How ViewGraph solves it

QA uses review mode to annotate the live page. Each annotation is tied to
specific DOM nodes with selectors, attributes, and full context. The developer
gets a structured artifact, not a screenshot.

### Workflow

```
QA: opens page in browser, activates ViewGraph review mode
QA: selects the broken table, types "pagination missing, errors not collapsible"
QA: selects a button, types "should open side panel, not navigate away"
QA: clicks capture -> produces annotated-capture.json

Developer's agent: [calls get_annotations]
Response:
  [{ comment: "pagination missing...", selectedNodes: ["table:runs", "div:errors"],
     region: [300, 400, 800, 200] }]

Developer's agent: [calls get_annotated_capture]
Response: filtered capture with only the flagged nodes + full details + comments

Developer: "Fix the issues QA flagged" -> agent has exact elements, selectors,
           and context to work with
```

### What we have today

`get_annotations` and `get_annotated_capture` are built and tested. The
annotation format is specced (W3C-aligned in v2.1).

### What we still need

- **Review mode in the extension** (M6 roadmap) - the UI for QA to select
  regions, pick elements, and write comments.
- **Annotation export to Jira/Linear/GitHub Issues** - structured bug reports
  with embedded capture context.
- **Shareable capture links** - QA shares a link, dev's agent loads the capture.

---

## 5. Bad Accessibility Fixes

### The pain

Agent is told "fix accessibility." It adds random aria-labels, misses actual
issues, and creates new problems because it can't see the computed
accessibility state of the live page.

### How ViewGraph solves it

`audit_accessibility` runs real rules against the rendered page. The agent
gets specific issues with specific elements, not vague guidance.

### Workflow

```
User: "Fix accessibility issues on this page"
Agent: [calls audit_accessibility]
Response:
  errors: [
    { rule: "button-no-name", elementId: "btn:icon-only", tag: "button",
      description: "Button has no accessible name" },
    { rule: "missing-alt", elementId: "img:hero", tag: "img" }
  ]
  warnings: [
    { rule: "missing-form-label", elementId: "input:search", tag: "input" }
  ]
Agent: fixes each issue using the exact element selector and context
```

### What we have today

`audit_accessibility` is built with 3 rules (button-no-name, missing-alt,
missing-form-label). Works against real captures.

### What we still need

- **Inline AX data on nodes** (v2.1 spec) - computed role, name, description,
  states from CDP Accessibility domain. This is the biggest upgrade.
- **More audit rules** - color contrast (needs computed styles), focus order,
  heading hierarchy, landmark structure, ARIA attribute validity.
- **Fix suggestions** - not just "missing aria-label" but "add aria-label='Close dialog'"
  based on context (nearby text, parent element, icon class names).
- **Before/after a11y diff** - "you fixed 3 issues but introduced 1 new one."

---

## 6. Poor Layout Reproduction

### The pain

Agent is told "make this component look like the dashboard." It guesses
layout from code, produces something that vaguely resembles the target but
misses spacing, alignment, responsive behavior, and visual hierarchy.

### How ViewGraph solves it

The agent gets the actual layout: bounding boxes, flex/grid properties,
spacing values, font sizes, colors, and spatial relationships. It can
reproduce the layout precisely because it has the measurements.

### Workflow

```
User: "Create a new settings page that matches the dashboard layout"
Agent: [calls get_page_summary] -> gets layout grid, clusters, style palette
Agent: [calls get_elements_by_role({ role: "nav" })] -> gets nav structure
Agent: [calls get_capture] -> gets full details with computed styles
Agent: builds the new page using real spacing values, real colors, real
       font sizes, real flex/grid properties from the dashboard capture
```

### What we have today

`get_page_summary` provides layout overview, clusters, and style palette.
`get_capture` provides full computed styles for high/med salience elements.

### What we still need

- **Style extraction tool** - `get_design_tokens({ filename })` that extracts
  a reusable design token set (colors, fonts, spacing, radii) from a capture.
- **Component pattern extraction** - from structural patterns in SUMMARY,
  generate reusable component skeletons.
- **Cross-capture style comparison** - "these two pages use different primary
  colors" for design system consistency audits.

---

## 7. Hallucinated UI Assumptions

### The pain

Agent assumes a page has a sidebar, a modal, a dropdown, or a specific
element that doesn't exist. It writes code targeting phantom UI because
it has no ground truth about what's actually rendered.

### How ViewGraph solves it

The capture IS the ground truth. The agent can verify any assumption against
the actual page state before writing code.

### Workflow

```
User: "Add a filter dropdown to the projects table"
Agent: [calls get_latest_capture] -> sees the actual page
Agent: [calls get_elements_by_role({ role: "table" })] -> confirms table exists
Agent: [calls get_page_summary] -> understands page layout and available space
Agent: knows exactly where the table is, what's around it, and what the
       existing UI patterns look like before writing any code
```

### What we have today

All core query tools provide ground truth. The agent can verify assumptions
by querying the capture.

### What we still need

- **Request-capture bridge** (M3 roadmap) - agent can request a fresh capture
  of a specific URL when it needs current state. Right now captures are
  user-initiated only.
- **Stale capture detection** - warn the agent when a capture is old relative
  to recent code changes.
- **Page state assertions** - `assert_element_exists({ filename, selector })`
  tool that returns true/false with context, for agent self-verification.

---

## Priority Matrix

| Problem | Impact | Current Coverage | Biggest Gap |
|---|---|---|---|
| Weak test generation | High | Strong (tools built) | Prompt templates, demo |
| Brittle selectors | High | Partial (single selector) | Multi-locator in extension |
| Missed regressions | High | Strong (diff tool built) | CI integration |
| Vague QA handoffs | Very High | Partial (tools built) | Review mode UI in extension |
| Bad accessibility fixes | High | Basic (3 rules) | CDP AX integration, more rules |
| Poor layout reproduction | Medium | Good (styles in captures) | Design token extraction |
| Hallucinated UI assumptions | High | Good (query tools) | Request-capture bridge |

---

## Roadmap Alignment

| Problem | Primary Milestone | Secondary |
|---|---|---|
| Weak test generation | M1 + M2 (done) | Prompt packs (content) |
| Brittle selectors | M4 (extension capture) | M2 tool updates |
| Missed regressions | M2 (done) | M9 (capture history, CI) |
| Vague QA handoffs | M6 (review mode) | Export integrations |
| Bad accessibility fixes | M4 (CDP AX capture) | M2 (more rules) |
| Poor layout reproduction | M2 (done) | M9 (design tokens) |
| Hallucinated UI assumptions | M3 (request bridge) | M9 (stale detection) |
