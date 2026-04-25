# ViewGraph Demo - TaskFlow App

A multi-page demo app with **23 planted UI bugs** across 4 pages. Annotate issues in the browser, send to your AI agent, and watch them get fixed.

## Pages

| Page | Bugs | What it demonstrates |
|---|---|---|
| [Login](./index.html) | 8 | Basic annotation + a11y audit |
| [Dashboard](./dashboard.html) | 6 | Layout audit, consistency, stacking |
| [Settings](./settings.html) | 5 | Deep a11y, focus chain, keyboard access |
| [Checkout](./checkout.html) | 4 | Multi-step flow, regression, journey |

## Quick Start (5 minutes)

### Prerequisites

- ViewGraph extension installed ([setup guide](../../README.md#getting-started))
- MCP server configured in your agent (the server starts automatically when your agent launches)

### Demo 1: See Bug, Fix Bug (90 seconds)

1. Open `docs/demo/index.html` in Chrome
2. Click the **ViewGraph** icon - sidebar opens
3. Click the **password field** - notice it shows plain text. Comment: "type should be password"
4. Click the **heading** - it's huge. Comment: "reduce to 28px"
5. Click **Send to Agent**
6. Tell your agent: "Fix the annotations on the demo page"
7. Reload - password is masked, heading is smaller

### Demo 2: Instant Accessibility Audit (60 seconds)

1. Open the login page
2. Tell your agent: `@vg-audit`
3. Agent captures the page, finds 4 a11y issues automatically
4. "Fix all of these" - agent fixes all 4
5. Reload - all fixed

### Demo 3: Generate Tests from a Page (2 minutes)

1. Open `docs/demo/dashboard.html`
2. Capture with ViewGraph
3. Tell your agent: `@vg-tests`
4. Agent generates a Playwright test file with correct locators for every interactive element
5. Run the tests - all pass

### Demo 4: QA Handoff (90 seconds)

1. Open `docs/demo/settings.html`
2. Click ViewGraph icon, annotate 3 broken form controls
3. Click **Copy MD** - paste into a text editor
4. See: element details, computed styles, viewport, network status

## Full Walkthroughs

### Walkthrough 1: Annotation + Agent Fix (Login + Dashboard)

```
1. Open login page, annotate 3 visual bugs (password, heading, border-radius)
2. Open dashboard, annotate the dropdown overlap (Shift+drag region)
3. Add a page note: "Nav links need aria-current"
4. Send to Agent
5. Agent reads annotations via get_annotations
6. Agent calls find_source for each element
7. Agent fixes all issues across both files
8. Agent resolves each annotation - green checkmarks in sidebar
```

### Walkthrough 2: Regression Detection (Checkout)

```
1. Open checkout step 1, capture, set as baseline
2. Navigate to step 2 - notice the order total is missing
3. Agent: compare_captures between step 1 and step 2
4. Agent finds: "order-total element present in step 1, missing in step 2"
5. Agent fixes checkout.html to show total on step 2
```

### Walkthrough 3: Multi-Step Journey (Checkout)

```
1. Click "Record Flow" in sidebar
2. Navigate: step 1 -> step 2 -> step 3
3. Add step notes at each page
4. Stop recording
5. Agent: analyze_journey - finds step indicator bug on step 2
6. Agent: visualize_flow - generates Mermaid state diagram
7. Agent fixes the step indicator JS
```

### Walkthrough 4: Design Consistency (All Pages)

```
1. Capture login, dashboard, and settings pages
2. Agent: check_consistency across all 3 captures
3. Agent finds: button padding is 12px on login but 8px on dashboard
4. Agent fixes dashboard to match
```

### Walkthrough 5: Deep A11y Remediation (Settings)

```
1. Agent: "@vg-a11y" on settings page
2. Finds 5 issues: div toggles, unlabeled swatches, disabled button, required fields, icon button
3. Agent fixes each:
   - Replaces div toggles with real <input type="checkbox"> + toggle styling
   - Adds aria-label to each color swatch
   - Adds aria-describedby to disabled save button
   - Adds required attribute + visual asterisk
   - Adds aria-label="Upload avatar" to icon button
4. Re-audit: 0 issues
```

## Bug Matrix

### Login (index.html) - 8 bugs

| # | Bug | Type | Found by |
|---|---|---|---|
| 1 | Logo `<img>` missing `alt` text | A11y | `audit_accessibility` |
| 2 | Password field `type="text"` | Security | Manual annotation |
| 3 | Login button empty `aria-label=""` | A11y | `audit_accessibility` |
| 4 | Email input missing `data-testid` | Testing | `find_missing_testids` |
| 5 | Card `border-radius` two sharp corners | Visual | Manual annotation |
| 6 | Footer link color fails contrast | A11y | `audit_accessibility` (contrast) |
| 7 | `<form>` missing `aria-label` | A11y | `audit_accessibility` |
| 8 | Heading `font-size: 56px` absurdly large | Visual | Manual annotation |

### Dashboard (dashboard.html) - 6 bugs

| # | Bug | Type | Found by |
|---|---|---|---|
| 9 | Nav links missing `aria-current` on active page | A11y | `audit_accessibility` |
| 10 | Data table missing `<caption>` | A11y | `audit_accessibility` |
| 11 | Dropdown renders behind stat cards (z-index) | Layout | `audit_layout` (stacking) |
| 12 | Content area is `<div>` not `<main>` | A11y | `audit_accessibility` (landmarks) |
| 13 | Button padding inconsistent with login page | Consistency | `check_consistency` |
| 14 | "Last updated" text clipped by `overflow:hidden` | Layout | `audit_layout` (overflow) |

### Settings (settings.html) - 5 bugs

| # | Bug | Type | Found by |
|---|---|---|---|
| 15 | Toggle switches are `<div>` not keyboard-accessible | A11y | `audit_accessibility` (focus) |
| 16 | Color swatches have no accessible name | A11y | `audit_accessibility` |
| 17 | Disabled save button has no `aria-describedby` | A11y | `audit_accessibility` |
| 18 | Required fields not marked (`required` attribute) | A11y | `audit_accessibility` |
| 19 | Upload button is icon-only with no `aria-label` | A11y | `audit_accessibility` |

### Checkout (checkout.html) - 4 bugs

| # | Bug | Type | Found by |
|---|---|---|---|
| 20 | Step 2 indicator shows red error state instead of active | Functional | Manual annotation / `analyze_journey` |
| 21 | Card number input accepts letters | Functional | Manual annotation |
| 22 | Order total missing on step 2 (regression) | Regression | `compare_captures` |
| 23 | Submit button is red/danger color before terms checked | Functional | Manual annotation |

## Tools Exercised

Every MCP tool category is covered by at least one demo:

| Category | Tools used | Demo |
|---|---|---|
| Core | `list_captures`, `get_capture`, `get_latest_capture`, `get_page_summary` | All demos |
| Analysis | `audit_accessibility`, `audit_layout`, `find_missing_testids`, `get_interactive_elements` | Demos 2, 5 |
| Annotations | `get_annotations`, `resolve_annotation`, `get_unresolved` | Demo 1, Walkthrough 1 |
| Comparison | `compare_captures`, `compare_baseline`, `check_consistency` | Walkthroughs 2, 4 |
| Sessions | `list_sessions`, `get_session`, `analyze_journey`, `visualize_flow` | Walkthrough 3 |
| Source | `find_source`, `find_missing_testids` | All fix workflows |
| Bidirectional | `request_capture`, `get_request_status` | Walkthrough 1 (verify step) |
