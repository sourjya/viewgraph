# ViewGraph: Future Directions
## From Annotated Bug Capture to Multi-Output Session Intelligence

**Status:** Strategic planning document  
**Scope:** Product direction, session schema, target audiences, competitive positioning, roadmap  
**Builds on:** ViewGraph v3 Agentic Enhancements Research, Session Schema Draft v0.1.0

---

## Executive Summary

ViewGraph began as a precision instrument: click a broken element, describe it, give your agent the structured DOM context it needs to fix the code. That is a solved, shipped problem.

The next phase is not a pivot. It is an architectural extension that flows directly from what ViewGraph already captures. Every ingredient needed to record human testing sessions, generate tutorials, produce Playwright tests, power onboarding flows, and maintain living documentation is already present in the ViewGraph capture format. The gap is surface - not capability.

This paper defines that surface, the schema that underlies it, the audiences it serves, and the sequence in which to build it. The central argument is this:

**ViewGraph can become a multi-output session engine. One annotated recording session produces artifacts for five distinct consumer personas - developer, QA engineer, technical writer, product manager, and compliance officer - without any of them re-recording anything.**

That is not a feature. It is a product category.

---

## Part 1: What ViewGraph Is Today

### 1.1 The Core Problem Solved

AI coding agents can read source code. They cannot see the rendered UI. This gap forces agents to guess CSS fixes, accept vague screenshots as bug reports, and iterate blindly through accessibility violations that have no path to the source file.

ViewGraph closes this gap. The browser extension captures the exact DOM context of a clicked element - its computed styles, accessibility state, component boundaries, bounding box, network errors, and console warnings at the moment of interaction - and delivers it to the agent via MCP. The agent receives structured evidence, not screenshots. It finds the source file and fixes the code.

### 1.2 Current Architecture

```
Browser Extension  →  MCP Server  →  AI Agent
(captures DOM)       (.viewgraph/)   (fixes code)
                         │
                    Writes to project:
                    .viewgraph/
                      captures/
                      session.json
```

The extension sends structured payloads over WebSocket. The MCP server owns all filesystem writes. The agent reads via 41 MCP tools. The extension has zero filesystem coupling - a design constraint that already anticipates everything described in this paper.

### 1.3 What the v3 Format Adds

The v3 format research (April 2026) solved the token efficiency problem. Key findings:

- Playwright MCP costs approximately 114,000 tokens per 10-step task. ViewGraph v3 targets approximately 7,000 tokens for the same task - a 97% reduction.
- The winning architecture is not better compression of a large dump. It is scoped reads on demand.
- The `actionManifest` pre-joins all interactive elements into a flat, TOON-serialized index readable in approximately 200-400 tokens - matching Vercel's agent-browser per-snapshot cost.
- Delta capture mode transmits only what changed between steps, reducing per-step recapture cost by 90-99% for modal and form interactions.
- File-backed capture mode writes to `.viewgraph/` and returns a receipt (~200 tokens), letting agents read only what they need.
- The `checkpoint` envelope records completed steps, the failed step, and a resume token - enabling agent session recovery without full re-capture.
- Set-of-Marks annotated screenshots assign `[N]` overlays to interactive elements where `[N]` equals `@eN` in the text snapshot - no separate lookup table required.

These are not incidental to the session recorder. They are its infrastructure.

---

## Part 2: The Strategic Opportunity

### 2.1 The One-Session, Multiple-Output Architecture

The single most important insight in this document:

> Every output path ViewGraph can serve - Playwright test, QA export, tutorial, onboarding flow, regression baseline - requires exactly the same underlying data. What differs is the renderer, not the recording.

The data is: what element was interacted with, the full DOM context of that element at the moment of interaction, the human's stated intent, and what changed afterward. ViewGraph captures all of this today. The recorder surface makes it deliberate and sequential rather than single-shot.

**One session, five output paths:**

```
VIEWGRAPH SESSION RECORDING
         │
         ├─── Developer path
         │    └── Agent generates parameterized Playwright test
         │         Assertions derived from expected-outcome annotations
         │
         ├─── QA path
         │    └── Jira / GitHub export as structured test cases
         │         Each step = one test case with screenshot + acceptance criteria
         │
         ├─── Technical writer path
         │    └── Interactive step-by-step tutorial
         │         HTML guide, Markdown for Notion/Confluence, PDF
         │
         ├─── Product / onboarding path
         │    └── In-app feature walkthrough
         │         Embeddable JS overlay widget; publishable link
         │
         └─── Compliance / audit path
              └── Timestamped tested-scenario audit trail
                   DOM proof at each step; exportable as signed artifact
```

No tool in the market does this. The closest competitors produce one output per recording. ViewGraph's semantic capture layer makes every output derivable from a single schema.

### 2.2 Why Now

Three trends converge to make this the right moment:

**The non-technical tester persona is already in ViewGraph's docs.** "Click what looks wrong, describe it in plain language. ViewGraph captures the technical details." Extending this persona from single-shot bug reports to sequential step recordings is the same interaction model, run for longer.

**v3 architecture solves the token cost that made session recording impractical.** A 20-step recording session in v2 inline mode would cost approximately 2 million tokens. In v3 file-backed + delta mode, the same session costs approximately 25,000 tokens. That difference is the difference between a feature that is theoretically possible and one that is practically shippable.

**The tutorial authoring market has a ceiling that semantic capture removes.** Scribe, Tango, and WalkMe all have the same structural limitation: they capture screenshots. They do not understand the DOM. When the UI changes, their tutorials break silently. ViewGraph can detect DOM drift because it stored semantic context, not pixel data - and the agent can repair the tutorial automatically. That capability does not exist anywhere else.

---

## Part 3: The Annotated Steps Recorder

### 3.1 What It Is

The Steps Recorder is a guided recording mode in the ViewGraph extension that captures sequential human testing sessions as annotated intent logs rather than mechanical action sequences.

The distinction from tools like Playwright `codegen` is fundamental. Existing recorders produce:

```
click("div.btn-primary:nth-child(2)")
fill("#email-input", "test@test.com")
navigate("/dashboard")
```

That is a fragile sequence of selectors. No "why." No human context. Breaks the moment the app changes. An agent reading it cannot write meaningful assertions because it does not know what outcome was expected.

A ViewGraph step recording produces, per step:

- **Action:** what the user did (click, fill, navigate, select, keyboard)
- **Target:** full DOM context - selector, `@eN` ref, component name, ARIA role, bounding box
- **Annotation:** the human's stated intent ("clicked submit expecting the form to validate")
- **Expected outcome:** what they anticipated would happen next
- **Pre-state snapshot:** network requests in-flight, console errors, page URL, scroll position
- **Post-action delta:** what changed in the DOM, navigation events, network responses triggered

That is an intent log. An agent reading it understands *why* each step happened, not just *what* was clicked. That is the input required to produce meaningful test assertions, tutorial prose, and regression baselines.

### 3.2 The Recording UX

In Tutorial/Test recording mode, the extension changes behavior:

1. User activates "Record Session" from the extension sidebar
2. Each interaction (click, fill, navigate) pauses and prompts: "What did you intend here?" and "What do you expect to happen?"
3. User provides annotation (voice-to-text or typed) and confirms
4. Extension captures the full step payload and sends to MCP server
5. MCP server writes the step to `sessions/{session-id}/session.json` immediately (crash-safe)
6. User proceeds to next step
7. On "Stop Recording," the session is finalized and the LLM generates `llm_cache` fields for all steps

The pause-and-annotate UX is the non-technical tester's path. A developer path offers the same recording but with annotations optional and auto-generated by the LLM from DOM context alone.

### 3.3 How v3 Format Powers the Recorder

This is where the v3 research pays dividends beyond its original scope.

**`actionManifest` as the recorder's element resolver.** When the user clicks an element, the recorder does not re-derive its DOM context from scratch. It reads the `@eN` ref from the `actionManifest`, which already has the ARIA role, accessible name, component name, bounding box, locator strategy, and stability hints. The step payload is assembled from the manifest entry, not from a fresh DOM query. Cost: approximately 3 tokens per element lookup instead of a 300-line node tree scan.

**Delta capture mode for `post_delta`.** After each step, ViewGraph captures what changed using `captureMode: "delta"`. The delta gives the step schema its `post_delta.dom_mutations` (which nodes were added, removed, modified) and `post_delta.network.requests_triggered` (which API calls fired). For modal interactions, the delta is approximately 2,000 tokens. For form field fills, approximately 500 tokens. Without delta mode, every step would require a full re-capture at approximately 25,000 tokens. Over 20 steps, the difference is 10,000 tokens versus 500,000.

**`structuralFingerprint` for `post_delta.significant`.** The fingerprint is a SHA-256 hash of the sorted node topology. If consecutive captures share fingerprints, `dom_mutations.significant` is automatically `false` - no LLM reasoning required to determine whether the action caused a meaningful UI change. This eliminates 200-500 tokens of agent inference per step.

**Set-of-Marks screenshots as tutorial illustrations.** The `marks` section produces annotated screenshots where `[N]` overlays on interactive elements correspond directly to `@eN` refs. For the tutorial renderer, this means every step illustration is already highlight-annotated without any post-processing. The interacted element is numbered and visible. No separate "draw an arrow on this screenshot" step.

**`checkpoint` envelope as the step recorder's agent-side mirror.** The v3 checkpoint records the agent's view of a session (completed steps, failed step, resume token). The session schema records the human's view (same steps, with intent annotations). They are complementary: when the agent generates a Playwright test from the session, it can embed a checkpoint reference so failed test runs resume from the last verified step rather than starting over.

**`observationDepth: "interactive-only"`** during recording. The recorder does not need full style data during a live session. It reads only the `actionManifest` to resolve each step's target. Full detail is captured in the background for the `pre_state` snapshot but is not streamed into the agent's context during recording. This keeps the recording session's live token cost near zero.

**`correlatedRefs` on errors.** When the recorder captures `pre_state.console.errors` at a step, the v3 error-to-node correlation heuristics have already linked each error to a set of `correlatedRefs`. The LLM generating tutorial text can note contextually: "During this step, the projects-list cluster had a failed API fetch. If you see an empty state here, check your API connection." That context came from a correlation heuristic, not from human annotation.

### 3.4 Output Path: Agent-Generated Playwright Test

This is the primary differentiator of the Steps Recorder over every existing tool.

The agent receives the full session intent log via `viewgraph_read(sessionId, "full")` and generates a parameterized Playwright test file. Because it has `annotation.expected_outcome` per step, it writes actual assertions - not just action replays.

A step annotated "clicked submit expecting form validation to fire on empty fields" produces:

```typescript
await page.getByTestId('submit-registration').click();
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByText('Email is required')).toBeVisible();
```

Playwright `codegen` produces:

```typescript
await page.locator('div.btn-primary:nth-child(2)').click();
```

The assertion is only possible because the human's intent was captured. The selector is resilient because it came from the `actionManifest` locator strategy (test ID or ARIA role), not from a raw CSS snapshot.

Non-technical testers produce real Playwright tests without knowing Playwright exists. That is the headline feature.

### 3.5 Output Path: QA Export

Each step exports as a structured test case compatible with Jira and GitHub Issues:

```markdown
## TC-042: Submit registration form with valid credentials

**Preconditions:** User must not have an existing account with this email

**Steps:**
1. Navigate to /register
2. Fill "Email" field with a valid email address
3. Fill "Password" field with a password meeting requirements
4. Click **Submit** (submit-registration)

**Expected result:** Form validates and user is redirected to /dashboard

**Evidence:** [screenshot attached]

**Priority:** High
```

This replaces the "QA writes test steps in Confluence" workflow entirely. The structured output is derived from `annotation.intent`, `annotation.expected_outcome`, `renderer_hints.qa.preconditions`, and the step screenshot.

### 3.6 Output Path: Regression Baseline

A completed session becomes a regression baseline. Future runs replay the same step sequence and diff the DOM snapshot at each step against the stored baseline. Because ViewGraph stores `structuralFingerprint` per step, the diff is a structural comparison - not a pixel comparison. A button that moved 5 pixels does not fail the baseline. A button that changed its ARIA label from "Submit" to "Continue" does.

This is visual regression testing with annotated semantic context - substantially richer than any pixel-diff tool and substantially more meaningful for the agent tasked with investigating what broke.

---

## Part 4: The Tutorial Designer

### 4.1 The Market Gap

Tutorial authoring tools in 2026 occupy one of two positions:

**Screenshot-based tools** (Scribe, Tango): Capture pixel sequences, draw arrows, paste author-typed text. Fast to produce. Brittle when the UI changes. Zero semantic understanding. Cannot auto-generate step descriptions. Cannot detect drift.

**SDK-based overlay tools** (WalkMe, Appcues, Intercom): Require integration into the product's codebase. Powerful but gated. Non-technical authors cannot use them without developer assistance. Expensive. Cannot be produced from a recording session.

Neither category can produce: auto-generated tutorial prose from DOM semantics, agent-maintained documentation that updates when the UI changes, or a semantic HTML guide with structural awareness of what the user is navigating. ViewGraph can produce all three as a direct consequence of its capture architecture.

### 4.2 How Tutorial Mode Works

Tutorial Mode is activated at session start by setting `recording_mode: "tutorial"`. This changes two behaviors:

1. **The annotation prompt changes.** Instead of "What do you expect to happen?" it asks "How would you describe this step to a new user?" The annotation becomes tutorial prose authored by the human, which the LLM refines rather than generates from scratch.

2. **Section grouping is active.** The LLM analyzes the full step sequence at session end and groups steps under section headings derived from `context.nearest_heading` and `context.landmark`. Steps 1-3 that all occur inside a "Create Account" form become Section 1 of the tutorial. Steps 4-6 that occur on the Dashboard become Section 2.

### 4.3 The LLM Advantage Layer

This is the structural gap between ViewGraph and every screenshot-based competitor, and it cannot be closed without DOM semantic capture.

**What screenshot tools give their LLM:**
- A pixel image
- Optional: author-typed text about the step

**What ViewGraph gives its LLM per step:**
- `target.aria.label` - the element's accessible name
- `target.aria.role` - what kind of element it is
- `target.component.name` - the React/Vue/Angular component wrapping it
- `context.nearest_heading` - the section heading closest to the element in DOM hierarchy
- `context.dialog` - if the interaction happened inside a dialog, its title and role
- `context.form` - if the interaction happened inside a form, its label
- `context.url` - current page URL (for navigation context)
- `post_delta.network.requests_triggered` - what API calls fired after the action
- `post_delta.navigation` - whether the action triggered a page change
- `pre_state.console.errors` - any errors present during the step
- `annotation.intent` - the human's stated purpose

From this input, the LLM generates qualitatively different prose than any screenshot-based tool can produce. Not "Click the button" but:

> "Click **Submit** to create your account. ViewGraph will validate your email and password before saving. If either field has an error, the button will remain active and an inline message will tell you what to fix. On success, you'll be taken to your dashboard automatically."

The network context (`POST /api/users` returning 201, then navigation to `/dashboard`) is what allows the LLM to write "on success, you'll be taken to your dashboard." The LLM did not infer this. ViewGraph measured it.

**Tone and audience adaptation.** The same step produces different prose per target audience:

| Audience | Auto-generated description |
|---|---|
| End user | "Click **Submit** to create your account. You'll see your dashboard if everything looks good." |
| Developer | "Triggers `POST /api/users`. 201 redirects to `/dashboard`. 422 returns inline validation errors." |
| QA engineer | "Verify: submit with valid credentials returns 200 and renders `/dashboard` within 2 seconds." |

One step. Three descriptions. All derived from the same captured data. The LLM switches registers; the DOM data is the source of truth.

**Step grouping and narrative structure.** Raw recordings are flat numbered lists. The LLM identifies that steps 3 through 7 all interact with the same form cluster and groups them under "Filling out the registration form" with an introductory sentence. No screenshot tool does this. They produce numbered lists and call them tutorials.

**Staleness detection and agent-maintained documentation.** When the UI changes, the agent can compare new DOM captures against the stored session schema, identify which steps have drifted (button label changed, form field added, new confirmation step inserted), and rewrite only the affected tutorial sections. This is living documentation. It does not exist as a product category today.

**Prerequisite and context inference.** The LLM reads the full session and writes an accurate "Before you start" section. It infers: the user must be logged in (session starts on `/dashboard`), must have billing permissions (the target element is inside a role-gated component), and must have a verified email (a 403 appeared in the network log when the email was unverified). All of this came from the captured data.

**Localization scaffold.** The LLM knows which strings in the tutorial text came from the DOM (button labels, dialog titles, field names captured via `target.aria.label`) versus which it authored. It can generate a localization-ready version with explicit substitution slots for UI strings, giving translators clean separation between interface text and narrative prose.

### 4.4 Export Formats

From one session recording, the tutorial renderer produces:

| Format | Primary consumer | Notes |
|---|---|---|
| Interactive HTML | End users, internal portals | Self-contained; SoM screenshots embedded; step-by-step navigation |
| Markdown | Notion, Confluence, GitHub Wikis | Headings derived from section grouping; screenshots as relative links |
| PDF | Formal documentation, compliance | Paginated; header/footer with version stamp |
| Embeddable JS widget | In-app onboarding | Lightweight overlay; reads from published session JSON; no SDK required |
| Shareable link | Customer success, external sharing | Hosted render of the HTML export; Scribe-style distribution |

### 4.5 The Embeddable Onboarding Widget

This is the WalkMe-lite path - and the most architecturally significant output.

A recorded tutorial session published as a shareable link can be embedded as an in-app onboarding overlay. When a new user visits the page, the widget reads the session JSON, overlays step annotations on matching DOM elements (resolved via the same `actionManifest` locator strategies the recorder used), and walks the user through the feature interactively.

This requires no SDK integration. No developer involvement beyond adding a single script tag. The session JSON is the product.

The critical technical dependency: element re-location must use semantic locator strategies (ARIA label, test ID, role + name) rather than raw CSS selectors. The v3 `actionManifest` `locator.strategy` field already captures this. An element with `locator: { strategy: "testId", value: "submit-registration" }` will be found even if its position in the DOM changes, as long as the test ID is stable. This is substantially more resilient than any screenshot-based overlay tool that relies on pixel coordinates.

**Engineering note:** Build the HTML/Markdown export first. The embeddable widget shares the same renderer logic but adds live DOM matching. It is the right v1.3 feature, not v1.2.

---

## Part 5: Target Audiences and Their Benefits

### 5.1 Developer with an AI Agent (Core Persona)

**Current workflow:** Click broken element, describe it, send to agent, agent fixes code.

**Extended workflow with session recorder:**
- Record a multi-step test scenario while manually verifying a feature
- Agent converts the recording to a Playwright test automatically
- Test joins CI pipeline without the developer writing a single `expect()` call
- On regression, checkpoint resume means the agent picks up from the last verified step, not from scratch

**Primary benefit:** Zero-cost conversion of manual testing into automated tests. The developer's testing time becomes CI coverage.

**Metrics that improve:** Test coverage (passive gain), time-to-verified-fix, agent token cost (v3 delta mode).

### 5.2 QA Engineer / Manual Tester

**Current workflow:** Test manually, document steps in Confluence, file Jira tickets with screenshots, hope the developer understands what broke.

**Extended workflow:**
- Record test session with intent annotations
- Export structured test cases to Jira with one click
- Screenshots are pre-attached; acceptance criteria are derived from `annotation.expected_outcome`
- Session becomes a regression baseline; future test runs diff against it

**Primary benefit:** Documentation is generated from the test, not written separately after it. Test cases are richer than anything a QA engineer would write manually because they include DOM context, network state, and component-level evidence.

**Pain point eliminated:** The "back-and-forth to clarify what's actually broken" described in ViewGraph's own problem statement. The structured export is the clarification.

### 5.3 Non-Technical Stakeholder (Product Manager, Business Analyst, UX Reviewer)

**Current workflow:** Click around the app, take screenshots, write Slack messages explaining what looks wrong, repeat.

**Extended workflow:**
- Activate Tutorial Mode in the extension
- Click through the feature they want to document or report
- Describe each step in plain language
- Session exports as a structured test plan or tutorial automatically

**Primary benefit:** Non-technical users produce artifacts (test cases, tutorial drafts) that have the same technical depth as those produced by engineering. No re-recording. No translator required between "this looks wrong" and "here is the component and the DOM state when it looked wrong."

**This is the persona that generates tutorials.** They know the product well enough to walk through it. They do not know Playwright, CSS selectors, or how to write ARIA roles. ViewGraph gives them a path from product knowledge to documentation artifact without any technical intermediate step.

### 5.4 Technical Writer

**Current workflow:** Request access to a staging environment, record a Scribe walkthrough, manually crop and annotate screenshots, write prose around them, publish to Confluence, redo it all when the UI changes.

**Extended workflow:**
- Load ViewGraph session recorded by QA or PM (no re-recording needed)
- Review auto-generated tutorial draft in the Tutorial Designer
- Edit prose for tone and accuracy
- Export to Confluence or Notion directly
- When the UI changes, the agent flags drifted steps; technical writer approves rewrites

**Primary benefit:** The tutorial first draft is generated, not written. The technical writer's contribution is editorial, not foundational. When the UI changes, the documentation updates itself (with human approval) rather than going stale.

**Unique to ViewGraph vs Scribe/Tango:** The auto-generated prose is semantically grounded. Scribe gives the technical writer a screenshot. ViewGraph gives the technical writer a sentence that is factually accurate about what the element does, derived from ARIA semantics and network observation.

### 5.5 Test Automation Engineer

**Current workflow:** Write Playwright tests from scratch, maintain selectors as the UI changes, debug brittle selectors in CI.

**Extended workflow:**
- Receive agent-generated Playwright tests from ViewGraph sessions
- Review and parameterize where needed
- Selectors are ARIA-role-based and test-ID-based (from `actionManifest` locator strategies), not raw CSS
- Regression baselines flag structural DOM changes, not pixel diffs

**Primary benefit:** The first draft of every test is generated. Selector brittleness is reduced because ViewGraph's locator strategy preference hierarchy (test ID > ARIA role > CSS) produces more stable selectors than Playwright `codegen`'s raw-snapshot approach.

### 5.6 Customer Success / Support Team

**Current workflow:** Write help articles manually, record Loom videos, embed them in Intercom.

**Extended workflow:**
- Record a session showing how to complete a common workflow
- Publish the session as a shareable tutorial link
- Embed the step-by-step guide in Intercom or Zendesk as a widget
- When the product updates, the session flags which steps drifted; update in one pass

**Primary benefit:** Help documentation is faster to produce, more accurate (semantically grounded), and self-maintaining. Loom videos are static. ViewGraph tutorials adapt.

---

## Part 6: Competitive Landscape and Moat

### 6.1 The Existing Tools and Their Ceilings

| Tool | What it does | Structural ceiling |
|---|---|---|
| Playwright `codegen` | Records CSS-selector-based action sequences | No intent, no assertions, no non-technical path |
| Scribe / Tango | Screenshot-based step documentation | No DOM semantics, no auto-generated prose, breaks silently on UI change |
| WalkMe / Appcues | In-app overlay onboarding | Requires SDK integration; no recording from existing sessions; developer-gated |
| Loom | Video recording of screen interactions | Non-searchable, non-interactive, cannot produce test artifacts |
| Selenium IDE | Record and replay with selectors | Same ceiling as `codegen`; legacy toolchain |
| Playwright MCP | Agent-controlled browser automation | 114K tokens per 10-step task; no human annotation layer |

None of these tools produce all five outputs from a single session. None have semantic DOM capture. None give their LLM structured DOM context to work from. None can detect tutorial staleness and repair it automatically.

### 6.2 The Moat

ViewGraph's moat has three layers that compound:

**Layer 1 - The semantic capture architecture.** The DOM context that ViewGraph captures is not available to any screenshot-based tool. An LLM given a ViewGraph step payload writes better tutorial prose, better test assertions, and better onboarding copy than an LLM given a screenshot. This gap is not closable by screenshot-based tools without re-architecting around DOM capture.

**Layer 2 - The v3 token efficiency.** The 97% token reduction from v2 to v3 makes session recording economically viable. A competitor building session recording on top of a full-DOM-per-step architecture will face the same token cost that made v2 impractical for this use case. ViewGraph has already solved this; the solution is not obvious and took significant research investment.

**Layer 3 - The schema network effect.** Once the session JSON format is established and renderers are built on top of it, the format becomes the integration point. Jira plugins, Notion exporters, Confluence publishers, and CI integrations all speak ViewGraph session JSON. Switching costs compound with each renderer added. The schema is the platform.

### 6.3 The Non-Technical-to-Automated-Test Pipeline

One gap no existing tool fills cleanly deserves explicit emphasis:

> Non-technical testers produce real Playwright tests without knowing Playwright exists.

The workflow: a PM records a session describing what they expect at each step. The agent converts the session to a Playwright test. The test joins CI. The PM's product knowledge becomes engineering coverage.

This pipeline does not exist in any tool today. Playwright `codegen` requires the user to understand selectors and test structure. ViewGraph's annotation layer is the bridge. The LLM is the translator. The session schema is the medium.

---

## Part 7: Session Schema Specification

### 7.1 Design Principles

Four principles govern every field in the schema:

1. **Output-agnostic core.** Every field in the canonical schema serves at least two renderers. Fields serving only one renderer live in `renderer_hints`, not the core.
2. **Append-safe.** Individual steps are written as they are recorded. The session manifest is updated last. A crashed recording loses at most the current in-progress step.
3. **LLM-ready by default.** The schema pre-packages semantic context so renderers do not need to re-query the DOM. An LLM can write tutorial prose from the schema alone.
4. **Screenshot-decoupled.** Screenshots are stored as files, referenced by relative path. The JSON stays human-readable and diffable.

### 7.2 Top-Level Session Manifest

```jsonc
{
  "schema_version": "0.1.0",
  "id": "sess_01J9KX2M...",             // ULID - sortable, collision-resistant
  "created_at": "2025-09-12T08:41:00Z",
  "updated_at": "2025-09-12T08:55:22Z",
  "status": "complete",                  // recording | complete | aborted
  "recording_mode": "test_session",      // bug_report | test_session | tutorial | audit | regression_baseline
  "name": "User registration - happy path",
  "description": "Full registration flow from landing page to dashboard redirect.",
  "tags": ["registration", "auth", "smoke"],
  "project": {
    "name": "my-app",
    "base_url": "http://localhost:3000"
  },
  "environment": {
    "browser": "Chrome",
    "browser_version": "128.0.6613.84",
    "viewport": { "width": 1440, "height": 900 }
  },
  "steps": [ /* Step objects */ ],
  "summary": {
    "step_count": 8,
    "duration_ms": 87420,
    "pages_visited": ["/register", "/dashboard"],
    "errors_encountered": 0,
    "annotations_provided": 6
  }
}
```

### 7.3 Step Object: Canonical Schema

```jsonc
{
  // ── Identity ───────────────────────────────────────────────────────────
  "id": "step_01J9KX3A...",
  "session_id": "sess_01J9KX2M...",
  "sequence": 3,
  "recorded_at": "2025-09-12T08:43:15.221Z",

  // ── Action ────────────────────────────────────────────────────────────
  "action": {
    "type": "click",         // click | fill | navigate | scroll | hover | select | keyboard | drag | focus | blur
    "value": null,           // populated for fill (typed text), select (chosen option), keyboard (key combo)
    "modifiers": []          // ["shift", "ctrl"] for keyboard-modified clicks
  },

  // ── Target Element ────────────────────────────────────────────────────
  // Everything a renderer needs to re-locate, describe, or highlight the element.
  // Primary source: v3 actionManifest entry for the interacted @eN ref.
  "target": {
    "ref": "e7",                         // @eN from v3 actionManifest - stable within session
    "selector": "button[data-testid='submit-registration']",
    "selector_confidence": "high",        // high | medium | low
    "xpath": "//button[@aria-label='Submit registration form']",
    "tag": "button",
    "text_content": "Submit",
    "aria": {
      "role": "button",
      "label": "Submit registration form",
      "description": "Creates your account and sends a verification email",
      "state": { "disabled": false, "expanded": null, "checked": null }
    },
    "component": {
      "name": "RegistrationForm",
      "file_hint": "src/components/auth/RegistrationForm.tsx"
    },
    "bounding_box": { "x": 480, "y": 620, "width": 200, "height": 44 },
    "locator": {                          // From v3 actionManifest locator field
      "strategy": "testId",              // testId | role | css | xpath - preference hierarchy
      "value": "submit-registration"
    },
    "stability_hints": []               // From v3 details hints: "dynamic-class", "animation-active", etc.
  },

  // ── Page Context ──────────────────────────────────────────────────────
  "context": {
    "url": "http://localhost:3000/register",
    "page_title": "Create Account - MyApp",
    "scroll_position": { "x": 0, "y": 340 },
    "landmark": { "role": "main", "label": null },
    "nearest_heading": "Create your account",
    "dialog": { "role": "dialog", "label": "Create Account" },  // null if not in dialog
    "form": { "id": "registration-form", "label": "Registration form" },  // null if not in form
    "cluster": "cluster003"              // v3 cluster ID - groups semantically related elements
  },

  // ── Human Annotation ──────────────────────────────────────────────────
  "annotation": {
    "intent": "Submit the completed registration form",
    "expected_outcome": "Form validates and redirects to /dashboard",
    "actual_outcome": null,             // null = not yet filled in; populated post-step or by QA reviewer
    "result": null,                     // pass | fail | skip | blocked
    "notes": "",
    "tags": []
  },

  // ── Pre-Action State ──────────────────────────────────────────────────
  // Everything true at the moment BEFORE the action fired.
  // Screenshots stored as files; referenced by relative path.
  "pre_state": {
    "screenshot": "screenshots/step_01J9KX3A.png",
    "screenshot_highlight": "screenshots/step_01J9KX3A_hl.png",    // SoM-annotated: element marked [N]
    "capture_id": "cap-20260428-003",   // v3 capture ID for full DOM read if needed
    "network": {
      "in_flight": [],
      "recent_errors": []
    },
    "console": {
      "errors": [],                     // includes v3 correlatedRefs for each error
      "warnings": []
    }
  },

  // ── Post-Action Delta ─────────────────────────────────────────────────
  // What changed AFTER the action. Derived from v3 delta capture.
  "post_delta": {
    "navigation": {
      "occurred": true,
      "from_url": "http://localhost:3000/register",
      "to_url": "http://localhost:3000/dashboard"
    },
    "dom_mutations": {
      "summary": "1 element removed, 3 added",
      "significant": true,              // Derived from v3 structuralFingerprint comparison
      "fingerprint_changed": true
    },
    "network": {
      "requests_triggered": [
        { "method": "POST", "url": "/api/users", "status": 201, "duration_ms": 230 }
      ]
    },
    "console": {
      "new_errors": [],
      "new_warnings": []
    }
  },

  // ── LLM Cache ─────────────────────────────────────────────────────────
  // Pre-computed at session end. Invalidated when annotation or target.aria changes.
  "llm_cache": {
    "auto_title": "Submit registration form",
    "auto_description_technical": "Click Submit to POST credentials to /api/users. On 201, redirects to /dashboard. On 422, inline validation errors appear.",
    "auto_description_user": "Click **Submit** to create your account. You'll be taken to your dashboard if everything looks good.",
    "auto_description_qa": "Verify: submit with valid credentials returns 201 and renders /dashboard within 2 seconds.",
    "inferred_section": "Account creation",   // Used by tutorial renderer for heading grouping
    "generated_at": "2025-09-12T08:55:00Z",
    "model": "claude-sonnet-4-20250514"
  },

  // ── Renderer Hints ────────────────────────────────────────────────────
  // Renderer-specific metadata. Each renderer reads only its namespace.
  "renderer_hints": {
    "playwright": {
      "assertion": "expect(page).toHaveURL('/dashboard')",
      "wait_strategy": "waitForNavigation",
      "selector_override": null
    },
    "tutorial": {
      "audience": "end_user",           // end_user | developer | qa
      "section_group": "Account creation",
      "callout": null,                  // null | { type: "warning"|"info"|"tip", text: "..." }
      "skip_in_output": false
    },
    "qa": {
      "test_case_id": "TC-042",
      "priority": "high",
      "preconditions": "User must not have an existing account with this email"
    }
  }
}
```

### 7.4 Action Type Reference

| `action.type` | `value` field | Notes |
|---|---|---|
| `click` | null | Standard click; modifiers array for shift-click, ctrl-click |
| `fill` | Typed text (string) | Input / textarea fill |
| `navigate` | Target URL | Direct navigation not triggered by click |
| `scroll` | `{ direction, amount_px }` | Page or element scroll |
| `hover` | null | Mouse enter without click |
| `select` | Selected option value | `<select>` dropdown |
| `keyboard` | Key combo string ("Meta+K") | Keyboard shortcut |
| `drag` | `{ from_selector, to_selector }` | Drag and drop |
| `focus` | null | Tab / click to focus without further action |
| `blur` | null | Focus lost - captures form validation triggers |

### 7.5 Schema Versioning Rules

`schema_version` follows semver with strict renderer contracts:

| Change type | Version bump | Renderer impact |
|---|---|---|
| Add optional field | Patch (0.1.x) | Safe - renderers ignore unknown fields |
| Add required field with default | Minor (0.x.0) | Renderers must handle missing = default |
| Remove or rename field | Major (x.0.0) | Breaking - migration script required |
| Change field type | Major (x.0.0) | Breaking - migration script required |

Renderers must log a warning (not crash) when `schema_version` major differs from their compiled expectation.

### 7.6 What Each Renderer Consumes

| Renderer | Primary fields consumed |
|---|---|
| Playwright generator | `action`, `target.ref`, `target.locator`, `target.aria`, `post_delta.navigation`, `annotation.expected_outcome`, `renderer_hints.playwright` |
| Tutorial (Markdown / HTML) | `context`, `target.aria`, `target.component`, `annotation.intent`, `llm_cache.auto_description_*`, `renderer_hints.tutorial` |
| QA export (Jira / GitHub) | `sequence`, `annotation`, `pre_state.screenshot`, `renderer_hints.qa` |
| Regression differ | `pre_state.capture_id`, `post_delta.dom_mutations`, `context.url`, `pre_state.screenshot` |
| Onboarding widget | `target.bounding_box`, `target.locator`, `context.url`, `llm_cache.auto_title`, `renderer_hints.tutorial` |

No renderer re-queries the DOM. No renderer re-calls the LLM unless `llm_cache` is null. Everything needed is in the schema.

---

## Part 8: Storage Architecture

### 8.1 Location Rationale

The MCP bridge (not the browser extension) owns all filesystem writes. The extension sends structured step payloads to the MCP server over the existing WebSocket connection. The MCP server writes to `.viewgraph/` inside the project root.

This preserves the design constraint that the extension has zero filesystem coupling. It is architecturally identical to the existing capture workflow - just writing session steps instead of single-shot element captures.

The `.viewgraph/sessions/` path is the correct storage location because:
- Session data travels with the project (portable across machines)
- Sessions are version-controllable (the JSON is human-readable and diffable)
- The git `.gitignore` can exclude screenshots while tracking the session JSON
- The MCP server already knows the project root - no additional configuration

### 8.2 Directory Layout

```
.viewgraph/
  sessions/
    {session-id}/
      session.json          # Session manifest + all steps inline
      screenshots/
        {step-id}.png       # Raw screenshot at moment of interaction
        {step-id}_hl.png    # SoM-annotated screenshot with element marked [N]
  captures/                 # Existing: v3 per-capture files
    cap-{timestamp}-{seq}.viewgraph.json
    cap-{timestamp}-{seq}.actions.txt
    cap-{timestamp}-{seq}.png
    cap-{timestamp}-{seq}-annotated.png
    cap-{timestamp}-{seq}-delta.patch
    session.json            # Existing: active capture session manifest
  exports/
    {session-id}.playwright.ts
    {session-id}.tutorial.md
    {session-id}.tutorial.html
    {session-id}.jira.md
  baselines/
    {session-id}/
      {step-id}.dom.json    # DOM snapshot for regression diffing (regression_baseline mode only)
```

### 8.3 Write Protocol

1. On session start: create `sessions/{session-id}/`, write `session.json` with `status: "recording"` and `steps: []`
2. On each step: append step object to `sessions/{session-id}/session.json` steps array; write screenshots to `sessions/{session-id}/screenshots/`
3. On session end: update `status: "complete"`, write `summary`, trigger LLM cache generation for all steps, flush
4. On crash / abort: update `status: "aborted"` - partial sessions are valid artifacts; all written steps persist

No step is lost except the in-progress one at crash time.

### 8.4 Git Strategy (Recommended Defaults)

```gitignore
# Exclude - large binary files
.viewgraph/sessions/*/screenshots/
.viewgraph/captures/*.png
.viewgraph/exports/

# Track - the valuable artifacts
# .viewgraph/sessions/*/session.json
# .viewgraph/baselines/
```

Session JSON is small, human-readable, and meaningful in code review. "Added step 4 with expected outcome: form validates before submission" is a reviewable change. Screenshots are large and binary - the project decides whether to track them.

### 8.5 Relationship Between Session Captures and v3 Captures

The session schema's `pre_state.capture_id` field links each step to its corresponding v3 capture file in `.viewgraph/captures/`. This means:

- Renderers that need full DOM context (regression differ, advanced Playwright generation) can follow the `capture_id` reference and read the full v3 capture
- Renderers that only need semantic context (tutorial, QA export) work from the session JSON alone
- The session JSON is self-contained for 80% of use cases; the v3 capture files are the reference layer for the remaining 20%

---

## Part 9: Roadmap

### Phase 1 - v1.0 (Current): Core Bug Capture

- Single-shot element capture
- MCP agent integration (41 tools)
- Jira / GitHub markdown export
- `@viewgraph/playwright` fixture
- v3 format: actionManifest, refs, file-backed mode, delta capture, compact serialization

### Phase 2 - v1.1: Steps Recorder + Agent-to-Playwright Path

**Build first. This is the primary differentiator.**

- "Record Session" mode in extension sidebar
- Guided step-by-step recording UX (pause and annotate between actions)
- Session schema writer in MCP server (append-safe, crash-resistant)
- Agent-generated Playwright test output (primary export)
- QA export: Jira / GitHub structured test case per step
- Basic session viewer in extension sidebar

**What to skip in v1.1:** Tutorial rendering. Onboarding widget. Regression replay. Those require the schema to be proven in the wild first.

**Design constraint for v1.1:** The session schema must be output-agnostic from day one. Do not hard-wire it toward Playwright generation. Every subsequent renderer is a plug-in on top of the same schema. This decision costs an afternoon in v1.1. Made wrong, it costs a schema migration in v1.2.

### Phase 3 - v1.2: Tutorial Designer

- Tutorial recording mode (annotation prompts tuned for documentation)
- LLM cache generation at session end (auto_title, auto_description per audience, inferred_section)
- Section grouping via LLM analysis of context.nearest_heading / context.landmark
- HTML export (self-contained, SoM screenshots embedded)
- Markdown export (Notion / Confluence compatible)
- PDF export

### Phase 4 - v1.3: Tutorial Distribution

- Shareable public tutorial links (Scribe-style hosting)
- Direct Confluence / Notion publish integration
- Session staleness detection (DOM drift flagging on UI change)
- Agent-maintained documentation (agent rewrites drifted steps; human approves)

### Phase 5 - v2.0: Onboarding Platform

- Embeddable JS onboarding widget (WalkMe-lite, no SDK required)
- In-app step overlay using semantic element re-location (ARIA + test ID based)
- Regression baseline mode: full `baselines/` DOM snapshot per step
- Compliance audit trail export (timestamped, signed artifacts)
- Cross-session analytics: which steps fail most often, which tutorials are abandoned

### Schema Freeze Recommendation

Freeze the session schema before writing a single renderer. Once `session.json` files exist in the wild, changing the schema is a migration cost. The schema should be reviewed and locked before v1.1 ships publicly - even if that delays the initial release by a week. The cost of that week is paid once. The cost of a schema migration is paid in every consumer that reads the format.

---

## Part 10: Open Questions and Design Decisions

These are the blocking decisions. Each one has a right answer; the risk is deferring them past the point where they become migrations.

**1. ULID vs UUID.** ULIDs are sortable by creation time (useful for step ordering by ID alone) and slightly more compact. UUID v7 achieves the same. Pick one before any session files are written in production. Mixing ID formats across sessions is a support problem with no clean resolution.

**2. Inline steps vs. step files.** This spec keeps steps inline in `session.json`. Alternative: each step as `steps/{step-id}.json`; the manifest holds only IDs. Inline is simpler to read and diff. Separate files are safer for long sessions (100+ steps) and enable partial reads. Recommendation: inline for v1.1. Migrate to separate files in v1.2 if sessions exceed 50 steps in practice.

**3. `post_delta.dom_mutations` depth.** Full MutationObserver output is large and noisy. The current spec stores a summary string and significance boolean. Full DOM snapshots for regression diffing live in `baselines/` only when `recording_mode: "regression_baseline"`. Validate this against real session sizes before freeze.

**4. `llm_cache` invalidation trigger.** When does cached LLM output go stale? Proposal: invalidate when any `annotation` field changes, or when `target.aria` changes (selector drift). On invalidation, set `llm_cache: null` and let the renderer trigger re-generation lazily. Do not auto-regenerate on write - the recording session is not the right time to call the LLM.

**5. Screenshot format.** PNG is lossless and diffable. WebP halves the size. Decision affects `baselines/` storage significantly at scale. Recommendation: PNG for baselines (diff-critical), WebP for tutorial exports (visual quality matters less than file size).

**6. `renderer_hints.playwright.assertion` authoring.** Should the agent generate assertions at session-end (one LLM call for the full session, batch) or at step-record time (one LLM call per step, higher cost but more contextual)? Recommendation: batch at session-end. The full session context produces better assertions than per-step generation because the agent can see what came before and after.

**7. MCP tool surface for session management.** The v3 research recommends a maximum of 5 MCP tools. Session management needs: `viewgraph_session_start`, `viewgraph_session_step`, `viewgraph_session_end`, `viewgraph_session_read`. These can be folded into `viewgraph_capture` (with a `mode` parameter) and `viewgraph_read` (with a `section: "session"` parameter). Plan for this consolidation in v1.1 rather than shipping 4 new tools and consolidating later.

---

## Appendix: Cross-Reference - v3 Format Fields Used by Session Schema

| v3 Enhancement | Session schema field(s) | Benefit |
|---|---|---|
| `actionManifest` + `ref` | `target.ref`, `target.locator` | Element resolved from manifest; no raw DOM query at step time |
| `actionManifest.locator.strategy` | `target.locator.strategy` | Stable locator strategy hierarchy (testId > role > css) |
| Delta capture (`post_delta`) | `post_delta.dom_mutations`, `post_delta.network` | Per-step change data at 90-99% token reduction vs full recapture |
| `structuralFingerprint` | `post_delta.dom_mutations.fingerprint_changed` | Significance detected without LLM reasoning |
| `marks` / SoM annotated screenshot | `pre_state.screenshot_highlight` | Tutorial step illustrations pre-annotated; no post-processing |
| `checkpoint` envelope | Agent-side mirror of `steps[]` | Resume token enables test failure recovery from last verified step |
| `observationDepth: interactive-only` | Live recording context budget | Recording session runs at ~400 tokens per step; not 25K |
| `correlatedRefs` on errors | `pre_state.console.errors[].correlatedRefs` | Error context available to LLM for tutorial prose without inference |
| `containerMerging` | `context.nearest_heading`, `context.landmark` | Cleaner hierarchy input for section grouping LLM call |
| `lastActionTarget` | Used to link `checkpoint` to session step | Agent-side and human-side step records stay synchronized |
| File-backed capture mode | `pre_state.capture_id` | Full DOM available on demand; session JSON stays lean |
| `captureMode: "breakpoint"` | Enables human review step in recording UX | Agent pauses; human annotates; recording resumes |

---

*ViewGraph is AGPL-3.0 licensed. Source: github.com/sourjya/viewgraph*  
*Document compiled from ViewGraph product documentation, v3 agentic enhancements research, session schema draft v0.1.0, and strategic product analysis.*

---

## Part 11: Deep Competitive Research

*This section covers the technical architecture, market positioning, and failure modes of every relevant competitor category, then synthesizes specific build/skip decisions and coding pitfalls for ViewGraph's recorder implementation.*

---

### 11.1 Competitor Category Map

The market for "record and replay" tools splits into four structurally distinct categories. Understanding which category each competitor occupies is more important than comparing feature lists.

| Category | Tools | Capture method | Agent integration | DOM understanding |
|---|---|---|---|---|
| Documentation recorders | Scribe, Tango, Glyde | Screenshot + click event | None | Partial (Glyde only) |
| Digital adoption platforms | WalkMe, Appcues, Whatfix | SDK overlay | None | Via SDK |
| Session replay analytics | FullStory, LogRocket, Hotjar, PostHog | rrweb DOM serialization | None | Full (passive) |
| Test automation recorders | Playwright codegen, Selenium IDE, Chrome DevTools Recorder | Selector capture | Limited | Selector-only |

ViewGraph is none of these. It is the only tool whose capture architecture was designed for AI agent consumption from day one. The session recorder extends this into a fifth category: **semantic intent recording**. Each category's architecture is examined below.

---

### 11.2 Documentation Recorders: Scribe and Tango

#### Architecture

Both Scribe and Tango operate as Chrome extensions with `<all_urls>` host permissions. Their technical approach is:

1. Inject a content script that listens for `click`, `input`, `change`, and `beforeunload` events using `addEventListener` at the document level
2. On each captured event: take a screenshot via the extension's `tabs.captureVisibleTab()` API, record the event target's bounding box and (in Tango's case) the element's text content
3. On session end: send the event log + screenshots to their cloud backend for processing
4. Their backend: applies OCR to screenshots, generates step descriptions from click coordinates and element text, produces the formatted guide

**What this means structurally:** Scribe and Tango are screenshot pipelines with event timing metadata. They do not read the DOM tree. They do not capture ARIA roles, component boundaries, selector strategies, or network state. Their "step description" is generated from: (a) the visible text of the clicked element, and (b) an LLM that reads the cropped screenshot and tries to infer context.

The LLM gets a pixel image. It guesses. For "Click the Submit button in the registration form" it can produce adequate text. For "Click the second item in the dropdown that appears after clicking the Projects nav item" it frequently fails - because it only has the cropped element screenshot, not the surrounding DOM hierarchy that explains what the dropdown is for.

**Scribe's funding and scale:** $30M Series B (Redpoint Ventures, February 2024). Over 1 million Chrome users. Fortune 500 customers. Despite this scale, the core architecture has not changed: it is a screenshot pipeline. The 2024 fundraise was for AI text generation on top of the screenshots, not for DOM capture.

**Tango's differentiation:** Tango has recently added "Guide Me" (interactive overlay mode) and enterprise-only "automations" (process automation). The Guide Me mode is essentially a WalkMe-lite that displays step overlays on the live app by matching elements using the same CSS selectors captured during recording. This is the same brittle selector problem that plagues test recorders - when the UI changes, the overlay breaks and requires manual re-recording.

**Glyde** is the most architecturally interesting competitor in this category. It explicitly claims to capture DOM state alongside screenshots, producing "context-aware descriptions" that are meaningfully better than Scribe/Tango's screenshot-only prose. However: Glyde has no agent integration, no MCP layer, no test output path, and no network/console state capture. It is documentation-only. The gap between Glyde and ViewGraph is the entire agent layer.

#### Failure modes reported by users

From reviews and forum research:
- Recording reliability: "Recording won't start/stop" is the most common complaint for Scribe (cited in Chrome Web Store reviews). Root cause: the extension's event listener injection fails on some sites due to CSP restrictions or aggressive JS isolation.
- Missed clicks: steps captured out of order or dropped entirely on fast interactions. Root cause: `captureVisibleTab()` is async and can miss rapid sequential clicks.
- Arc browser incompatibility: Arc's tab isolation model breaks the content script injection pattern both tools rely on.
- Screenshot staleness: the screenshot captures the state before the click animation completes, showing the un-highlighted state. The element highlight is added in post-processing via the bounding box coordinates - which means the highlight can be misaligned by a few pixels after scroll or layout shift.
- Sensitive data leakage: both tools capture screenshots of forms including visible field values. Enterprise users frequently report needing to manually redact screenshots before sharing guides.

---

### 11.3 Digital Adoption Platforms: WalkMe and Appcues

#### Architecture

WalkMe and Appcues are fundamentally different from documentation recorders. They do not record: they overlay. The architecture is:

1. A JavaScript snippet loaded into the host application (SDK integration required)
2. The SDK registers a MutationObserver on the document and tracks element states
3. Workflow authors use a separate visual editor to define which elements should have overlays at which application states
4. The SDK matches live DOM elements to the workflow definitions using stored selector rules
5. When a match fires, the SDK renders a tooltip, modal, or walkthrough step over the matched element

**WalkMe's DeepUI:** WalkMe's proprietary element targeting uses a multi-signal approach - CSS selector + text content + visual position + element attributes - to survive minor DOM changes. This is more resilient than raw selectors but still breaks when the element's text content changes or its position in the page shifts significantly. SAP acquired WalkMe for $1.5B in September 2024; the platform is now embedded into the SAP ecosystem with a focus on enterprise employee training rather than general product onboarding.

**Why ViewGraph should not try to be this:** WalkMe takes 8-12 weeks to implement and requires dedicated technical ownership. WalkMe's setup requires jQuery for complex element targeting in their visual editor. This is architecturally antithetical to ViewGraph's "2 minutes" setup philosophy. The ViewGraph onboarding widget (v2.0 roadmap item) should be a lightweight read-only overlay driven by the session JSON schema - not a live SDK that runs on every page load.

**The DAP market's specific pain points (from user research):**
- The "guidance tax": enterprise customers pay for interactive overlay features they do not use if they only need documentation
- Overlay breakage on UI updates requires re-authoring, not just re-recording
- SDK dependency creates a tight coupling between the product's deployment and the onboarding tool's deployment
- Pricing scales with user count, making large-scale deployment expensive

---

### 11.4 Session Replay Analytics: rrweb and Its Ecosystem

#### Architecture (the technical foundation everyone uses)

Almost every session replay tool in existence - FullStory, Hotjar, LogRocket, PostHog Replay, Microsoft Clarity - is built on the same foundation: rrweb, an open-source library that records DOM mutations as compact diffs.

Understanding rrweb's architecture is directly relevant to ViewGraph's recorder implementation - both as a reference and as a source of solved problems.

**How rrweb works:**

Step 1: Full DOM snapshot on session start. rrweb serializes the entire DOM tree to a JSON-compatible structure. Key serialization choices:
- Script tags are replaced with `noscript` placeholder tags (prevents re-execution on replay)
- Input element values are read from the property (`inputElement.value`), not the attribute, because the value property reflects current state while the `value` attribute reflects the initial default
- Relative URLs are converted to absolute URLs (the replay iframe has a different origin)
- Each node gets a unique integer ID (`nid`)

Step 2: MutationObserver for ongoing changes. After the snapshot, rrweb registers a MutationObserver callback that fires for every DOM mutation. The critical implementation insight: MutationObserver uses a bulk asynchronous callback - there will be a single callback after a series of DOM changes occur, passed an array of multiple mutation records. Since rrweb uses a serialization process, it needs a more sophisticated solution to deal with various scenarios. For example, two different operation sequences can produce the same DOM structure but different mutation records. rrweb handles this by tracking serialized node IDs and resolving the final DOM state rather than naively replaying each mutation record in order.

Step 3: Event recording. Beyond DOM mutations, rrweb records: mouse moves (sampled at configurable frequency to reduce data volume), click events with coordinates, input events with values, scroll events, viewport resize events, and focus/blur events.

A 5-minute session compresses to 100-500KB. This is the baseline for ViewGraph's session JSON size comparison. A 20-step recording with delta captures should comfortably stay under 500KB of JSON, excluding screenshots.

**Privacy: the systemic risk all recorders face.** rrweb captures form field values by default. In 2017, Princeton researchers found that session replay scripts on popular sites were capturing credit card numbers and passwords in plain text. The mechanism was simple: rrweb captures form field values by default. If your input isn't masked, the content gets recorded. Most tools now have automatic masking heuristics for `type="password"`, card number patterns, etc. ViewGraph must implement equivalent protections at the capture layer, not as a post-processing option.

**What ViewGraph takes from rrweb (without using rrweb directly):**
- The "serialize DOM to JSON at session start, record mutations as diffs" model maps directly to the v3 file-backed capture + delta architecture already designed
- The input value property vs. attribute distinction must be handled in the step schema's `action.value` field for `fill` actions
- The noscript replacement for script tags is not needed (ViewGraph is not doing full replay), but the principle of avoiding re-execution applies to the embeddable widget

---

### 11.5 Test Automation Recorders: Playwright Codegen

#### Architecture

Playwright codegen instruments a Chromium browser process using Chrome DevTools Protocol (CDP) rather than a browser extension. This gives it deeper access than an extension content script but also couples it to running a controlled browser instance rather than the user's existing browser session.

On each user interaction, codegen:
1. Uses CDP's DOM domain to identify the interacted element
2. Generates a locator using Playwright's locator priority: `getByRole` > `getByLabel` > `getByText` > `getByPlaceholder` > CSS selector
3. Emits the interaction as a Playwright API call

The output is an executable Playwright test script. It is not annotated. It contains no intent. It contains no assertions (unless the user explicitly adds them). Teams report spending 40-60% of their testing time maintaining existing scripts rather than writing new ones - because even Playwright's best locator generation produces selectors that break on UI changes.

**The 2025-2026 response: intent-based testing.** The "self-healing" category is now well-established. Tools like Healwright pause tests at runtime when a selector fails, call an LLM with the broken selector + a screenshot of the current DOM, and receive a healed selector back. Playwright's AI Healer analyzes failed tests and automatically repairs them using MCP. Success rate exceeds 75% according to Microsoft. Works best on failures caused by broken selectors or DOM changes.

ViewGraph's advantage: it does not need to heal selectors reactively because it captures them semantically from the start. An `actionManifest` entry with `locator: { strategy: "testId", value: "submit-registration" }` does not break when the button's CSS class changes. Self-healing exists because tools like Playwright codegen generate brittle selectors. ViewGraph's semantic capture generates resilient selectors.

---

### 11.6 Feature Analysis: What to Build and What to Skip

This section applies the competitive research to ViewGraph's specific architecture and capabilities to produce explicit build/skip decisions.

#### BUILD: These features are differentiating and architecturally feasible

**Semantic element re-location for the onboarding widget (v2.0).**
All DAP tools struggle with overlay breakage on UI updates because they store CSS selectors. ViewGraph stores ARIA role + accessible name + test ID from the `actionManifest`. When the overlay widget re-locates an element for display, it queries: `document.querySelector('[data-testid="submit-registration"]')` first, falls back to `document.querySelector('[aria-label="Submit registration form"]')`, falls back to role-based matching. This three-tier fallback means the widget survives most UI changes without re-recording. No existing DAP tool has this because none of them have semantic capture.

**Automatic PII masking at capture time.**
Do not make this optional. Apply masking proactively for any `<input>` with `type="password"`, `type="email"`, `type="tel"`, `type="number"`, or `autocomplete` values like `cc-number`, `cc-exp`, `cc-csc`, `ssn`. Additionally: blur any element whose `aria-label` or `placeholder` contains keywords like "password", "card", "ssn", "secret", "token", "cvv". This applies to both the session schema's `action.value` field and to screenshots. Scribe offers manual redaction. Tango offers a blur tool. ViewGraph should offer automatic redaction that requires no user action - matching enterprise-grade session replay tools like FullStory.

**Step grouping by page section/component boundary.**
The LLM groups steps under section headings derived from `context.nearest_heading` and `context.landmark`. This produces tutorial documents that read like they were written by a technical writer who understood the product structure. No documentation recorder does this today. Scribe and Tango produce flat numbered lists. Grouping is purely an LLM synthesis task on top of data ViewGraph already captures - zero additional capture work required.

**Selective step deletion and reordering in the session viewer.**
Every competitor supports this because users always make accidental clicks during recording. ViewGraph's session viewer should allow: delete a step, reorder steps (updating `sequence` ordinals), merge two steps into one (for small sequential actions like "open dropdown, select option"), and split a step with a note. This is pure UI - the schema already supports all of these via `sequence` being a mutable ordinal.

**Multi-tab session continuity.**
Scribe and Tango explicitly capture only one tab at a time. ViewGraph's MCP server already manages the project context across multiple captures. Extending this to track tab switches during a session recording is a relatively small addition to the extension's tab event listeners (`tabs.onActivated`). The step schema's `context.url` already captures the URL per step. Tab continuity is a genuine gap in the documentation recorder market.

**Analytics hooks (not analytics platform).**
Do not build an analytics platform. Do build schema fields that make it easy to feed session data into existing analytics tools. Add `viewer_events` to the session JSON export format: `{ step_id, event: "viewed" | "completed" | "skipped", timestamp }`. This lets the embeddable widget emit events that integrators can send to Mixpanel, PostHog, or Amplitude. ViewGraph does not need to be the analytics store. It just needs to produce the events.

**Branching annotations (simple fork, not decision tree).**
The schema supports a `renderer_hints.tutorial.callout` field. Extend this to support a simple fork: `{ type: "branch", condition: "If you see X", goto_step: 5, else_step: 6 }`. This covers the most common tutorial fork case: "if the dialog appears, click Confirm; if not, skip to step 6." Full decision trees with cyclic paths are a v2.x feature. Simple linear forks are achievable in v1.2 with minimal schema change.

#### SKIP: These features are traps

**Browser replay engine (reproducing a recorded session in the browser).**
This is the single most common mistake in this product category. Every tool that has tried to implement reliable session replay has discovered the same reality: dynamic IDs, auth state dependencies, animation timing, CAPTCHA blocks, third-party scripts, race conditions between XHR responses and UI updates, and viewport-sensitive layout all compound into an engineering problem that consumes vastly more resources than any other feature. The correct path is: let the agent generate Playwright tests (which handle auth via fixtures, handle waits via proper `waitFor` assertions, and handle dynamic content properly). The Playwright test IS the replay - but a robust one, not a fragile coordinate-based one.

**Desktop recording.**
The extension captures browser content. Desktop applications are outside its architecture entirely. WalkMe and Tango have desktop apps; they required entirely separate engineering investments. ViewGraph's value proposition is DOM capture inside the browser. That constraint is also a feature: everything it captures is semantically interpretable. Desktop screenshots are not.

**Video recording.**
Loom already owns this space. More importantly, video is the wrong medium for the outputs ViewGraph targets. A Playwright test cannot be generated from a video. A tutorial that self-updates when the UI changes cannot be built on video frames. ViewGraph's entire advantage is structured data capture, not pixel capture.

**Full DAP platform (live overlay engine).**
WalkMe required eight to twelve weeks of setup time and jQuery expertise. That complexity is antithetical to ViewGraph's two-minute setup. The correct v2.0 approach is an embeddable JS widget that reads from a published session JSON file and renders lightweight DOM-positioned annotations. This is a one-file embed, not a platform. Keep it there.

**User segmentation and analytics engine.**
Pendo, Amplitude, and PostHog already do this. ViewGraph's job is to produce the events and the content. Let integrators choose their analytics stack. Building a segmentation engine would require ViewGraph to run a backend that tracks user identities across sessions - a privacy surface and an engineering investment that does not compound the core product advantage.

**Branching decision trees (full).**
The LLM-powered tutorial generator will eventually be asked to handle complex conditional flows ("if you're on the Pro plan, do X; if you're on the Free plan, do Y"). Resist this until the linear recording is proven. Decision trees require a fundamentally different UX for recording (how does the human indicate a branch point?), a different schema (DAG instead of ordered array), and a different rendering engine (state machine, not sequential renderer). This is a v2.x architecture decision, not a v1.x feature addition.

**AI-generated test data.**
"Fill in realistic-looking fake data during recording" is a feature request that will come up. Skip it. Playwright fixtures handle parameterization correctly. Having ViewGraph generate synthetic data bakes it into the session schema in a way that is hard to parameterize later. The agent writing the Playwright test from the session can add fixture-based parameterization. That is the correct separation of concerns.

---

### 11.7 Features by Target Segment: Specific Additions

The research surfaces specific features each segment is underserved on that ViewGraph is positioned to fill.

#### For developers and test automation engineers

**Intent-based test generation (beyond current plan).** The gap the research identifies: existing intent-based testing tools (ZeroStep, Bug0) take natural language descriptions and generate Playwright code. They have no capture layer - they guess the selectors. ViewGraph has the capture layer but has not yet built the natural-language annotation-to-test pipeline. The combination of a human's `annotation.intent` field plus the `actionManifest` locator produces the most reliable automated test generation path in the market: real selectors derived from real interactions, with assertions derived from real intent. This is the primary v1.1 headline feature and should be scoped to deliver the full pipeline, not just the schema.

**Trace linking.** The v3 checkpoint envelope already has `traceId`. Expose this as a link in the session viewer: "View Playwright trace for this step." This integrates directly with `playwright show-trace` and makes ViewGraph the bridge between human annotation and automated test debugging. No other tool does this.

**CI failure annotation.** When a Playwright test generated from a ViewGraph session fails in CI, the failure trace should link back to the original session step that produced the failing assertion. This closes the debugging loop: "Test step 4 failed → here is the original human session step, with the intent annotation that explains what this step was supposed to verify." This is a v1.2 feature but should be designed for in the schema from day one via the `checkpoint.traceId` field.

#### For QA engineers

**Pass/fail per-step annotation during live testing.** The session schema has `annotation.result` (pass | fail | skip | blocked) and `annotation.actual_outcome` fields. The session viewer should let a QA engineer mark each step as they execute a test session, filling in `actual_outcome` for steps that failed. This turns a recording session into a test execution record - not just a capture. No documentation recorder supports this. It is the difference between "here is what I did" and "here is what I tested and what I found."

**Expected vs. actual outcome diff view.** When `annotation.actual_outcome` is populated and differs from `annotation.expected_outcome`, the session viewer should highlight the divergence. This is the non-technical tester's bug report: "I expected X, I got Y, here is the DOM state when it happened." The agent receiving this has everything it needs to investigate without any further clarification.

**Blocked and skip states.** The `annotation.result` field includes `blocked` (test could not proceed because of a prerequisite failure) and `skip` (deliberately skipped this step). The QA export renderer should handle these states in the Jira output: a `blocked` step becomes a dependency note; a `skip` step becomes an excluded condition. These states exist in manual QA workflows everywhere and no recorder tool captures them.

#### For technical writers and product managers

**Voice-to-text annotation.** During recording, the pause-and-annotate UX should offer a microphone option. The technical writer or PM describes each step verbally; the extension transcribes it using the Web Speech API (zero backend cost, runs in-browser). This is significantly faster than typing annotations mid-workflow, particularly for complex steps. The transcribed text populates `annotation.intent`. The LLM refines it in the `llm_cache` generation pass.

**Section heading override.** The LLM infers `llm_cache.inferred_section` from DOM context. Give the author the ability to manually override this in the session viewer. Some sections are named by business logic (e.g., "Billing setup") that is not reflected in the nearest DOM heading. A simple editable text field in the session viewer for each section group is sufficient.

**Screenshot crop and annotation tools.** Scribe and Tango both offer screenshot editing (crop, zoom, add callout boxes). ViewGraph's session viewer should offer the same. The underlying screenshot is already captured at full viewport resolution; crop and annotate are presentation-layer operations on top of the stored file. This is a low-effort, high-visibility feature for technical writers who need polished tutorial screenshots.

**"What changed" diff export.** When a tutorial is regenerated after UI drift detection, produce a diff document: "These three steps changed since the last published version." This is the agent-maintained documentation feature that no competitor has, but its value is only visible if the diff is surfaced explicitly. A `changes_since_version` field in the session manifest, populated by the staleness detection agent, drives this output.

#### For customer success and support

**Shareable link with step highlight.** A published tutorial link should support URL parameters for deep-linking: `tutorial.link/session-id#step-4` scrolls directly to step 4 and highlights it. This lets a support agent in a Zendesk ticket link directly to the relevant step rather than telling the customer to "scroll to step 4."

**Tutorial completion webhook.** When the embeddable widget's user completes the last step, fire a configurable webhook. This integrates with CRM and support ticketing systems: "User John completed the billing setup tutorial" can update a Salesforce record or close a support ticket automatically. Zero ViewGraph backend required - the webhook URL is a config parameter in the widget script tag.

---

### 11.8 Coding Pitfalls for Browser-Based Step Recorders

This section documents the specific engineering problems that have caused failures in every existing recorder implementation. Each pitfall includes the cause, the consequence, and ViewGraph's mitigation given its architecture.

#### Pitfall 1: Dynamic ID selectors

**Cause:** React, Angular, and Vue generate element IDs programmatically (`input_1647382930`, `modal_uuid_abc123`). These change on every page load and often on every re-render.

**Consequence:** A session recorded on Monday becomes unreplayable on Tuesday because every selector in the step log is stale.

**ViewGraph mitigation:** The `actionManifest` locator strategy hierarchy (testId > ARIA role > CSS) already de-prioritizes dynamic IDs. The `selector_confidence` field on the target explicitly flags when only a CSS selector was available (`"low"`). The Playwright generator should produce `getByRole` and `getByTestId` locators, not the raw CSS selector from the `target.selector` field. Enforcing this in the generator is a single configuration decision.

#### Pitfall 2: Shadow DOM opacity

**Cause:** Web components render their internals inside a shadow root. `document.querySelector()` does not pierce shadow boundaries. An element inside a shadow root is invisible to standard DOM traversal.

**Consequence:** Clicks on shadow DOM elements appear to the recorder as clicks on the host element's bounding box, not the actual interactive element. The captured `target` is wrong.

**Mitigation:** Implement a recursive shadow-piercing query that walks `shadowRoot` chains:

```javascript
function deepQuery(selector, root = document) {
  const result = root.querySelector(selector);
  if (result) return result;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      const found = deepQuery(selector, el.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}
```

Note: this only works for open-mode shadow roots (`element.shadowRoot` is accessible). Closed-mode shadow roots are impenetrable to extension content scripts. Flag closed-mode elements in `target.stability_hints` as `"shadow-closed"` so the Playwright generator knows to use Playwright's built-in shadow-piercing combinators rather than the captured selector.

#### Pitfall 3: MutationObserver callback ordering

**Cause:** MutationObserver delivers a batch of mutation records asynchronously. Between the user action and the callback, the DOM may have been modified multiple times. Simply replaying the records in order can produce an incorrect intermediate state.

**Consequence:** The `post_delta.dom_mutations` captured after a step may reflect partial mutations if the observer callback fires before the full DOM update settles (e.g., React's batch rendering).

**Mitigation:** Wait for the mutation batch to settle before capturing `post_delta`. Use a debounced observer callback with a 100ms delay after the last mutation record before capturing the post-action state. This is rrweb's approach and the right one. The v3 delta capture should apply the same debounce: capture the delta 100ms after the last mutation following the action, not immediately.

#### Pitfall 4: Input value vs attribute

**Cause:** `<input type="text">` reflects the user-typed value in `inputElement.value` (a live property) but NOT in `inputElement.getAttribute('value')` (which reflects the HTML attribute, i.e., the default value). For file inputs, `inputElement.value` gives a fake path for security reasons.

**Consequence:** A step schema that stores `target.attributes.value` for a text input stores the placeholder/default, not what the user typed. The `fill` action's `action.value` would be wrong.

**Mitigation:** For `fill` actions, always read from `inputElement.value` (the property), never from `getAttribute('value')`. For file inputs, store `action.value` as `"[file: redacted]"` - file paths are PII and the recorder cannot reproduce file selections in tests anyway (Playwright fixtures handle file uploads separately).

#### Pitfall 5: SPA navigation events

**Cause:** Single-page applications update the URL using the History API (`pushState`, `replaceState`) rather than full page loads. The browser does not fire a `load` event for these navigation events. An extension listening only for `load` misses all SPA navigation.

**Consequence:** Navigation steps are either not captured or captured as clicks on the nav element with no URL change recorded, breaking the `post_delta.navigation` field.

**Mitigation:** Patch the History API in the content script to intercept navigation events:

```javascript
const originalPushState = history.pushState.bind(history);
history.pushState = function(...args) {
  originalPushState(...args);
  recordNavigationStep(location.href);
};
window.addEventListener('popstate', () => recordNavigationStep(location.href));
```

This must be injected into the page context (not the content script context) via `chrome.scripting.executeScript({ world: "MAIN" })` because the History API lives in the main world. Content script context has its own copy.

#### Pitfall 6: Cross-origin iframes

**Cause:** An extension content script injected into a page cannot access the DOM of a cross-origin iframe due to the Same-Origin Policy. Even with `all_frames: true` in the manifest, the content script in a cross-origin frame cannot communicate back to the top-level page.

**Consequence:** Clicks inside embedded third-party iframes (payment processors, embedded widgets, authentication providers) are invisible to the recorder.

**Mitigation:** Declare `all_frames: true` in the content script manifest entry. This injects the content script into same-origin subframes. For cross-origin frames: detect the frame boundary and annotate the step with `target.stability_hints: ["cross-origin-frame"]` and a note that this step requires manual Playwright implementation. Do not attempt to capture cross-origin frame interactions - this is a security boundary, not a tooling limitation. Surface it clearly to the user rather than silently missing the step.

#### Pitfall 7: Content Security Policy conflicts

**Cause:** Some applications (particularly banking, healthcare, and large SaaS) set strict CSP headers that block inline scripts, disallow `eval`, or restrict WebSocket connections to specific origins. Extension content scripts bypass many CSP restrictions, but not all - particularly those that block communication with external WebSocket servers.

**Consequence:** The ViewGraph MCP bridge communicates via WebSocket. If the application's CSP blocks WebSocket connections to `localhost`, the extension cannot send step payloads to the MCP server.

**Mitigation:** The extension's WebSocket connection should use the extension's background service worker as a relay, not a direct connection from the content script. Chrome extensions' background service workers are not subject to the host page's CSP. The communication path is: `content script → chrome.runtime.sendMessage → background worker → WebSocket → MCP server`. This adds one hop but makes the connection CSP-immune. This is the architecture ViewGraph should already be using; confirm it before shipping the recorder.

#### Pitfall 8: Drag-and-drop recording

**Cause:** Drag-and-drop interactions generate a sequence of `mousedown`, `mousemove` (many events), and `mouseup` events with pixel coordinates. Recording the full sequence is expensive and replaying it is fragile (coordinate-dependent, animation-speed-dependent, scroll-position-dependent).

**Consequence:** Drag steps either bloat the session schema with hundreds of mouse movement records, or they capture only the endpoints and produce a simplified step that doesn't reflect the actual gesture.

**Mitigation:** Record drag-and-drop as a semantic operation using the HTML5 Drag and Drop API events (`dragstart`, `dragend`, `drop`) rather than raw mouse events. Capture `action.type: "drag"` with `action.value: { from_ref: "e4", to_ref: "e12" }` using the `@eN` refs from the actionManifest for both the source and target elements. The Playwright generator emits `dragTo` from the source locator to the target locator. This is resilient to viewport changes and animation timing.

#### Pitfall 9: Canvas and WebGL elements

**Cause:** Canvas elements render via JavaScript drawing commands. Their content is not in the DOM and is completely opaque to any DOM-based capture approach.

**Consequence:** Interactions with canvas-based UI (drawing tools, chart interactions, game interfaces, some rich text editors) produce steps where `target` captures only the canvas element itself, not the semantic intent of the interaction within the canvas.

**Mitigation:** Acknowledge the limitation clearly in the extension UX. When the user clicks on a `<canvas>` element, show a prompt: "This is a canvas element. ViewGraph cannot capture its semantic content. Would you like to add a manual annotation?" The step is recorded with `action.type: "click"`, `target.tag: "canvas"`, `target.aria.role: null`, and the `annotation.intent` is whatever the user types. The Playwright generator emits a coordinate-based click on the canvas element with a comment noting manual verification is required.

#### Pitfall 10: PII capture in form fields

**Cause:** Step recorders that capture `action.value` for `fill` actions are recording whatever the user typed - which may be real names, real emails, real passwords, or real payment information.

**Consequence:** Session JSON files stored in `.viewgraph/sessions/` may contain plaintext PII. If these are committed to version control (which the schema recommends for session JSON), this becomes a compliance and security incident.

**Mitigation (three layers):**

Layer 1 - Capture-time masking: For any input with `type="password"`, always store `action.value: "[redacted]"`. For inputs with `autocomplete` values containing `cc-*`, `ssn`, or `password`, apply the same redaction automatically.

Layer 2 - Heuristic detection: Before writing `action.value`, run a lightweight regex pass: if the value matches patterns for credit card numbers (Luhn-check), SSN format (`\d{3}-\d{2}-\d{4}`), or email addresses, replace with a typed placeholder (`"[email redacted]"`, `"[card number redacted]"`).

Layer 3 - User prompt: For any `fill` action on a field that was not auto-masked but that the user is concerned about, the session viewer should provide a "Redact this value" button that replaces the stored value with a placeholder and regenerates the `llm_cache` for that step.

Note: masking must happen at capture time (in the extension before the payload is sent to the MCP server), not at render time. Once the value is written to `session.json` it is potentially in git history.

#### Pitfall 11: Event listener contamination

**Cause:** The extension injects a content script that adds event listeners to the page. Some applications use custom event systems (React's synthetic events, Angular's zone.js, Vue's reactive system) that intercept or transform browser events before they reach the DOM. An extension's `addEventListener` at the document level may receive events in a different order or with different properties than the application code sees.

**Consequence:** The recorded `target` may reflect the event's actual DOM target rather than the application's logical target (e.g., React may re-route a click from a child span to the parent button component).

**Mitigation:** Walk up the event's target chain using `composedPath()` (which pierces shadow DOM) and select the first ancestor that has a meaningful ARIA role, a test ID attribute, or a meaningful accessible name. Do not use `event.target` directly if it is an element with no semantic context (`<span>`, `<div>`, `<i>`).

```javascript
document.addEventListener('click', (event) => {
  const path = event.composedPath();
  const semanticTarget = path.find(el => 
    el.getAttribute?.('data-testid') ||
    el.getAttribute?.('aria-label') ||
    el.getAttribute?.('role') ||
    ['button', 'a', 'input', 'select', 'textarea'].includes(el.tagName?.toLowerCase())
  );
  recordStep(semanticTarget || event.target);
}, true); // capture phase, not bubble phase
```

Using capture phase (`true` as the third argument) ensures the listener fires before application event handlers, giving ViewGraph first access to the raw event before any framework transformation.

#### Pitfall 12: Animation and transition timing

**Cause:** CSS animations and JavaScript transitions mean an element may not be in its final interactive state immediately after a DOM mutation. Capturing the `pre_state` screenshot before an animation completes produces a screenshot that shows the animation in progress rather than the stable state.

**Consequence:** Tutorial screenshots show half-animated states. Regression baselines produce false positives because the screenshot is taken mid-animation rather than post-settle.

**Mitigation:** The v3 `stability_hints` field already includes `"animation-active"` as a hint. When the extension detects active CSS animations on the target element (via `getComputedStyle(el).animationName !== 'none'`), delay the screenshot capture until the `animationend` event fires on the target or its ancestors, with a maximum timeout of 1000ms. Surface this as `"screenshot-delayed-for-animation"` in the step's `pre_state` metadata.

---

### 11.9 The Self-Healing Selector Opportunity

The 2025-2026 emergence of self-healing selector tooling (Healwright, Playwright AI Healer, BrowserStack AI Self-Heal) points to a market actively trying to solve the problem that ViewGraph prevents at source.

These tools react to broken selectors. ViewGraph generates selectors that are less likely to break in the first place. The positioning distinction matters:

- Self-healing tools: "Your selectors broke. We fixed them."
- ViewGraph: "Your selectors were generated from ARIA semantics. They are less likely to break."

This is a clean differentiation message for the developer and test automation audiences. The implication for the roadmap: ViewGraph should benchmark its generated locator stability against Playwright codegen's generated locators on a set of test applications. If the data shows fewer selector failures over N UI change cycles, that is a quantified competitive claim that directly undercuts the self-healing tool value proposition.

---

### 11.10 The Glyde Pattern: Closest Architectural Relative

Glyde is worth a focused analysis because it is the only documentation tool that claims DOM capture alongside screenshots. Glyde captures DOM state and structured step data rather than just taking pictures, producing documentation with contextual descriptions. It generates runbooks after a single recording session and exports directly to Notion or Confluence.

The gap between Glyde and ViewGraph:
- Glyde: DOM capture for documentation context only; no ARIA semantics; no network state; no console capture; no MCP; no agent integration; no test output
- ViewGraph: DOM capture for the full semantic layer including ARIA, component boundaries, network state, console state, accessibility violations, MCP integration, agent-generated tests, and five output paths from one session

Glyde validates the market: DOM-aware documentation tools are better than screenshot-only tools, and the market is recognizing this. ViewGraph's depth advantage is structural and not closable by Glyde without re-architecting its entire capture layer.

The tactical implication: ViewGraph's tutorial output quality should be benchmarked against Glyde on the same workflow, head-to-head. The auto-generated step prose from ViewGraph's ARIA + network + component name context should be demonstrably more accurate and contextual than Glyde's DOM-aware but semantics-shallow output. That benchmark is a marketing artifact worth producing.

---

### 11.11 Schema Additions Indicated by Research

The research surfaces five schema additions not present in the original draft:

**1. `target.stability_hints` expanded set (from v3 research + coding pitfalls):**

```jsonc
"stability_hints": [
  "animation-active",     // CSS animation in progress at capture time
  "shadow-closed",        // element inside a closed-mode shadow root
  "cross-origin-frame",   // element inside a cross-origin iframe
  "dynamic-id",           // selector_confidence: "low" because only dynamic ID available
  "canvas-element",       // non-DOM interactive surface
  "spa-navigation"        // step triggered SPA pushState navigation, not full page load
]
```

**2. `annotation.pii_redacted` boolean:**
```jsonc
"annotation": {
  "pii_redacted": true,   // action.value was auto-redacted at capture time
  "redaction_reason": "password-field" // | "cc-pattern" | "ssn-pattern" | "email-pattern" | "manual"
}
```

**3. `pre_state.animation_state`:**
```jsonc
"pre_state": {
  "animation_state": "settled",  // | "in-progress" | "screenshot-delayed"
  "screenshot_delay_ms": 340     // how long the extension waited for animation to settle
}
```

**4. `context.frame`:**
```jsonc
"context": {
  "frame": {
    "type": "top",          // | "same-origin" | "cross-origin"
    "src": null,            // src attribute of the frame element if applicable
    "accessible": true      // false if cross-origin and content not capturable
  }
}
```

**5. `session.completed_by`:**
```jsonc
{
  "completed_by": {
    "type": "human",        // | "agent"
    "agent_id": null,       // agent identifier if type is "agent"
    "annotation_coverage": 0.85  // fraction of steps that have human annotations
  }
}
```

The `annotation_coverage` field is useful for tutorial renderers: a session with 100% annotation coverage can produce a polished tutorial with minimal LLM inference. A session with 0% coverage is a pure agent-generated draft that requires human review before publication.

---

### 11.12 Updated Roadmap Additions

The following additions to the v1.x roadmap are indicated by research findings:

**v1.1 additions:**
- Multi-tab session continuity (track `tabs.onActivated`, record tab switch as a step)
- Automatic PII masking at capture time (before payload leaves the extension)
- Shadow DOM traversal via `composedPath()` and recursive `shadowRoot` query
- SPA navigation patching via `history.pushState` interception in main world
- Capture phase event listeners to ensure framework-agnostic event capture

**v1.2 additions:**
- Screenshot annotation tools in the session viewer (crop, callout box, zoom)
- Voice-to-text annotation via Web Speech API
- Pass/fail + actual_outcome annotation per step for QA execution mode
- Simple step fork annotation (`annotation.branch`)
- Expected vs. actual outcome diff view in session viewer

**v1.3 additions:**
- Shareable link with step-level deep-link anchors (`#step-N`)
- Tutorial completion webhook for embeddable widget
- Locator stability benchmark report (ViewGraph selectors vs. codegen selectors, measured over N UI change cycles)
- `viewer_events` output format for analytics tool integration (PostHog, Amplitude, Mixpanel)

