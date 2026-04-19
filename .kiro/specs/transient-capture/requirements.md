# F20: Transient UI State Capture - Requirements

## User Stories

### US-1: Toast notification accessibility
**As a** developer using ViewGraph with an AI agent,
**I want** the capture to flag toast notifications that lack aria-live regions,
**So that** my agent can fix the accessibility issue even though the toast disappeared before I captured.

**Acceptance criteria:**
- Toast elements (position:fixed/absolute, z-index > 100, lifespan < 30s) are detected
- Missing `aria-live`, `role="alert"`, or `role="status"` is flagged as a major issue
- The issue includes the toast's text content and selector for source linking
- Works even if the toast has already been removed from DOM at capture time

### US-2: Animation performance issues
**As a** developer,
**I want** the capture to detect animations using layout-triggering CSS properties,
**So that** my agent can suggest compositor-friendly alternatives (transform/opacity).

**Acceptance criteria:**
- Running animations are detected via `document.getAnimations()`
- Animations using `top`, `left`, `width`, `height`, `margin`, `padding` are flagged
- The issue includes the element selector, property name, and suggested alternative
- Only flags animations that are currently running or ran in the last 30 seconds

### US-3: Flash content detection
**As a** QA tester,
**I want** to know when elements appear and disappear too quickly to read,
**So that** I can report timing issues to the development team.

**Acceptance criteria:**
- Elements with lifespan < 500ms that contain visible text are flagged
- The issue includes the element's text content and exact lifespan in ms
- Severity is "warning" (may be intentional loading indicators)

### US-4: Mutation timeline in capture
**As a** developer reviewing a capture,
**I want** to see a timeline of what appeared/disappeared in the last 30 seconds,
**So that** I understand the dynamic context around the captured state.

**Acceptance criteria:**
- Timeline shows last 30 seconds of DOM additions/removals
- Each entry has: timestamp (relative to capture), action (added/removed), selector, text content
- Timeline is included in capture JSON as `transient.timeline`
- Inspect tab shows the timeline in a readable format

### US-5: Render thrashing detection
**As a** developer,
**I want** to know when the same element is being added/removed repeatedly,
**So that** my agent can identify and fix render loops or state oscillation.

**Acceptance criteria:**
- Elements added/removed 3+ times within 5 seconds are flagged as "rapid-reflow"
- The issue includes the selector and count of add/remove cycles
- Severity is "major" (indicates a bug, not intentional behavior)

## Non-Functional Requirements

### NFR-1: Performance
- MutationObserver callback: < 1ms per batch (no synchronous style computation in callback)
- Style capture for toast heuristic: < 5ms per element (only for matching elements)
- Analysis on capture: < 50ms total
- Memory: < 50KB for 30-second buffer (100 entries max)

### NFR-2: No false positives on ViewGraph UI
- All mutations from elements with `[data-vg-annotate]` attribute are excluded
- ViewGraph's own toasts, tooltips, and panels are never flagged

### NFR-3: Graceful degradation
- If `document.getAnimations()` is not available (older browsers), animation detection is skipped
- If MutationObserver is disconnected (tab backgrounded), buffer is cleared on resume
- Collector uses `safeCollect` wrapper for error isolation

## Out of Scope

- Full session replay (rrweb-style video reconstruction)
- Recording user interactions (clicks, scrolls, keyboard)
- Cross-page transient tracking (each capture is independent)
- Modifying or intercepting animations
- Network correlation (linking toasts to failed API calls) - deferred to Phase 3
