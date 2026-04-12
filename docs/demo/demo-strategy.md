# ViewGraph Demo Strategy

## Principles

1. **Quick demos hook, walkthroughs convert.** A 2-minute video gets someone to try it. A 15-minute walkthrough makes them stay.
2. **Every demo must show a before/after.** "Here's the broken page. Here's the agent fixing it. Here's the verified result."
3. **Demo pages must have real-looking bugs, not toy examples.** A login page with 8 bugs is good. We need more pages to cover all workflows.

## Demo Architecture

### Demo App: "TaskFlow" - A Multi-Page Web App

Instead of a single login page, build a small multi-page app with planted bugs across different page types. Each page targets specific ViewGraph capabilities.

```
docs/demo/
  index.html          # Landing/login page (existing, 8 bugs)
  dashboard.html      # Dashboard with data table, charts, nav (new)
  settings.html       # Settings form with a11y issues (new)
  checkout.html       # Multi-step checkout flow (new)
  styles.css          # Shared styles (extracted from inline)
  README.md           # Demo index with all walkthroughs
```

### Page-by-Bug Matrix

| Page | Bugs planted | What they demonstrate |
|---|---|---|
| **Login** (existing) | 8 bugs: missing alt, wrong input type, empty aria-label, missing testid, broken border-radius, contrast fail, missing form label, oversized heading | Basic annotation + audit workflow |
| **Dashboard** | 6 bugs: nav links without aria-current, table without caption, overlapping z-index on dropdown, missing landmark `<main>`, inconsistent button styles vs login page, stale data indicator hidden by overflow | Layout audit, consistency checker, stacking context analysis |
| **Settings** | 5 bugs: form inputs without labels, color picker with no accessible name, toggle switch not keyboard-accessible, save button disabled with no explanation (aria-disabled but no aria-describedby), required fields not marked | Deep a11y audit, focus chain analysis |
| **Checkout** | 4 bugs: step indicator loses state on back-navigation, card number input accepts letters, total price element missing from DOM on step 2 (regression), submit button appears before terms checkbox | Multi-step flow recording, regression detection, journey analysis |

**Total: 23 bugs across 4 pages, covering all 34 MCP tools.**

---

## Demo Tiers

### Tier 1: Quick Demos (2-3 minutes each)

Short, focused, one-workflow-per-video. These are for README GIFs, social media, and landing page.

#### Quick Demo 1: "See Bug, Fix Bug" (Journey 1)

**Shows:** The core loop - annotate in browser, agent fixes in code.

```
1. Open login page - looks fine at first glance
2. Click ViewGraph icon - sidebar opens
3. Click the password field - "this shows plain text!"
4. Click the heading - "way too big"
5. Click Send to Agent
6. Switch to Kiro: "Fix the annotations on the demo page"
7. Kiro reads annotations, edits index.html, fixes both
8. Reload - password is masked, heading is smaller
```

**Time:** 90 seconds. **Hook:** "From bug to fix in 90 seconds."

#### Quick Demo 2: "Instant Accessibility Audit" (Journey 3)

**Shows:** Agent-initiated audit with zero human annotation.

```
1. Open login page
2. In Kiro: "@vg-audit"
3. Kiro captures, runs audit, finds 4 a11y issues
4. Kiro shows table: missing alt, empty aria-label, missing form label, contrast fail
5. "Fix all of these" - Kiro fixes all 4
6. Reload - all fixed
```

**Time:** 60 seconds. **Hook:** "4 accessibility fixes in 60 seconds."

#### Quick Demo 3: "Generate Tests from a Page" (Playwright workflow)

**Shows:** Test generation from a capture.

```
1. Open dashboard page
2. Capture with ViewGraph
3. In Kiro: "@vg-tests"
4. Kiro generates Playwright test file with 15 test cases
5. Show the generated file - correct locators, proper assertions
6. Run the tests - all pass
```

**Time:** 2 minutes. **Hook:** "15 Playwright tests from one capture."

#### Quick Demo 4: "QA Handoff Without an Agent" (Journey 2)

**Shows:** Standalone extension workflow for testers.

```
1. Open settings page
2. Click ViewGraph icon
3. Click 3 broken form inputs, add comments
4. Click "Copy MD" - paste into a text editor
5. Show the markdown: element details, computed styles, network status, viewport
6. Click "Report" - download ZIP, show contents
```

**Time:** 90 seconds. **Hook:** "Bug reports your developers will actually read."

---

### Tier 2: Feature Walkthroughs (5-8 minutes each)

Deeper dives into specific capability areas. For documentation, blog posts, onboarding.

#### Walkthrough 1: "Full Annotation Workflow" (Journeys 1 + 7)

**Pages:** Login + Dashboard
**Shows:** Element selection, region selection, page notes, severity/category, agent request cards, resolution sync.

```
1. Open login page, annotate 3 bugs (element click)
2. Open dashboard, annotate 2 bugs (one with Shift+drag region)
3. Add a page note: "Overall the nav feels cramped"
4. Send to Agent
5. Agent reads annotations, asks for a fresh capture of dashboard
6. Extension shows request card with bell icon
7. User clicks capture button on the request card
8. Agent receives new capture, implements fixes
9. Agent resolves each annotation - green checkmarks appear in sidebar
10. Reload both pages - all fixed
```

**Key moments to highlight:**
- Scroll wheel to navigate DOM tree during hover
- Severity badges changing color in the sidebar
- Agent request card appearing in real-time
- Resolution checkmarks syncing back to extension

#### Walkthrough 2: "Regression Detection" (Journeys 5 + 6)

**Pages:** Checkout flow (3 steps)
**Shows:** Baseline capture, code change, regression detection, auto-capture.

```
1. Capture checkout step 1 - set as baseline
2. Capture checkout step 2 - set as baseline
3. Simulate a code change (edit checkout.html - remove the total price element)
4. Enable auto-capture - extension detects the change
5. Agent: "compare against baseline"
6. Agent finds: "checkout step 2 lost 1 interactive element: total-price"
7. Agent: find_source -> locates the removed element -> restores it
8. Auto-capture fires again -> compare_baseline -> "all elements match baseline"
```

**Key moments to highlight:**
- Auto-capture triggering on file save
- Baseline comparison showing exactly what changed
- Structural diff (not pixel diff) catching a missing element

#### Walkthrough 3: "Multi-Step Journey Analysis" (Journey 4)

**Pages:** Checkout flow (3 steps)
**Shows:** Session recording, step notes, journey analysis, flow visualization.

```
1. Click "Record Flow" in sidebar
2. Navigate: cart -> shipping -> payment
3. Add step notes at each page
4. Stop recording
5. Agent: analyze_journey -> finds a11y regression between steps (shipping page lost focus management)
6. Agent: visualize_flow -> generates Mermaid state diagram
7. Agent fixes the focus issue
8. Re-record the flow -> analyze_journey -> clean
```

#### Walkthrough 4: "Design System Consistency" (Cross-page)

**Pages:** Login + Dashboard + Settings
**Shows:** Cross-page style comparison, consistency checking.

```
1. Capture all 3 pages
2. Agent: check_consistency across all 3 captures
3. Agent finds: "Primary button has padding:12px on login but padding:10px on settings"
4. Agent finds: "Header font-size is 42px on login but 24px on dashboard"
5. Agent fixes all inconsistencies to match the dashboard (the correct one)
```

#### Walkthrough 5: "Deep Accessibility Remediation" (Journey 3 deep)

**Pages:** Settings page (5 a11y bugs)
**Shows:** axe-core integration, focus chain, WCAG compliance.

```
1. Agent: "@vg-a11y" on settings page
2. Audit finds: 5 issues from axe-core + ViewGraph rules
3. Agent shows: missing labels, keyboard trap, no aria-describedby on disabled button
4. Agent fixes each with explanation of the WCAG criterion
5. Re-capture and re-audit -> 0 issues
6. Agent: "All WCAG AA violations resolved"
```

---

### Tier 3: End-to-End Showcase (15-20 minutes)

The full product demo. For conference talks, investor demos, team onboarding.

#### "From Zero to Full Coverage"

```
Act 1: Setup (2 min)
  - Run viewgraph-init.js
  - Extension connects (green dot)
  - Open TaskFlow app

Act 2: Quick Wins (4 min)
  - @vg-audit on login page -> 4 issues found and fixed
  - @vg-testids -> 3 testids added
  - Show: 7 issues fixed without touching the browser

Act 3: Human + Agent (5 min)
  - Annotate visual bugs on login + dashboard
  - Send to agent
  - Agent fixes, resolves annotations
  - Show: resolution sync in sidebar

Act 4: Regression Safety Net (4 min)
  - Set baselines for all pages
  - Make a breaking change
  - Auto-capture detects it
  - compare_baseline catches the regression
  - Agent fixes and verifies

Act 5: Test Generation (3 min)
  - @vg-tests on dashboard
  - Show generated Playwright file
  - Run tests - all pass
  - "You now have structural tests for every interactive element"

Act 6: Consistency Check (2 min)
  - check_consistency across all pages
  - Agent finds and fixes style drift
  - "Your design system is now enforced"
```

---

## What Each Demo Page Needs

### Login (index.html) - EXISTS, needs minor updates

Current 8 bugs are good. Add:
- A `data-testid` on the form for consistency
- A network request that fails (fetch to `/api/health` that 404s) so the Inspect tab has something to show

### Dashboard (dashboard.html) - NEW

A data dashboard with:
- Top nav bar with 4 links (Home, Projects, Team, Settings)
- Stats cards row (3 cards with numbers)
- Data table with 10 rows, sortable headers
- Dropdown menu that overlaps content (z-index bug)
- Missing `<main>` landmark
- Button styles inconsistent with login page
- One element hidden by `overflow: hidden` on parent

### Settings (settings.html) - NEW

A settings form with:
- Profile section (name, email, avatar upload)
- Notification toggles (3 toggle switches)
- Color theme picker
- Save/Cancel buttons
- All 5 a11y bugs planted in the form controls

### Checkout (checkout.html) - NEW

A 3-step checkout:
- Step 1: Cart summary with items and total
- Step 2: Shipping address form
- Step 3: Payment form with submit
- Step indicator at top
- Back/Next navigation
- Bugs planted across steps for journey analysis

---

## Implementation Priority

1. **Now:** Update login page README with the Quick Demo 1 and 2 scripts (zero code)
2. **Next:** Build dashboard.html (enables Quick Demo 3, Walkthrough 4)
3. **Then:** Build settings.html (enables Walkthrough 5)
4. **Then:** Build checkout.html (enables Walkthroughs 2, 3)
5. **Last:** Record videos/GIFs for each quick demo
