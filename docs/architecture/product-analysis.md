# ViewGraph - Product Analysis

**Date:** 2026-04-12 (revised)
**Scope:** User journeys, pain points solved, competitor comparison

---

## Part 1: User Journeys

ViewGraph has 8 distinct user workflows with 40+ individual interactions.

### Journey 1: Developer with AI Agent (Primary)

The core loop: see a bug in the browser, tell the agent about it with full context, agent fixes it.

```
Open app in Chrome -> Click ViewGraph icon -> Annotate mode activates
  -> Click element (or Shift+drag region) -> Comment box appears
  -> Diagnostic hints auto-appear (missing alt, no testid, low contrast)
  -> Write comment, set severity/category -> Click "Send to Agent"
  -> Agent reads annotations + full DOM + enrichment data via MCP
  -> Agent uses find_source to locate the file -> Implements fix
  -> Agent calls resolve_annotation -> Extension shows green checkmark
```

**Time to value:** ~30 seconds from seeing a bug to the agent having full context.

**What makes this unique:** The agent doesn't just get "fix the button" - it gets the button's exact CSS selector, computed styles, accessibility state, parent layout, sibling elements, network errors, console warnings, and the developer's comment explaining what's wrong. No other tool provides this combination.

### Journey 2: Tester / QA Reviewer (No AI Agent)

Same annotation workflow, different export destination.

```
Open app -> Click ViewGraph icon -> Annotate issues
  -> Click "Copy MD" -> Paste into Jira/Linear/GitHub issue
  OR
  -> Click "Report" -> Download ZIP (markdown + screenshots + network.json + console.json)
```

**What makes this unique:** The markdown report includes environment data (failed network requests, console errors, viewport breakpoint) that testers normally have to screenshot separately. The ZIP includes cropped screenshots per annotation.

### Journey 3: Automated Audit (Agent-Initiated)

The agent proactively checks UI quality without human annotation.

```
Agent: list_captures -> get_page_summary -> sees stackingIssues: 2, focusIssues: 1
  -> audit_accessibility -> finds 3 errors (missing alt, empty aria-label, low contrast)
  -> audit_layout -> finds 1 overflow
  -> find_missing_testids -> finds 5 elements without testids
  -> find_source for each -> locates source files -> implements fixes
  -> request_capture(verify) -> compare_captures -> confirms fixes
```

**What makes this unique:** The agent can run a comprehensive UI audit (a11y + layout + testids + stacking + focus + scroll + landmarks) from a single capture, then fix everything and verify - all without the developer doing anything.

### Journey 4: Multi-Step Flow Recording

Capture a user journey as a sequence of annotated snapshots.

```
Click "Start" next to RECORD FLOW -> Session begins
  -> Navigate to login page -> Type step note "Login page" -> Send to Agent (Step 1)
  -> Log in -> Type "Logged in" -> Send to Agent (Step 2)
  -> Click checkout -> Send to Agent (Step 3)
  -> Click "Stop"
Agent: list_sessions -> get_session -> sees URL changes, node count deltas between steps
```

**What makes this unique:** The agent sees the full journey with structural diffs between steps. "Between step 2 and 3, the cart count went from 0 to 1 and a toast appeared." Bug reports become reproducible sequences.

### Journey 5: Regression Detection

Compare current state against a known-good baseline.

```
Agent: set_baseline (after verifying page is correct)
  ... developer makes changes ...
Agent: compare_baseline -> "ContactsPage had 12 interactive elements, now has 11 - Unlink button missing"
  -> get_capture -> find_source -> fix the regression
```

**What makes this unique:** Structural regression testing without screenshots. Detects missing elements, added elements, layout shifts, and testid changes purely from DOM structure.

### Journey 6: Continuous Capture (Auto-Capture)

Extension watches for changes and captures automatically.

```
Toggle AUTO-CAPTURE ON in Inspect tab
  -> Developer saves file -> Vite/webpack hot-reloads
  -> Extension detects HMR event -> Auto-captures after 1s debounce
  -> Agent can diff consecutive auto-captures to see what changed
```

### Journey 7: Agent-Requested Capture

Agent proactively asks for a fresh capture.

```
Agent: request_capture(url, guidance: "Verify the modal closes after submit")
  -> Extension shows bell notification + request card in sidebar
  -> User clicks camera icon -> Capture happens without leaving annotate mode
  -> Agent: get_request_status -> completed -> get_capture -> analyzes result
```

### Journey 8: Setup and Health Check

One-command setup, one-command verification.

```
npx viewgraph-init
  -> Creates .viewgraph/captures/, detects agent, writes MCP config
  -> Installs Power assets (Kiro), starts server, generates auth token

npx viewgraph-status
  -> Shows: captures (9), token (present), MCP config (Kiro), server (running), gitignore (ok)
```

---

## Part 2: Pain Points Solved

### Pain Point 1: "The agent can't see my UI"

**The problem:** AI coding agents work from source code. When a developer says "the button is behind the modal," the agent has to guess which CSS properties are wrong. It can't see the rendered result.

**How ViewGraph solves it:** Structured DOM capture with computed styles, bounding boxes, z-index stacking contexts, and spatial relationships. The agent knows exactly what's rendered, where, and why.

**Severity:** Critical. This is the #1 limitation of AI-assisted frontend development.

### Pain Point 2: "I can't explain the bug precisely enough"

**The problem:** Developers write vague bug descriptions: "the layout is broken on mobile." The agent makes guesses, implements wrong fixes, developer corrects, agent tries again. Multiple round-trips.

**How ViewGraph solves it:** Click the broken element, write a comment, send. The agent gets the element's exact state (selector, styles, attributes, a11y info) plus the developer's intent. One round-trip.

**Severity:** High. Reduces fix cycles from 3-5 to 1.

### Pain Point 3: "Accessibility audits are disconnected from fixes"

**The problem:** Run axe/Lighthouse, get a list of violations, manually find each element in code, fix it, re-run the audit. The audit tool and the code editor are separate worlds.

**How ViewGraph solves it:** `audit_accessibility` returns violations with element selectors. `find_source` maps each selector to a source file and line. The agent fixes the issue and re-captures to verify. Closed loop.

**Severity:** High. Accessibility fixes that took 30 minutes per issue now take 2 minutes.

### Pain Point 4: "I don't know which file renders this element"

**The problem:** In a large React/Vue/Svelte app, finding which component renders a specific DOM element requires mental mapping or React DevTools. AI agents have no way to do this.

**How ViewGraph solves it:** `find_source` searches the project for data-testid, aria-label, id, class, and text matches. Returns file path, line number, and confidence level.

**Severity:** Medium-high. Eliminates the "which file is this?" guessing game.

### Pain Point 5: "QA handoffs are vague"

**The problem:** Testers write "the button color is wrong" in Jira with a full-page screenshot. Developer has to figure out which button, what the current color is, what it should be, and what CSS to change.

**How ViewGraph solves it:** Tester clicks the button, ViewGraph captures its exact CSS (color: #475569, font-size: 14px, etc.), tester writes "should be #6366f1." Export includes the element's computed styles, selector, and a cropped screenshot.

**Severity:** Medium. Reduces back-and-forth between QA and dev.

### Pain Point 6: "Visual regressions slip through"

**The problem:** A CSS change on one page breaks layout on another. No one notices until production.

**How ViewGraph solves it:** Baseline captures + structural comparison. `compare_baseline` detects missing elements, layout shifts, and testid changes without screenshots. Works on DOM structure, not pixels.

**Severity:** Medium. Catches structural regressions that screenshot-based tools miss (and vice versa).

### Pain Point 7: "Test IDs are missing or inconsistent"

**The problem:** Interactive elements lack data-testid attributes, making E2E tests brittle (relying on CSS selectors or text content).

**How ViewGraph solves it:** `find_missing_testids` identifies every interactive element without a testid and suggests one (kebab-case from tag + text). `find_source` locates the element in code. Agent adds the testid.

**Severity:** Medium. Systematic testid coverage improvement.

### Pain Point 8: "I can't debug z-index / focus / scroll issues from code"

**The problem:** "Dropdown behind modal" bugs, "can't tab to submit" bugs, and "wrong thing scrolls" bugs are caused by browser-computed state that's invisible in source code.

**How ViewGraph solves it:** Stacking context collector identifies z-index conflicts. Focus chain collector finds unreachable elements and empty focus traps. Scroll collector detects nested scroll containers. All included in every capture.

**Severity:** Medium. These bugs are rare but extremely time-consuming to debug without the right data.

---

## Part 3: Competitor Comparison Matrix

### The Landscape

16 tools researched across 5 categories:

| Category | Tools |
|---|---|
| Test Automation | Playwright, Cypress |
| Visual Regression | Percy, Chromatic, Meticulous.ai |
| Component Development | Storybook |
| Accessibility | axe (Deque), Lighthouse |
| Cross-Browser Testing | BrowserStack, LambdaTest |
| Runtime Debugging | Replay.io |
| Performance | DebugBear |
| Design-to-Code | Figma Dev Mode, Locofy.ai, Vercel v0 |
| Browser Automation | Browser Use, Anthropic Computer Use |

### Feature Comparison Matrix

| Capability | ViewGraph | Playwright MCP | Chromatic | Replay.io | axe MCP | Figma MCP | Storybook MCP |
|---|---|---|---|---|---|---|---|
| **Live DOM capture** | Yes - full structured snapshot | Partial - a11y tree only | No - component screenshots | Yes - runtime recording | No - a11y violations only | No - design files | No - component stories |
| **Human annotations** | Yes - click/drag + comments + severity | No | Yes - component review | No | No | Partial - design comments | No |
| **Annotation lifecycle** | Yes - resolve, track, diff, patterns, specs | No | No | No | No | No | No |
| **AI agent context via MCP** | Yes - 34 tools | Yes - browser automation | Yes - component metadata | Yes - runtime debugging | Yes - a11y scanning | Yes - design tokens | Yes - component API |
| **Accessibility audit** | Yes - WCAG + contrast + axe-core (100+ rules) | Partial - needs axe-playwright | Yes - WCAG violations | No | Yes - industry standard | No | Yes - axe-core addon |
| **Layout analysis** | Yes - overflow/overlap/viewport | No | No | No | No | No | No |
| **Source file linking** | Yes - testid/label/selector/component grep | No | No | Yes - source maps | No | Yes - Code Connect | Yes - component mapping |
| **Structural regression** | Yes - baseline comparison | No | Yes - visual diff | No | No | No | Yes - visual diff |
| **Pixel-level comparison** | Yes - PNG diff with threshold | No | Yes - full pipeline | No | No | No | Yes - visual diff |
| **Multi-step flows** | Yes - session recording + journey analysis | Yes - test scripts | No | Yes - session recording | No | No | No |
| **Design consistency** | Yes - cross-page style drift detection | No | Yes - within Storybook | No | No | Yes - design tokens | Yes - within Storybook |
| **Works with any web app** | Yes - any URL, any backend | Yes - any URL | No - Storybook required | Yes - any URL | Yes - any URL | No - Figma files | No - Storybook required |
| **No code required** | Yes - browser extension | No - needs test scripts | No - needs Storybook stories | No - needs recording setup | Partial - extension + MCP | No - needs Figma files | No - needs stories |
| **Standalone (no AI)** | Yes - Copy MD / ZIP export | No | Yes - visual review | Yes - debugging UI | Yes - extension | Yes - Dev Mode | Yes - component explorer |
| **Measured accuracy** | Yes - 92.1% composite, 7 dimensions | No | No | No | No | No | No |
| **Free** | Yes - fully open source (AGPL) | Yes - Apache 2.0 | Free tier (5K snapshots) | Design partner (free) | axe-core free; MCP paid | Paid plans | Free (OSS) |

### Where ViewGraph Wins

1. **Only tool that combines human annotations + structured DOM + MCP.** No other tool lets a human click an element, write "this is wrong," and have an AI agent receive the element's full computed state plus the human's intent.

2. **Works with any web app, zero setup in the target project.** Playwright needs test scripts. Chromatic needs Storybook. Figma needs design files. ViewGraph works on any URL with just a browser extension.

3. **Richest capture context.** 14 enrichment collectors (network, console, breakpoints, media queries, stacking, focus, scroll, landmarks, components, axe, event listeners, performance, animations, intersection) plus full DOM structure. No other tool provides this breadth of context in a single capture.

4. **Bidirectional agent communication.** Agent can request captures, receive results, resolve annotations, and the extension reflects changes in real-time. Most MCP tools are read-only.

5. **Dual audience.** Same tool works for developers (Send to Agent) and testers (Copy MD / ZIP). No other tool serves both workflows from the same interface.

6. **Annotation intelligence.** 7 tools for tracking annotation lifecycle: resolve, check status against newer captures, diff across deploys, detect recurring issues, analyze patterns, and generate implementation specs. No competitor tracks human feedback through to resolution.

7. **Multi-step journey analysis.** Session recording with structural diffs between steps, a11y regression detection across navigation, and Mermaid state machine visualization. Replay.io records runtime; ViewGraph analyzes structural changes.

8. **Measured accuracy.** 92.1% composite accuracy across 48 diverse real-world websites, measured automatically via a [bulk capture experiment](../../scripts/experiments/bulk-capture/). No competitor publishes equivalent accuracy metrics against real-world sites.

9. **Design system consistency checking.** `check_consistency` compares the same component across different pages to detect style drift (different padding, font size, colors). Chromatic does this within Storybook; ViewGraph does it across any live pages.

### Where ViewGraph is Weaker

1. **Pixel-level visual comparison is basic.** `compare_screenshots` does pixel-by-pixel PNG diffing, but it lacks Percy/Chromatic's CI integration, baseline management, and cross-browser screenshot matrix. It catches regressions between two captures but doesn't scale to automated visual testing pipelines.

2. **No runtime debugging.** Replay.io captures every DOM change, network request, and state update during execution. ViewGraph captures a point-in-time snapshot. It can't show "the dropdown flickered for 50ms before disappearing."

3. **No component isolation.** Storybook/Chromatic test components in isolation with controlled props. ViewGraph captures full pages. It can't test "what does this button look like with isLoading=true?"

4. **No cross-browser testing.** BrowserStack/LambdaTest run tests on 3,000+ browser/OS combinations. ViewGraph captures from the developer's current browser only.

5. **No automated test generation.** Playwright/Cypress generate test scripts. Meticulous records user sessions into tests. ViewGraph captures state but doesn't generate executable tests (it generates specs and tasks via `generate_spec`, but not runnable test code). The `@vg-tests` prompt template guides agents to generate Playwright tests from captures, and `@viewgraph/playwright` enables capturing during test runs, but this is agent-assisted rather than fully automated.

### Competitive Positioning

ViewGraph doesn't compete with these tools - it complements them. The positioning:

```
                    Understands live UI?
                         |
              Yes -------+------- No
               |                   |
    Structured ----+---- Visual    |
       output      |    only       |
         |         |      |        |
    ViewGraph   Replay  Percy    Figma
    Playwright  .io     Chromatic Locofy
    MCP                 Meticulous v0
         |
    Human -----+---- Automated
    annotated  |     only
       |       |
    ViewGraph  Playwright MCP
               axe MCP
               Lighthouse
```

ViewGraph is the only tool in the "structured output + human annotated" quadrant. This is its moat. The annotation intelligence layer (7 tools for lifecycle tracking) and measured accuracy (92.1% composite) widen that moat further - competitors would need to build both the capture engine and the feedback loop.

### Strategic Gaps to Close

| Gap | Impact | Effort | Status |
|---|---|---|---|
| Component tree mapping (React/Vue names on DOM nodes) | High | Medium | **Shipped** - component-collector.js detects React, Vue, Svelte |
| Cross-page consistency checker | Medium | Medium | **Shipped** - check_consistency MCP tool |
| Deeper WCAG coverage (more axe-core rules) | Medium | Low | **Shipped** - axe-collector.js runs full axe-core |
| Visual screenshot comparison (pixel diff) | Medium | High | **Shipped** - compare_screenshots MCP tool |
| Framework-specific source linking (React fiber walk) | High | High | **Shipped** - _debugSource extraction from React fibers, exact confidence in find_source |
| Playwright integration (capture during test runs) | High | Medium | **Shipped** - @viewgraph/playwright fixture with capture/annotate/snapshot |

---

## Summary

ViewGraph occupies a unique position: the UI context layer for AI coding agents. It's the bridge between what humans see in the browser and what AI agents need to fix code. No other tool provides structured DOM captures + human annotations + MCP integration for any web app with zero project setup.

The closest peers are Playwright MCP (structured but no annotations), Chromatic (annotations but Storybook-dependent), and Replay.io (runtime context but no review workflow). ViewGraph complements all of them.

The product is strongest for the "developer + AI agent" workflow where the human annotates and the agent fixes. The annotation intelligence layer (resolve, track, diff, detect patterns, generate specs) creates a closed feedback loop that no competitor offers. The tester workflow (Copy MD / ZIP) is a secondary but valuable use case that requires no AI agent at all.

**Current state:** 34 MCP tools, 984 tests, 14 enrichment collectors, 3 Kiro hooks, 8 CLI prompt shortcuts, @viewgraph/playwright fixture. Works with Kiro, Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible agent. Capture accuracy measured at 92.1% composite across 48 diverse real-world websites (see [bulk capture experiment](../../scripts/experiments/bulk-capture/)). All 6 strategic gaps from the original analysis are now shipped.
