# Session Recorder - Requirements

**Version:** v1.1
**Status:** Draft
**Research:** [ViewGraph Future Directions v2](../../../docs/references/viewgraph-future-directions-v2-from-annotated-bug-capture-to-multi-output-session-intelligence.md)
**Schema Reference:** Future Directions Part 7 (Session Schema Specification)

---

## Problem Statement

AI coding agents can generate Playwright tests from source code, but they cannot generate tests from human testing intent. Manual testers click through applications daily, verifying behavior and discovering bugs - but this testing effort produces zero automated test coverage. The knowledge of "what should happen when I click Submit" lives in the tester's head and dies when the browser tab closes.

Existing tools fail to bridge this gap:

- **Playwright codegen** records CSS-selector-based action sequences with no intent, no assertions, and no path for non-technical users. Output: `click("div.btn-primary:nth-child(2)")` - a fragile selector with no "why."
- **Scribe / Tango** capture screenshots for documentation but produce no test artifacts, have no DOM semantics, and break silently when the UI changes.
- **Selenium IDE** is a legacy record-and-replay tool with the same selector brittleness as codegen.
- **Session replay tools** (FullStory, LogRocket) passively record everything but produce no actionable test output.

None of these tools capture the human's stated intent alongside the interaction. Without intent, no tool can generate meaningful test assertions. Without DOM semantics, no tool can generate stable selectors.

**The gap:** Non-technical testers produce real Playwright tests without knowing Playwright exists. No tool does this today.

---

## Justification

The Steps Recorder is ViewGraph's primary differentiator for v1.1. It transforms manual testing sessions into structured intent logs that an AI agent converts to parameterized Playwright tests with real assertions.

The competitive moat has three layers:

1. **Semantic capture architecture** - ViewGraph captures ARIA roles, component names, accessible names, network state, and console errors per step. An LLM given this context writes better assertions than one given a screenshot or a raw selector.
2. **v3 token efficiency** - A 20-step session in v2 inline mode costs ~2M tokens. In v3 file-backed + delta mode: ~25K tokens. This makes session recording economically viable.
3. **Schema network effect** - Once `session.json` files exist and renderers consume them, the format becomes the integration point. Switching costs compound with each renderer added.

The one-session, multiple-output architecture means a single recording produces artifacts for developers (Playwright tests), QA engineers (Jira test cases), technical writers (tutorials in v1.2), and product managers (structured bug reports) - without re-recording.

---

## User Stories

### US-1: Record a testing session

**As a** manual tester (technical or non-technical),
**I want to** record a step-by-step testing session with intent annotations,
**So that** my testing effort produces structured artifacts instead of disappearing when I close the browser.

**Acceptance Criteria:**
- [ ] User can activate "Record Session" from the extension sidebar
- [ ] Each user interaction (click, fill, navigate, select, keyboard) pauses recording and prompts for annotation
- [ ] Annotation prompt asks: "What did you intend here?" and "What do you expect to happen?"
- [ ] User can skip annotation (for developer path where LLM auto-generates from DOM context)
- [ ] Recording continues after annotation is confirmed
- [ ] Session is crash-safe: all completed steps persist even if the browser crashes mid-recording
- [ ] User can pause and resume recording without losing state
- [ ] User can stop recording to finalize the session

### US-2: Generate Playwright tests from a session

**As a** developer with an AI agent,
**I want to** convert a recorded session into a parameterized Playwright test,
**So that** my manual testing time becomes CI coverage without writing a single `expect()` call.

**Acceptance Criteria:**
- [ ] Agent receives the full session via MCP tool (`viewgraph_session_read`)
- [ ] Agent generates a Playwright test file with assertions derived from `annotation.expected_outcome`
- [ ] Generated selectors use the locator strategy hierarchy: testId > ARIA role > CSS
- [ ] A step annotated "clicked submit expecting form validation" produces `expect(page.getByRole('alert')).toBeVisible()` - not just `page.click()`
- [ ] Generated test includes `waitFor` strategies derived from `post_delta.navigation` and `post_delta.network`
- [ ] Output is a complete, runnable `.spec.ts` file saved to `.viewgraph/exports/{session-id}.playwright.ts`

### US-3: Export structured test cases for QA

**As a** QA engineer,
**I want to** export my recorded session as structured test cases for Jira or GitHub Issues,
**So that** I don't have to manually document test steps after testing.

**Acceptance Criteria:**
- [ ] Each step exports as a structured test case with: preconditions, numbered steps, expected result, screenshot evidence, priority
- [ ] Export format is Markdown compatible with Jira and GitHub Issues
- [ ] Test case IDs are auto-generated (`TC-001`, `TC-002`, etc.)
- [ ] Preconditions are derived from `renderer_hints.qa.preconditions` and session context
- [ ] Screenshots are attached as relative links
- [ ] Output saved to `.viewgraph/exports/{session-id}.jira.md`

### US-4: View and manage sessions in the sidebar

**As a** user who has recorded sessions,
**I want to** view, browse, and manage my recorded sessions in the extension sidebar,
**So that** I can review what was captured and trigger exports.

**Acceptance Criteria:**
- [ ] Session list shows: name, step count, duration, recording mode, status
- [ ] Clicking a session shows the step-by-step timeline with screenshots
- [ ] Each step shows: action type, target element, annotation, expected outcome
- [ ] User can delete individual steps (updates `sequence` ordinals)
- [ ] User can reorder steps via drag-and-drop
- [ ] User can edit annotations after recording
- [ ] User can trigger "Send to Agent" for the full session

### US-5: Multi-tab session continuity

**As a** tester recording a workflow that spans multiple tabs,
**I want to** continue my session across tab switches,
**So that** multi-tab workflows (e.g., email verification, OAuth redirects) are captured as one session.

**Acceptance Criteria:**
- [ ] Tab switches are recorded as navigation steps with `context.url` updated
- [ ] The session continues across `tabs.onActivated` events
- [ ] Cross-tab steps maintain correct `sequence` ordering
- [ ] The session viewer shows tab boundaries clearly

### US-6: Automatic PII masking

**As a** tester recording sessions that involve form input,
**I want to** have sensitive data automatically redacted at capture time,
**So that** session files committed to version control never contain plaintext PII.

**Acceptance Criteria:**
- [ ] Inputs with `type="password"` always store `action.value: "[redacted]"`
- [ ] Inputs with `autocomplete` values containing `cc-*`, `ssn`, or `password` are auto-redacted
- [ ] Values matching credit card patterns (Luhn check), SSN format, or email patterns are replaced with typed placeholders
- [ ] Redaction happens in the extension before the payload is sent to the MCP server
- [ ] `annotation.pii_redacted: true` and `annotation.redaction_reason` are set on redacted steps
- [ ] Screenshots of password fields are blurred automatically

### US-7: Pass/fail annotation during live testing

**As a** QA engineer executing a test session,
**I want to** mark each step as pass/fail/skip/blocked during recording,
**So that** the session becomes a test execution record, not just a capture.

**Acceptance Criteria:**
- [ ] After each step, the annotation prompt includes a result selector: pass, fail, skip, blocked
- [ ] For failed steps, the prompt asks for `actual_outcome` (what actually happened)
- [ ] The session viewer highlights divergence between `expected_outcome` and `actual_outcome`
- [ ] The QA export renderer handles `blocked` as a dependency note and `skip` as an excluded condition

---

## Session Schema

The session schema follows the specification in Part 7 of the Future Directions research. Key design principles:

1. **Output-agnostic core** - every field serves at least two renderers
2. **Append-safe** - individual steps are written as recorded; manifest updated last
3. **LLM-ready by default** - semantic context pre-packaged so renderers don't re-query DOM
4. **Screenshot-decoupled** - screenshots stored as files, referenced by relative path

### Top-Level Manifest

```jsonc
{
  "schema_version": "0.1.0",
  "id": "sess_{ULID}",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "status": "recording | complete | aborted",
  "recording_mode": "test_session | bug_report | tutorial | audit | regression_baseline",
  "name": "User-provided session name",
  "description": "Auto-generated or user-provided description",
  "tags": [],
  "project": { "name": "string", "base_url": "string" },
  "environment": { "browser": "string", "browser_version": "string", "viewport": {} },
  "steps": [],
  "summary": { "step_count": 0, "duration_ms": 0, "pages_visited": [], "errors_encountered": 0, "annotations_provided": 0 },
  "completed_by": { "type": "human | agent", "annotation_coverage": 0.0 }
}
```

### Step Object (Canonical)

Each step contains: `id`, `session_id`, `sequence`, `recorded_at`, `action` (type + value + modifiers), `target` (ref + selector + aria + component + bounding_box + locator + stability_hints), `context` (url + page_title + scroll_position + landmark + nearest_heading + dialog + form + cluster + frame), `annotation` (intent + expected_outcome + actual_outcome + result + notes + tags + pii_redacted + redaction_reason), `pre_state` (screenshot + screenshot_highlight + capture_id + network + console + animation_state), `post_delta` (navigation + dom_mutations + network + console), `llm_cache` (auto_title + auto_description_technical + auto_description_user + auto_description_qa + inferred_section + generated_at + model), `renderer_hints` (playwright + tutorial + qa).

Full schema: see Part 7.3 of the research document.

### Action Types

| Type | Value field | Notes |
|------|-------------|-------|
| `click` | null | Modifiers array for shift-click, ctrl-click |
| `fill` | Typed text (string) | Input/textarea fill |
| `navigate` | Target URL | Direct navigation not triggered by click |
| `scroll` | `{ direction, amount_px }` | Page or element scroll |
| `hover` | null | Mouse enter without click |
| `select` | Selected option value | `<select>` dropdown |
| `keyboard` | Key combo string | Keyboard shortcut |
| `drag` | `{ from_ref, to_ref }` | Drag and drop (semantic, not coordinate-based) |
| `focus` | null | Tab/click to focus |
| `blur` | null | Focus lost - captures form validation triggers |

---

## Technical Approach

### v3 Format Integration

The session recorder is built directly on top of v3 format capabilities:

1. **`actionManifest` as element resolver** - when the user clicks an element, the recorder reads the `@eN` ref from the pre-computed actionManifest. The step payload is assembled from the manifest entry (ARIA role, accessible name, component name, bounding box, locator strategy, stability hints). Cost: ~3 tokens per element lookup instead of a 300-line node tree scan.

2. **Delta capture for `post_delta`** - after each step, ViewGraph captures what changed using `captureMode: "delta"`. The delta provides `post_delta.dom_mutations` and `post_delta.network.requests_triggered`. For modal interactions: ~2,000 tokens. For form fills: ~500 tokens. Without delta mode, every step would require a full re-capture at ~25,000 tokens.

3. **`structuralFingerprint` for significance detection** - the fingerprint is a SHA-256 hash of sorted node topology. If consecutive captures share fingerprints, `dom_mutations.significant` is automatically `false` - no LLM reasoning required. Eliminates 200-500 tokens of agent inference per step.

4. **`observationDepth: "interactive-only"` during recording** - the recorder reads only the actionManifest to resolve each step's target. Full detail is captured in the background for `pre_state` but not streamed into agent context. Keeps live token cost near zero.

5. **Set-of-Marks screenshots** - the `marks` section produces annotated screenshots where `[N]` overlays correspond to `@eN` refs. Tutorial step illustrations are pre-annotated without post-processing.

6. **`checkpoint` envelope as agent-side mirror** - the v3 checkpoint records the agent's view of a session. The session schema records the human's view. They are complementary: when the agent generates a Playwright test, it embeds a checkpoint reference so failed test runs resume from the last verified step.

### Storage Architecture

```
.viewgraph/
  sessions/
    {session-id}/
      session.json          # Manifest + all steps inline
      screenshots/
        {step-id}.png       # Raw screenshot
        {step-id}_hl.png    # SoM-annotated screenshot
  exports/
    {session-id}.playwright.ts
    {session-id}.jira.md
```

**Write protocol:**
1. On session start: create directory, write `session.json` with `status: "recording"` and `steps: []`
2. On each step: append step object to steps array; write screenshots
3. On session end: update `status: "complete"`, write `summary`, trigger LLM cache generation
4. On crash/abort: update `status: "aborted"` - partial sessions are valid; all written steps persist

### MCP Tool Surface

Following the v3 research recommendation of minimal tool surface, session management folds into existing tools:

- `viewgraph_session_start` - begin recording (or fold into `viewgraph_capture` with `mode: "session"`)
- `viewgraph_session_read` - read session data (or fold into `viewgraph_read` with `section: "session"`)
- `viewgraph_session_end` - finalize session

### Extension Architecture

The extension's content script handles event capture. Communication path for CSP immunity:

```
content script -> chrome.runtime.sendMessage -> background service worker -> WebSocket -> MCP server
```

Event listeners use capture phase (`true` as third argument) to fire before application event handlers. Target resolution walks `composedPath()` to find the first semantically meaningful ancestor.

### SPA Navigation Handling

Patch the History API in the main world via `chrome.scripting.executeScript({ world: "MAIN" })`:

```javascript
const originalPushState = history.pushState.bind(history);
history.pushState = function(...args) {
  originalPushState(...args);
  recordNavigationStep(location.href);
};
window.addEventListener('popstate', () => recordNavigationStep(location.href));
```

---

## Pitfalls and Mitigations

From Part 11 of the research document - these are engineering problems that have caused failures in every existing recorder implementation.

### Pitfall 1: Dynamic ID selectors

**Cause:** React/Angular/Vue generate element IDs programmatically (`input_1647382930`). These change on every page load.

**Mitigation:** The `actionManifest` locator strategy hierarchy (testId > ARIA role > CSS) de-prioritizes dynamic IDs. The `selector_confidence` field flags when only a CSS selector was available (`"low"`). The Playwright generator produces `getByRole` and `getByTestId` locators, never the raw CSS selector.

### Pitfall 2: Shadow DOM opacity

**Cause:** Web components render inside shadow roots. `document.querySelector()` does not pierce shadow boundaries.

**Mitigation:** Implement recursive shadow-piercing query via `shadowRoot` chains. Only works for open-mode shadow roots. Flag closed-mode elements in `target.stability_hints` as `"shadow-closed"` so the Playwright generator uses Playwright's built-in shadow-piercing combinators.

### Pitfall 3: MutationObserver callback ordering

**Cause:** MutationObserver delivers batches asynchronously. Between user action and callback, DOM may be modified multiple times.

**Mitigation:** Debounced observer callback with 100ms delay after the last mutation record before capturing post-action state. Capture the delta 100ms after the last mutation, not immediately.

### Pitfall 4: Input value vs attribute

**Cause:** `inputElement.value` (property) reflects current state; `getAttribute('value')` reflects the HTML default.

**Mitigation:** For `fill` actions, always read from `inputElement.value` (property). For file inputs, store `action.value` as `"[file: redacted]"`.

### Pitfall 5: SPA navigation events

**Cause:** SPAs use History API (`pushState`, `replaceState`) - no `load` event fires.

**Mitigation:** Patch History API in main world context. Intercept `pushState`, `replaceState`, and `popstate` events.

### Pitfall 6: Cross-origin iframes

**Cause:** Same-Origin Policy prevents content script access to cross-origin iframe DOM.

**Mitigation:** Declare `all_frames: true` for same-origin subframes. For cross-origin frames: detect the boundary, annotate with `target.stability_hints: ["cross-origin-frame"]`, and note that this step requires manual Playwright implementation. Do not attempt to capture cross-origin frame interactions.

### Pitfall 7: CSP conflicts

**Cause:** Strict CSP headers can block WebSocket connections from content scripts.

**Mitigation:** Route all communication through the background service worker (CSP-immune). Path: `content script -> chrome.runtime.sendMessage -> background worker -> WebSocket -> MCP server`.

### Pitfall 8: Drag-and-drop recording

**Cause:** Raw mouse events are expensive and coordinate-dependent.

**Mitigation:** Record drag-and-drop as semantic operations using HTML5 Drag and Drop API events (`dragstart`, `dragend`, `drop`). Capture `action.type: "drag"` with `action.value: { from_ref, to_ref }` using `@eN` refs. Playwright generator emits `dragTo`.

### Pitfall 9: Canvas elements

**Cause:** Canvas content is not in the DOM - completely opaque to DOM-based capture.

**Mitigation:** When user clicks a `<canvas>` element, show a prompt explaining the limitation. Record with `target.tag: "canvas"`, `target.aria.role: null`. Playwright generator emits coordinate-based click with a comment noting manual verification required.

### Pitfall 10: PII capture in form fields

**Cause:** `action.value` for `fill` actions records whatever the user typed.

**Mitigation:** Three-layer approach: (1) Capture-time masking for password/cc/ssn fields, (2) Heuristic regex detection for patterns, (3) Manual "Redact this value" button in session viewer. Masking happens in the extension before payload leaves.

### Pitfall 11: Event listener contamination

**Cause:** Framework synthetic event systems (React, Angular zone.js) may transform events before they reach the DOM.

**Mitigation:** Walk `composedPath()` and select the first ancestor with a meaningful ARIA role, test ID, or accessible name. Use capture phase (`true`) to fire before application handlers.

### Pitfall 12: Animation and transition timing

**Cause:** CSS animations mean elements may not be in final state immediately after DOM mutation.

**Mitigation:** When active CSS animations detected on target (`getComputedStyle(el).animationName !== 'none'`), delay screenshot capture until `animationend` fires (max 1000ms timeout). Surface as `"screenshot-delayed-for-animation"` in `pre_state.animation_state`.

---

## Non-Functional Requirements

### Performance
- Step capture latency: < 50ms from user action to step payload assembled (excluding screenshot)
- Screenshot capture: < 200ms via `tabs.captureVisibleTab()`
- Session JSON write: < 10ms per step append (append-only, no full rewrite)
- Maximum session size: 200 steps (warn at 100, hard limit at 200)
- Session JSON file size: < 2MB excluding screenshots (warn at 1MB)

### Reliability
- Crash-safe: all completed steps persist even on browser crash
- No step lost except the in-progress one at crash time
- Graceful degradation: if delta capture fails, fall back to summary-only `post_delta`

### Token Efficiency
- Live recording context: ~400 tokens per step (interactive-only depth)
- Full session read by agent: < 50,000 tokens for a 20-step session
- Delta capture per step: < 2,000 tokens (modal), < 500 tokens (form fill)

### Security
- PII masking at capture time (before payload leaves extension)
- No plaintext passwords ever written to session.json
- Session files respect `.gitignore` recommendations (screenshots excluded, JSON tracked)

### Compatibility
- Chrome 116+ and Firefox 109+
- Works on pages with strict CSP (via background worker relay)
- Handles SPAs (React, Vue, Angular, Next.js, Nuxt, SvelteKit)
- Open-mode shadow DOM traversal
- Multi-tab continuity

---

## Out of Scope (v1.1)

These are explicitly deferred to later versions:

- Tutorial rendering and prose generation (v1.2)
- Onboarding widget / embeddable overlay (v2.0)
- Regression replay / baseline diffing (v2.0)
- Full decision tree / branching flows (v2.0+)
- Desktop application recording (never - architectural constraint)
- Video recording (never - wrong medium for structured output)
- Browser replay engine (never - Playwright tests ARE the replay)
- AI-generated test data (never - Playwright fixtures handle parameterization)
- Voice-to-text annotation (v1.2)
- Screenshot crop/annotation tools (v1.2)
- Analytics platform (never - emit events for external tools instead)

---

## Research Citations

- ViewGraph Future Directions v2, Part 3: The Annotated Steps Recorder
- ViewGraph Future Directions v2, Part 7: Session Schema Specification
- ViewGraph Future Directions v2, Part 8: Storage Architecture
- ViewGraph Future Directions v2, Part 9: Roadmap (Phase 2 - v1.1)
- ViewGraph Future Directions v2, Part 11: Deep Competitive Research (Pitfalls 1-12)
- ViewGraph v3 Agentic Enhancements Research: actionManifest, delta capture, structuralFingerprint, observationDepth, checkpoint envelope
- rrweb architecture analysis (Part 11.4): MutationObserver batching, input value vs attribute, DOM serialization patterns
- Playwright codegen analysis (Part 11.5): locator priority, self-healing selector market
- Scribe/Tango architecture analysis (Part 11.2): screenshot pipeline limitations, CSP failures, missed clicks
