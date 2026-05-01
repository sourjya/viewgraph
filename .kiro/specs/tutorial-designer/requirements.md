# Tutorial Designer - Requirements

**Version:** v1.2
**Status:** Draft
**Depends on:** [Session Recorder (v1.1)](../session-recorder/requirements.md)
**Research:** [ViewGraph Future Directions v2](../../../docs/references/viewgraph-future-directions-v2-from-annotated-bug-capture-to-multi-output-session-intelligence.md)

---

## Problem Statement

Tutorial authoring tools in 2026 occupy two positions, both structurally limited:

**Screenshot-based tools** (Scribe, Tango, Glyde): Capture pixel sequences, draw arrows, paste author-typed text. Fast to produce. Brittle when the UI changes. Zero semantic understanding of what the user is interacting with. Cannot auto-generate contextual step descriptions. Cannot detect when a tutorial becomes stale because the UI changed.

**SDK-based overlay tools** (WalkMe, Appcues, Whatfix): Require integration into the product's codebase. Powerful but developer-gated. Non-technical authors cannot use them without developer assistance. 8-12 weeks setup time. Expensive per-seat pricing.

Neither category can produce:
- Auto-generated tutorial prose from DOM semantics (ARIA roles, component names, network state)
- Agent-maintained documentation that updates when the UI changes
- Audience-adapted descriptions (end user vs developer vs QA) from the same recording
- Section-grouped narrative structure derived from page hierarchy

**The structural gap:** Screenshot tools give their LLM a pixel image. ViewGraph gives its LLM per-step: `target.aria.label`, `target.aria.role`, `target.component.name`, `context.nearest_heading`, `context.dialog`, `context.form`, `context.url`, `post_delta.network.requests_triggered`, `post_delta.navigation`, `pre_state.console.errors`, and `annotation.intent`. The LLM writes qualitatively different prose from this input.

Not "Click the button" but: "Click **Submit** to create your account. ViewGraph will validate your email and password before saving. If either field has an error, the button will remain active and an inline message will tell you what to fix. On success, you'll be taken to your dashboard automatically."

The network context (`POST /api/users` returning 201, then navigation to `/dashboard`) is what allows the LLM to write "on success, you'll be taken to your dashboard." The LLM did not infer this. ViewGraph measured it.

---

## Justification

The Tutorial Designer transforms ViewGraph from a developer tool into a documentation platform. The key insight: the same session recording that produces Playwright tests (v1.1) also produces tutorials - without re-recording. What differs is the renderer, not the recording.

**Why this is defensible:**

1. **Semantic prose generation** - Scribe/Tango give their LLM a screenshot. ViewGraph gives its LLM structured DOM context. The output quality gap is structural and not closable without re-architecting around DOM capture.

2. **Staleness detection** - ViewGraph stores semantic context (ARIA labels, component names, structural fingerprints), not pixel data. When the UI changes, ViewGraph can detect DOM drift because it knows what the element was called, what role it had, and where it sat in the hierarchy. No screenshot-based tool can detect when a tutorial is outdated. Scribe tutorials break silently. ViewGraph tutorials flag drift.

3. **Audience adaptation** - One step produces three descriptions from the same captured data:
   - End user: "Click **Submit** to create your account. You'll see your dashboard if everything looks good."
   - Developer: "Triggers `POST /api/users`. 201 redirects to `/dashboard`. 422 returns inline validation errors."
   - QA: "Verify: submit with valid credentials returns 201 and renders `/dashboard` within 2 seconds."

4. **Section grouping** - Raw recordings are flat numbered lists. The LLM identifies that steps 3-7 all interact with the same form cluster and groups them under "Filling out the registration form" with an introductory sentence. No screenshot tool does this.

**Glyde comparison:** Glyde is the closest architectural relative - it claims DOM capture alongside screenshots. But Glyde has no ARIA semantics, no network state, no console capture, no MCP integration, no agent layer, and no test output. The gap between Glyde and ViewGraph is the entire agent layer plus the depth of semantic capture.

---

## User Stories

### US-1: Record a tutorial session

**As a** product manager or technical writer,
**I want to** record a tutorial session with documentation-tuned annotation prompts,
**So that** I produce a tutorial draft from my product walkthrough without writing prose from scratch.

**Acceptance Criteria:**
- [ ] User can select "Tutorial" as the recording mode when starting a session
- [ ] Annotation prompt changes to: "How would you describe this step to a new user?"
- [ ] The annotation becomes tutorial prose authored by the human, which the LLM refines
- [ ] Recording mode is stored as `recording_mode: "tutorial"` in the session manifest
- [ ] All v1.1 recording capabilities (pause-and-annotate, multi-tab, PII masking) work in tutorial mode

### US-2: LLM cache generation at session end

**As a** user who has completed a tutorial recording,
**I want to** have the LLM automatically generate polished descriptions for each step,
**So that** the tutorial draft is immediately usable without manual prose writing.

**Acceptance Criteria:**
- [ ] On session end, the LLM generates `llm_cache` fields for all steps in batch
- [ ] `auto_title` - concise step title (e.g., "Submit registration form")
- [ ] `auto_description_user` - end-user-facing prose with bold element names and outcome description
- [ ] `auto_description_technical` - developer-facing prose with API calls, status codes, redirects
- [ ] `auto_description_qa` - QA-facing prose with verification criteria and timing
- [ ] `inferred_section` - section heading for grouping (e.g., "Account creation")
- [ ] `generated_at` timestamp and `model` identifier stored for cache invalidation
- [ ] LLM cache is invalidated (set to null) when `annotation` or `target.aria` fields change
- [ ] Re-generation is lazy (triggered by renderer, not on write)

### US-3: Section grouping via page structure

**As a** tutorial consumer,
**I want to** see tutorial steps grouped under meaningful section headings,
**So that** the tutorial reads like structured documentation, not a flat numbered list.

**Acceptance Criteria:**
- [ ] The LLM analyzes the full step sequence at session end
- [ ] Steps are grouped under section headings derived from `context.nearest_heading` and `context.landmark`
- [ ] Steps 1-3 inside a "Create Account" form become "Section 1: Creating your account"
- [ ] Steps 4-6 on the Dashboard become "Section 2: Your dashboard"
- [ ] Each section gets an introductory sentence generated by the LLM
- [ ] Section grouping is stored in `llm_cache.inferred_section` per step
- [ ] Users can manually override section headings in the session viewer

### US-4: Export as interactive HTML

**As a** technical writer or product manager,
**I want to** export my tutorial as a self-contained HTML file,
**So that** I can host it on an internal portal or share it directly.

**Acceptance Criteria:**
- [ ] HTML export is self-contained (no external dependencies)
- [ ] SoM-annotated screenshots embedded inline (base64 or relative paths)
- [ ] Step-by-step navigation with previous/next controls
- [ ] Section headings derived from `llm_cache.inferred_section`
- [ ] Each step shows: screenshot with highlighted element, description prose, callout notes
- [ ] Responsive layout (works on desktop and tablet)
- [ ] Output saved to `.viewgraph/exports/{session-id}.tutorial.html`

### US-5: Export as Markdown

**As a** technical writer,
**I want to** export my tutorial as Markdown compatible with Notion and Confluence,
**So that** I can publish directly to our documentation platform.

**Acceptance Criteria:**
- [ ] Markdown export uses standard heading hierarchy (H1 for title, H2 for sections, H3 for steps)
- [ ] Screenshots referenced as relative links (not embedded)
- [ ] Section grouping reflected in heading structure
- [ ] Step descriptions use the audience-appropriate `auto_description_*` field
- [ ] Callout notes rendered as blockquotes
- [ ] Compatible with Notion import and Confluence wiki markup
- [ ] Output saved to `.viewgraph/exports/{session-id}.tutorial.md`

### US-6: Export as PDF

**As a** compliance officer or formal documentation consumer,
**I want to** export my tutorial as a paginated PDF,
**So that** I have a versioned, printable artifact for audit trails.

**Acceptance Criteria:**
- [ ] PDF is paginated with header/footer containing version stamp and generation date
- [ ] Screenshots are embedded at appropriate resolution
- [ ] Section headings create PDF bookmarks for navigation
- [ ] Table of contents generated from section structure
- [ ] Output saved to `.viewgraph/exports/{session-id}.tutorial.pdf`

### US-7: Voice-to-text annotation

**As a** product manager recording a tutorial,
**I want to** describe steps verbally instead of typing,
**So that** I can annotate faster during complex workflows.

**Acceptance Criteria:**
- [ ] Microphone button available in the annotation prompt during recording
- [ ] Transcription uses Web Speech API (zero backend cost, runs in-browser)
- [ ] Transcribed text populates `annotation.intent`
- [ ] User can edit the transcription before confirming
- [ ] Works in Chrome and Firefox (with graceful fallback if API unavailable)

### US-8: Screenshot annotation tools

**As a** technical writer reviewing a tutorial,
**I want to** crop, zoom, and add callout boxes to step screenshots,
**So that** published tutorials have polished, focused illustrations.

**Acceptance Criteria:**
- [ ] Crop tool to focus on the relevant area of the screenshot
- [ ] Zoom/magnify for small UI elements
- [ ] Callout box overlay (rectangle with optional text label)
- [ ] Arrow annotation pointing to the target element
- [ ] Edited screenshots saved alongside originals (non-destructive)
- [ ] Edits reflected in all export formats

### US-9: Audience selection for export

**As a** tutorial author,
**I want to** choose the target audience when exporting,
**So that** the same recording produces appropriate prose for end users, developers, or QA.

**Acceptance Criteria:**
- [ ] Export dialog offers audience selection: End User, Developer, QA Engineer
- [ ] End User export uses `auto_description_user` - friendly, outcome-focused
- [ ] Developer export uses `auto_description_technical` - API calls, status codes, redirects
- [ ] QA export uses `auto_description_qa` - verification criteria, timing requirements
- [ ] Audience selection stored in `renderer_hints.tutorial.audience`

---

## Technical Approach

### LLM Cache Generation

At session end, the MCP server triggers a single LLM call with the full session context (all steps). Batch generation produces better results than per-step generation because the LLM sees the full narrative arc.

**Input to LLM per step:**
- `target.aria.label` - element's accessible name
- `target.aria.role` - element type
- `target.component.name` - React/Vue/Angular component
- `context.nearest_heading` - section heading closest in DOM hierarchy
- `context.dialog` - dialog title and role (if inside a dialog)
- `context.form` - form label (if inside a form)
- `context.url` - current page URL
- `post_delta.network.requests_triggered` - API calls fired after action
- `post_delta.navigation` - page change triggered
- `pre_state.console.errors` - errors present during step (with `correlatedRefs`)
- `annotation.intent` - human's stated purpose

**Output per step:**
- `auto_title` - 3-8 word step title
- `auto_description_user` - 1-3 sentences, friendly tone, bold element names
- `auto_description_technical` - 1-2 sentences, API-focused
- `auto_description_qa` - 1 sentence, verification-focused
- `inferred_section` - section heading for grouping

### Section Grouping Algorithm

1. Collect all `context.nearest_heading` and `context.landmark` values across steps
2. Group consecutive steps that share the same heading or landmark
3. For steps without a clear heading, use `context.form` label or `context.url` path segment
4. LLM synthesizes section titles from the grouped context
5. Store in `llm_cache.inferred_section` per step

### Prerequisite and Context Inference

The LLM reads the full session and writes a "Before you start" section by inferring:
- Login state (session starts on authenticated page)
- Permission requirements (target element inside role-gated component)
- Environment prerequisites (specific URL patterns, API availability)

All inferred from captured data - no additional user input required.

### Export Renderer Architecture

Each export format is a renderer that consumes the session schema:

```
session.json -> Tutorial Renderer -> HTML / Markdown / PDF
                     |
                     +-- Reads: llm_cache, context, target.aria, annotation.intent
                     +-- Groups by: llm_cache.inferred_section
                     +-- Embeds: pre_state.screenshot_highlight
                     +-- Adapts: renderer_hints.tutorial.audience
```

Renderers are pure functions: `(session, options) -> output`. No DOM re-query. No LLM re-call (unless `llm_cache` is null).

### Localization Scaffold

The LLM knows which strings came from the DOM (`target.aria.label`, dialog titles, field names) versus which it authored. It generates a localization-ready version with substitution slots for UI strings, giving translators clean separation between interface text and narrative prose.

---

## Pitfalls and Mitigations

### Pitfall 1: LLM hallucination in prose generation

**Cause:** LLMs may invent UI behavior not present in the captured data (e.g., describing a confirmation dialog that doesn't exist).

**Mitigation:** The LLM prompt is constrained to only reference data present in the step schema. The `post_delta` field provides ground truth about what actually happened after the action. If `post_delta.navigation.occurred` is false, the LLM cannot write "you'll be redirected." Structured DOM context reduces hallucination surface by providing factual constraints.

### Pitfall 2: Section grouping quality depends on heading structure

**Cause:** Pages with poor heading hierarchy (no `<h2>`, no landmarks) produce flat or meaningless section groups.

**Mitigation:** Fall back to `context.url` path segments and `context.form` labels when headings are absent. The LLM can infer section boundaries from action type patterns (e.g., a sequence of `fill` actions on the same form = one section). Allow manual section heading override in the session viewer.

### Pitfall 3: Screenshot timing with animations

**Cause:** Screenshots captured mid-animation show transitional states that confuse tutorial readers.

**Mitigation:** Inherited from v1.1 - the recorder delays screenshot capture until `animationend` fires (max 1000ms). The `pre_state.animation_state` field indicates whether the screenshot was delayed. Tutorial renderer can add a note: "The element may animate briefly before settling."

### Pitfall 4: LLM cache invalidation complexity

**Cause:** When a user edits an annotation after session end, the cached LLM output becomes stale.

**Mitigation:** Invalidation is simple: set `llm_cache: null` when `annotation` or `target.aria` fields change. Re-generation is lazy - triggered when a renderer needs the cache and finds it null. This avoids unnecessary LLM calls during editing sessions.

### Pitfall 5: Large session batch generation cost

**Cause:** A 50-step session sent to the LLM in one batch may exceed context limits or be expensive.

**Mitigation:** Batch in chunks of 20 steps with overlapping context (last 2 steps of previous chunk included for narrative continuity). Total cost for a 50-step session: ~3 LLM calls. Cache results immediately to avoid re-generation.

### Pitfall 6: Audience-inappropriate tone leakage

**Cause:** The LLM may mix technical jargon into end-user descriptions or oversimplify developer descriptions.

**Mitigation:** Separate system prompts per audience with explicit tone constraints. End-user prompt: "Never mention HTTP status codes, API endpoints, or CSS selectors." Developer prompt: "Always include the HTTP method, endpoint, and expected status code."

---

## Non-Functional Requirements

### Performance
- LLM cache generation: < 30 seconds for a 20-step session (batch call)
- HTML export generation: < 2 seconds
- Markdown export generation: < 500ms
- PDF export generation: < 5 seconds

### Quality
- Auto-generated prose must be factually grounded in captured data (no hallucinated UI behavior)
- Section grouping must produce 2-8 sections for a typical 10-20 step tutorial
- Audience adaptation must produce measurably different tone per audience (no copy-paste between variants)

### Token Efficiency
- LLM cache generation: < 15,000 input tokens for a 20-step session
- Renderer reads: zero LLM calls (all from cache)
- Cache invalidation: per-step, not per-session (only regenerate affected steps)

### Compatibility
- HTML export: renders correctly in Chrome, Firefox, Safari, Edge
- Markdown export: compatible with GitHub Flavored Markdown, Notion import, Confluence wiki
- PDF export: A4 and Letter page sizes

---

## Out of Scope (v1.2)

- Shareable public tutorial links (v1.3)
- Direct Confluence/Notion publish integration (v1.3)
- Staleness detection and agent-maintained documentation (v1.3)
- Embeddable onboarding widget (v2.0)
- Full decision tree / branching tutorials (v2.0+)
- Video embedding in tutorials (never - wrong medium)
- Real-time collaborative editing (never - single-author workflow)
- Localization automation (future - scaffold only in v1.2)

---

## Research Citations

- ViewGraph Future Directions v2, Part 4: The Tutorial Designer
- ViewGraph Future Directions v2, Part 4.3: The LLM Advantage Layer
- ViewGraph Future Directions v2, Part 4.4: Export Formats
- ViewGraph Future Directions v2, Part 7: Session Schema Specification (llm_cache, renderer_hints.tutorial)
- ViewGraph Future Directions v2, Part 11.2: Scribe/Tango architecture analysis
- ViewGraph Future Directions v2, Part 11.3: WalkMe/Appcues architecture analysis
- ViewGraph Future Directions v2, Part 11.6: Build/Skip decisions (section grouping, screenshot annotation, voice-to-text)
- ViewGraph Future Directions v2, Part 11.10: Glyde pattern analysis
