# ADR-014: Transient UI State Capture

- **Status**: Proposed
- **Date**: 2026-04-20

## Context

ViewGraph captures point-in-time DOM snapshots. This works well for static bugs (wrong color, missing label, broken layout) but fails for **bugs in motion** - issues that only manifest during state transitions:

- A toast notification flashes an error message and disappears in 3 seconds
- A dropdown menu animates open but clips behind a sibling element during the transition
- A loading spinner appears for 200ms (too fast to read) then vanishes
- A modal's entrance animation stutters because it animates `top` instead of `transform`
- A form validation error appears then immediately gets overwritten by another

Users see these bugs but can't capture them - by the time they click the ViewGraph icon, the transient element is gone. The agent receives a snapshot with no evidence of what happened.

## Decision

Add a **Transient UI State Collector** that continuously buffers DOM mutations and animation state, then analyzes the buffer on capture to produce structured, agent-actionable issue reports.

### Architecture

```
Sidebar opens → MutationObserver starts → ring buffer records mutations
                                        → toast heuristic captures styles on add
                                        → animation observer polls on significant events

User clicks Capture → collector analyzes buffer:
  1. Identify transient elements (added then removed within 30s)
  2. Flag accessibility issues (no aria-live on notifications)
  3. Flag animation performance issues (layout-triggering properties)
  4. Flag flash content (<500ms lifespan)
  5. Snapshot currently-running animations via Web Animations API
  
Capture JSON includes transient enrichment → agent acts on issues
```

### Frontend: Extension Collector

**File:** `extension/lib/collectors/transient-collector.js`

**Components:**

1. **Mutation Ring Buffer** (always active while sidebar is open)
   - Records last 30 seconds of DOM additions and removals
   - For each added element matching toast heuristic: captures computed styles immediately (before removal)
   - Toast heuristic: `position: fixed|absolute` AND `z-index > 100` AND not a ViewGraph element
   - Buffer size: max 100 entries, FIFO eviction
   - Filters out ViewGraph UI mutations (`[data-vg-annotate]`)

2. **Animation Snapshot** (on capture trigger)
   - Calls `document.getAnimations()` to get all running CSS/JS animations
   - For each: target element selector, animation name, duration, current progress, keyframes
   - Flags animations using layout-triggering properties (`top`, `left`, `width`, `height`) instead of `transform`/`opacity`

3. **Issue Analyzer** (on capture trigger)
   - Processes the mutation buffer to identify patterns:
     - **toast-no-aria-live**: Element appeared with toast heuristic but no `aria-live`, `role="alert"`, or `role="status"` on itself or ancestors
     - **flash-content**: Element lifespan < 500ms with visible text (too fast to read)
     - **animation-jank**: Running animation uses layout properties instead of compositor-friendly properties
     - **exit-animation-no-reduced-motion**: Exit animation detected without `prefers-reduced-motion` media query guard
     - **rapid-reflow**: Same element added/removed 3+ times within 5 seconds (render thrashing)

**Performance budget:**
- MutationObserver callback: < 1ms per batch (just push to buffer, no style computation)
- Toast heuristic style capture: < 5ms per element (only for position:fixed/absolute elements)
- Analysis on capture: < 50ms (processes buffer once)
- Memory: < 50KB for 30s buffer (selectors + timestamps + key styles)

**API:**
```js
import { startTransientObserver, stopTransientObserver, collectTransient } from './collectors/transient-collector.js';

// Called when sidebar opens
startTransientObserver();

// Called when sidebar closes
stopTransientObserver();

// Called during capture - returns enrichment data
const transient = collectTransient();
```

### Backend: MCP Server Integration

**No new MCP tools needed.** The transient data flows through existing infrastructure:

1. Capture JSON includes `transient` section in enrichment (same as network, console, etc.)
2. `get_capture` and `get_page_summary` expose it
3. `audit_accessibility` can reference transient issues (toast without aria-live)
4. Inspect tab shows "Transient" diagnostic section with Copy/Note buttons

**Data shape in capture JSON:**
```json
{
  "transient": {
    "issues": [
      {
        "type": "toast-no-aria-live",
        "severity": "major",
        "message": "Notification 'Payment failed' appeared without aria-live - screen readers won't announce it",
        "selector": "div.toast.error",
        "text": "Payment failed",
        "lifespan": 3300,
        "evidence": { "hasAriaLive": false, "hasRole": false, "position": "fixed", "zIndex": 9999 }
      }
    ],
    "timeline": [
      { "t": -28500, "action": "added", "selector": "div.toast.error", "text": "Payment failed" },
      { "t": -25200, "action": "removed", "selector": "div.toast.error", "lifespan": 3300 }
    ],
    "animations": [
      { "selector": "div.modal-backdrop", "name": "fadeIn", "duration": 300, "progress": 1.0, "properties": ["opacity"] }
    ],
    "summary": { "transientElements": 3, "issues": 1, "activeAnimations": 2 }
  }
}
```

Timeline timestamps are relative to capture time (negative = seconds before capture).

### Inspect Tab UI

New diagnostic section between existing sections:

```
⚡ Transient (2 issues, 3 elements observed)
  🔴 Toast "Payment failed" - no aria-live region [+] [📋]
  🟡 Dropdown animating with layout property (top → use transform) [+] [📋]
  
  Timeline (last 30s):
    -28.5s  div.toast.error appeared "Payment failed"
    -25.2s  div.toast.error removed (lived 3.3s)
    -12.0s  div.dropdown-menu appeared
```

### Why This Helps Capture Bugs in Motion

| Bug type | Current state | With transient collector |
|---|---|---|
| Toast without aria-live | Invisible - gone before capture | Flagged with selector + evidence |
| Animation using layout properties | Only visible during animation | Detected via Web Animations API |
| Flash content (<500ms) | User can't even describe it | Captured with text + lifespan |
| Render thrashing | Manifests as flicker, no evidence | Counted as rapid-reflow pattern |
| Exit animation without reduced-motion | Only visible during exit | Detected from animation keyframes |

The agent receives structured evidence it can act on:
- `find_source` on the selector → locates the component
- Issue type tells it exactly what to fix (add aria-live, change top to transform, etc.)
- No replay infrastructure needed - the pre-analyzed issues are self-contained

## Alternatives Considered

### Full session replay (rrweb-style)

**Rejected.** rrweb records everything for visual replay. This produces 50-200KB/min of data that requires replay infrastructure. ViewGraph's value is structured, agent-actionable data - not video replay. We take the useful parts (mutation buffer, animation detection) without the replay overhead.

### Periodic micro-snapshots (every 500ms)

**Rejected.** High performance cost (computing styles every 500ms), large data volume, and the agent still needs to diff snapshots to find issues. The mutation buffer approach is event-driven and only captures what actually changed.

### Video recording + vision LLM analysis (Decipher-style)

**Rejected for now.** Requires screen recording permissions, large file sizes, and vision model inference. May be a future enhancement but the structured approach gives agents more actionable data than pixel analysis.

### MutationObserver only (no animation detection)

**Partially accepted.** The mutation buffer is the core. Animation detection via `document.getAnimations()` is additive and low-cost (single API call on capture). Including it gives agents evidence about animation performance issues that mutations alone can't surface.

## Consequences

- New collector file: `extension/lib/collectors/transient-collector.js`
- New diagnostic section in Inspect tab: `extension/lib/sidebar/diagnostics.js` (add transient section)
- Enrichment data size increases by ~2-5KB per capture
- MutationObserver is already running (continuous-capture uses it) - this adds a parallel buffer with different retention/analysis logic
- No new MCP tools - data flows through existing `get_capture` / enrichment infrastructure
- No new permissions needed - all APIs (MutationObserver, Web Animations API) are available to content scripts

## Implementation Phases

### Phase 1: Mutation buffer + toast detection
- Ring buffer with 30s retention
- Toast heuristic (position:fixed + z-index > 100)
- Style capture on toast appearance
- `toast-no-aria-live` and `flash-content` issue detection
- Inspect tab "Transient" section

### Phase 2: Animation analysis
- `document.getAnimations()` snapshot on capture
- `animation-jank` detection (layout properties)
- `exit-animation-no-reduced-motion` detection
- Animation data in capture JSON

### Phase 3: Pattern detection
- `rapid-reflow` detection (same element added/removed 3+ times)
- Correlation with network failures (toast appeared after failed API call)
- Smart suggestions integration (clickable chips for transient issues)

## References

- [rrweb](https://github.com/rrweb-io/rrweb) - Session replay via MutationObserver + incremental snapshots
- [Decipher AI](https://getdecipher.com/blog/generating-rrwb-session-summaries) - LLM summarization of rrweb sessions for bug detection
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations) - `document.getAnimations()` for animation introspection
- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - DOM change detection
- ViewGraph existing infrastructure: `continuous-capture.js` (MutationObserver), `animation-collector.js` (basic animation detection)
