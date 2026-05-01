# Tutorial Distribution - Requirements

**Version:** v1.3
**Status:** Draft
**Depends on:** [Session Recorder (v1.1)](../session-recorder/requirements.md), [Tutorial Designer (v1.2)](../tutorial-designer/requirements.md)
**Research:** [ViewGraph Future Directions v2](../../../docs/references/viewgraph-future-directions-v2-from-annotated-bug-capture-to-multi-output-session-intelligence.md)

---

## Problem Statement

Tutorials produced by documentation tools (Scribe, Tango, Glyde) have a fundamental lifecycle problem: they are static artifacts that break silently when the UI changes. A button renamed from "Submit" to "Continue," a form field added to a registration flow, or a navigation restructure invalidates existing tutorials - but no tool detects this. The tutorial remains published with incorrect instructions until a human notices and manually re-records.

The consequences compound:
- **Support tickets increase** because users follow outdated instructions and get confused
- **Technical writers spend 30-40% of their time** maintaining existing tutorials rather than creating new ones
- **Onboarding completion rates drop** when tutorials reference UI elements that no longer exist
- **Trust erodes** when documentation is visibly wrong

No existing tool solves this because no existing tool stores semantic context alongside the tutorial. Screenshot-based tools store pixels. When the UI changes, the pixels are different - but the tool has no way to know which specific element changed or what the new correct instruction should be.

**The gap:** Living documentation that self-heals when the UI changes. When a button label changes from "Submit" to "Continue," the agent detects the drift, rewrites the affected step ("Click **Continue** to create your account"), and presents the change for human approval. No re-recording. No manual discovery of staleness.

---

## Justification

Tutorial Distribution is the "living documentation" capability that transforms ViewGraph tutorials from static exports into maintained artifacts. The competitive moat is absolute: no tool in the market can detect tutorial staleness and repair it automatically.

**Why this is possible for ViewGraph and impossible for competitors:**

1. **Semantic storage enables drift detection.** ViewGraph stores `target.aria.label: "Submit registration form"`, `target.locator: { strategy: "testId", value: "submit-registration" }`, and `target.component.name: "RegistrationForm"`. When the agent captures the same page later and finds the label changed to "Create account," it knows exactly which tutorial step drifted and what the new correct value is. Screenshot tools store pixels - they cannot diff semantically.

2. **The agent can rewrite, not just flag.** Because the session schema contains the full DOM context per step, the agent has everything it needs to regenerate the `llm_cache` for drifted steps. It produces a new `auto_description_user` that references the updated element. The human approves or rejects - no re-recording required.

3. **Structural fingerprint enables efficient drift detection.** The v3 `structuralFingerprint` (SHA-256 of sorted node topology) means the agent can detect whether a page changed at all before doing expensive per-element comparison. If the fingerprint matches, the tutorial is still valid. If it differs, the agent drills into which elements drifted.

4. **Distribution creates the feedback loop.** Shareable links with step-level deep-links mean support agents can link directly to the relevant step. Confluence/Notion publish means tutorials live where teams already work. The distribution layer makes tutorials discoverable and usable - which makes staleness detection valuable (you only care about drift in tutorials people actually read).

**Scribe comparison:** Scribe offers shareable links and Confluence export. But Scribe tutorials break silently on UI change. A Scribe tutorial published to Confluence today may be wrong tomorrow with no signal. ViewGraph tutorials published to Confluence flag drift and self-repair.

---

## User Stories

### US-1: Publish a shareable tutorial link

**As a** customer success manager,
**I want to** publish my tutorial as a shareable link with step-level deep-links,
**So that** I can link support tickets directly to the relevant step.

**Acceptance Criteria:**
- [ ] User can generate a shareable link from any completed tutorial session
- [ ] Link renders the tutorial HTML export in a hosted viewer
- [ ] URL supports step-level anchors: `{base-url}/tutorial/{session-id}#step-4`
- [ ] Deep-link scrolls directly to the referenced step and highlights it
- [ ] Link is accessible without authentication (public by default, with optional access control)
- [ ] Viewer is responsive (desktop, tablet, mobile)
- [ ] Link remains valid until explicitly revoked

### US-2: Publish directly to Confluence

**As a** technical writer,
**I want to** publish my tutorial directly to Confluence from ViewGraph,
**So that** I don't have to manually copy-paste Markdown and re-attach screenshots.

**Acceptance Criteria:**
- [ ] Integration with Confluence Cloud REST API (OAuth 2.0 authentication)
- [ ] User selects target space and parent page
- [ ] Tutorial content published as a Confluence page with proper heading hierarchy
- [ ] Screenshots uploaded as page attachments and embedded inline
- [ ] Section grouping reflected in Confluence heading structure
- [ ] Published page includes a metadata footer: "Generated by ViewGraph from session {id} on {date}"
- [ ] Re-publish updates the existing page (does not create duplicates)
- [ ] Supports Confluence Cloud; Data Center support deferred

### US-3: Publish directly to Notion

**As a** product manager,
**I want to** publish my tutorial directly to Notion,
**So that** our team documentation stays in our existing workspace.

**Acceptance Criteria:**
- [ ] Integration with Notion API (OAuth 2.0 authentication)
- [ ] User selects target database or parent page
- [ ] Tutorial content published as a Notion page with proper block structure
- [ ] Screenshots uploaded and embedded as image blocks
- [ ] Section grouping reflected in heading blocks
- [ ] Toggle blocks used for optional details (developer notes, QA criteria)
- [ ] Re-publish updates the existing page
- [ ] Published page includes a callout block with generation metadata

### US-4: Detect tutorial staleness via DOM drift

**As a** documentation maintainer,
**I want to** be notified when a published tutorial becomes stale because the UI changed,
**So that** I can update it before users encounter incorrect instructions.

**Acceptance Criteria:**
- [ ] Agent periodically captures the pages referenced in published tutorials
- [ ] Per-step comparison: `target.aria.label`, `target.locator`, `context.nearest_heading`, `context.url`
- [ ] If `structuralFingerprint` matches between tutorial capture and current capture, skip detailed comparison (page unchanged)
- [ ] If fingerprint differs, identify which specific steps have drifted elements
- [ ] Drift report includes: step number, what changed (old value -> new value), severity (label change vs element missing)
- [ ] Drift severity levels: `minor` (label/text change), `major` (element relocated), `critical` (element missing)
- [ ] Notification surfaced in the extension sidebar and via MCP tool response

### US-5: Agent-maintained documentation (auto-rewrite drifted steps)

**As a** technical writer,
**I want to** have the agent automatically rewrite tutorial steps that drifted,
**So that** I only need to approve changes rather than re-record entire tutorials.

**Acceptance Criteria:**
- [ ] When drift is detected, the agent regenerates `llm_cache` for affected steps using new DOM context
- [ ] Agent produces a diff: old description vs new description, old screenshot vs new screenshot
- [ ] Human reviews and approves/rejects each rewritten step
- [ ] Approved rewrites update the session.json and trigger re-publish to connected platforms
- [ ] Rejected rewrites are logged with reason (for future LLM improvement)
- [ ] If an element is completely missing (critical drift), the agent flags for manual re-recording of that step
- [ ] Change history maintained: `changes_since_version` field in session manifest

### US-6: Tutorial completion webhook

**As a** customer success team lead,
**I want to** receive a webhook when a user completes a tutorial via the shareable link,
**So that** I can update CRM records and close support tickets automatically.

**Acceptance Criteria:**
- [ ] Embeddable viewer emits `viewer_events`: `{ step_id, event: "viewed" | "completed" | "skipped", timestamp }`
- [ ] Configurable webhook URL fires on tutorial completion (last step viewed)
- [ ] Webhook payload includes: session_id, completion_timestamp, steps_viewed, steps_skipped
- [ ] Webhook URL configured per-tutorial in the publish settings
- [ ] No ViewGraph backend required - webhook fires from the client-side viewer
- [ ] Events compatible with PostHog, Amplitude, Mixpanel event schemas

### US-7: Version history and diff export

**As a** documentation maintainer,
**I want to** see what changed between tutorial versions,
**So that** I can communicate updates to stakeholders.

**Acceptance Criteria:**
- [ ] Each re-publish increments a version counter on the session
- [ ] Diff view shows: added steps, removed steps, modified descriptions, updated screenshots
- [ ] Diff exportable as Markdown ("What changed in v3 of this tutorial")
- [ ] `changes_since_version` field populated by staleness detection agent
- [ ] Version history accessible in the session viewer sidebar

---

## Technical Approach

### Staleness Detection Architecture

Staleness detection is the core technical challenge of v1.3. The approach leverages v3 format features:

```
Published Tutorial (session.json)
         |
         v
Agent captures current page state (periodic or on-demand)
         |
         v
Compare structuralFingerprint (fast path)
  - Match: tutorial is still valid, skip
  - Mismatch: drill into per-element comparison
         |
         v
Per-step element comparison:
  - Resolve target.locator against current DOM
  - Compare target.aria.label (old vs current)
  - Compare context.nearest_heading
  - Compare context.url path
  - Check if element exists at all
         |
         v
Drift Report:
  - List of drifted steps with old/new values
  - Severity classification per step
  - Agent rewrites llm_cache for drifted steps
         |
         v
Human Review:
  - Approve/reject per-step rewrites
  - Approved changes -> re-publish
```

**Fingerprint as fast-path gate:** The `structuralFingerprint` comparison is O(1) - a single string comparison. If the page hasn't changed structurally, no per-element work is needed. This makes periodic staleness checks cheap (one capture + one comparison per tutorial page).

**Element re-location strategy:** When checking if a tutorial step's target still exists, use the same three-tier fallback as the v3 actionManifest locator:
1. `document.querySelector('[data-testid="submit-registration"]')` (testId)
2. `document.querySelector('[aria-label="Submit registration form"]')` (ARIA)
3. Role-based matching via accessibility tree query

If all three fail, the element is missing (critical drift).

### Confluence/Notion Integration

Both integrations follow the same adapter pattern:

```
session.json -> Platform Adapter -> Platform API
                     |
                     +-- Authenticate (OAuth 2.0 flow)
                     +-- Map sections to platform heading structure
                     +-- Upload screenshots as attachments/blocks
                     +-- Create or update page
                     +-- Store platform page ID in session metadata for re-publish
```

**Confluence adapter:**
- Uses Confluence Cloud REST API v2
- Creates page with Atlassian Document Format (ADF) body
- Screenshots uploaded via `/wiki/rest/api/content/{id}/child/attachment`
- Re-publish uses `PUT /wiki/api/v2/pages/{id}` with incremented version

**Notion adapter:**
- Uses Notion API (2022-06-28 version)
- Creates page with block children (heading, paragraph, image, callout, toggle)
- Screenshots uploaded via external URL or Notion file upload
- Re-publish patches existing blocks

### Shareable Link Architecture

The shareable link viewer is a static HTML application that reads from a published session JSON file:

```
{hosting-origin}/tutorial/{session-id}
         |
         v
Static HTML viewer (single-page app)
         |
         v
Fetches: {hosting-origin}/data/{session-id}/session.json
         |
         v
Renders step-by-step tutorial with navigation
         |
         v
Emits viewer_events to configured webhook
```

**Hosting options (user's choice):**
- GitHub Pages (free, public)
- Netlify/Vercel (free tier, custom domain)
- Self-hosted (any static file server)
- ViewGraph-hosted (future SaaS option, not in v1.3 scope)

The viewer is a single HTML file + the session JSON + screenshots directory. No backend required.

### Agent-Maintained Documentation Flow

```
1. Staleness detection identifies drifted steps
2. Agent reads current DOM context for drifted elements
3. Agent regenerates llm_cache for affected steps (new descriptions)
4. Agent captures new screenshot for affected steps
5. Agent produces diff: { step_id, field, old_value, new_value }
6. Diff presented to human in extension sidebar
7. Human approves/rejects per step
8. Approved changes written to session.json
9. Re-publish triggered to connected platforms (Confluence, Notion, shareable link)
```

The agent never publishes without human approval. This is a "propose and confirm" workflow, not autonomous publishing.

---

## Pitfalls and Mitigations

### Pitfall 1: False positive drift detection

**Cause:** Minor DOM changes (added analytics attributes, changed class names, reordered siblings) trigger drift alerts for steps that are still functionally correct.

**Mitigation:** Drift detection compares only semantically meaningful fields: `target.aria.label`, `target.aria.role`, `context.nearest_heading`, and element existence. CSS class changes, attribute additions, and sibling reordering are ignored. The `structuralFingerprint` fast-path filters out pages with no structural change at all.

### Pitfall 2: Element re-location failures on major redesigns

**Cause:** A major UI redesign moves elements to different pages, renames components, and restructures navigation. The three-tier locator fallback fails for all steps.

**Mitigation:** When >50% of steps in a tutorial show critical drift (element missing), flag the entire tutorial for re-recording rather than attempting per-step repair. The agent cannot meaningfully rewrite a tutorial when the underlying workflow has fundamentally changed. Surface this as: "This tutorial needs re-recording - the UI has changed significantly."

### Pitfall 3: Confluence/Notion API rate limits

**Cause:** Bulk re-publish of many tutorials after a major UI update may hit platform API rate limits.

**Mitigation:** Queue re-publish operations with exponential backoff. Process one tutorial at a time. Confluence Cloud allows 10 requests/second; Notion allows 3 requests/second. Batch screenshot uploads. Show progress in the extension sidebar.

### Pitfall 4: Shareable link security (unintended data exposure)

**Cause:** Session JSON files may contain internal URLs, component names, or redacted-but-present field structures that reveal application architecture.

**Mitigation:** The publish flow strips: `target.component.file_hint`, `pre_state.network` (internal API endpoints), `pre_state.console` (error messages), and `renderer_hints.playwright` (test implementation details). Only tutorial-relevant fields are included in the published JSON. A `publishSafeFields` allowlist controls what ships.

### Pitfall 5: Webhook reliability (client-side firing)

**Cause:** Client-side webhook firing from the tutorial viewer may be blocked by ad blockers, CORS policies, or network failures.

**Mitigation:** Use `navigator.sendBeacon()` for completion events (survives page close). Fall back to `fetch()` with `keepalive: true`. Accept that client-side event delivery is best-effort, not guaranteed. Document this limitation. For guaranteed delivery, recommend server-side proxy (future feature).

### Pitfall 6: Version conflict on concurrent edits

**Cause:** Two people approve different drift rewrites for the same tutorial simultaneously.

**Mitigation:** Optimistic locking via `updated_at` timestamp on session.json. If the file changed since the drift report was generated, re-run drift detection before applying approved changes. Last-write-wins with conflict notification.

---

## Non-Functional Requirements

### Performance
- Staleness check (fingerprint comparison): < 100ms per tutorial page
- Per-step drift comparison: < 500ms per step (DOM query + field comparison)
- Confluence publish: < 10 seconds for a 20-step tutorial (excluding screenshot upload)
- Notion publish: < 15 seconds for a 20-step tutorial
- Shareable link generation: < 2 seconds

### Reliability
- Staleness detection: zero false negatives (if an element is missing, it must be flagged)
- False positive rate for drift: < 10% (minor DOM changes should not trigger alerts)
- Re-publish is idempotent (publishing the same content twice produces the same result)
- Webhook delivery: best-effort with retry (3 attempts, exponential backoff)

### Security
- Published tutorial JSON stripped of internal implementation details
- OAuth tokens for Confluence/Notion stored securely (extension's `chrome.storage.local`, encrypted)
- Shareable links revocable (delete the published JSON to revoke)
- No PII in published tutorials (inherited from v1.1 capture-time masking)

### Scalability
- Support up to 100 published tutorials per project
- Staleness detection batch: check all tutorials in < 5 minutes
- Version history: retain last 20 versions per tutorial

---

## Out of Scope (v1.3)

- Embeddable in-app onboarding widget (v2.0)
- Real-time collaborative tutorial editing (never)
- ViewGraph-hosted SaaS for shareable links (future business decision)
- Automatic re-publish without human approval (never - humans approve all changes)
- Full analytics dashboard for tutorial engagement (never - emit events for external tools)
- Branching/conditional tutorials (v2.0+)
- Multi-language tutorial generation (future - localization scaffold only in v1.2)
- Confluence Data Center support (future - Cloud only in v1.3)

---

## Research Citations

- ViewGraph Future Directions v2, Part 4.4: Export Formats (shareable link, embeddable widget)
- ViewGraph Future Directions v2, Part 4.5: The Embeddable Onboarding Widget (element re-location strategy)
- ViewGraph Future Directions v2, Part 9: Roadmap (Phase 4 - v1.3)
- ViewGraph Future Directions v2, Part 11.6: Build decisions (shareable link with step highlight, tutorial completion webhook, locator stability)
- ViewGraph Future Directions v2, Part 11.7: Features by target segment (shareable link deep-links, "what changed" diff export)
- ViewGraph Future Directions v2, Part 6.2: The Moat (schema network effect, semantic capture architecture)
- ViewGraph Future Directions v2, Part 2.2: Why Now (staleness detection via DOM drift)
