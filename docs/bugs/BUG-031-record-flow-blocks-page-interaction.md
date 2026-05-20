# BUG-031: Record Flow blocks page interaction - clicks intercepted by annotate mode

| Field | Value |
|-------|-------|
| **ID** | BUG-031 |
| **Severity** | High |
| **Status** | Fixed |
| **Reported** | 2026-05-16 |
| **Reporter** | Ben S. (external user) |
| **Fixed** | 2026-05-20 |
| **Branch** | `fix/bug-031-record-flow-blocks-clicks` |
| **GitHub** | [#1](https://github.com/sourjya/viewgraph/issues/1) |

## Description

When "Record Flow" is started from the Inspect tab, the user cannot interact with their web app. Clicks on page elements are intercepted by ViewGraph's annotate mode instead of passing through to the application. This makes the Record Flow feature unusable - the user needs to click links, buttons, and navigate their app to record a multi-step journey, but every click is captured by the annotation overlay.

**Expected behavior:** During Record Flow, clicks should pass through to the web app so the user can navigate normally. ViewGraph should only observe navigation events (pushState, popstate, hashchange, link clicks) without blocking them.

**Actual behavior:** Annotate mode's `onClick` handler in `annotate.js` calls `e.preventDefault()` and `e.stopPropagation()` on all page element clicks, preventing the user from interacting with their app.

## Reproduction Steps

1. Open any web app in the browser
2. Click the ViewGraph toolbar icon to open the sidebar
3. Go to the Inspect tab
4. Click "Start" next to "RECORD FLOW"
5. Try to click any link, button, or interactive element on the page
6. Observe: clicks are intercepted by ViewGraph's annotation overlay instead of reaching the app

## Root Cause

The sidebar opens with annotate mode active. When Record Flow starts (via `startSession()` + `startJourney()`), it does NOT disable annotate mode. The `journey-recorder.js` correctly listens for navigation events passively, but the annotate mode's click handler in `annotate.js` (line ~434) intercepts all clicks with:

```javascript
e.preventDefault();
e.stopPropagation();
```

This blocks the click from ever reaching the actual page elements. The journey recorder's own click listener (added with `{ capture: true }`) only observes link clicks for navigation detection - it doesn't need to block them. But annotate mode's handler fires first and kills the event.

## Fix Description

Added `resume()` function to `annotate.js` (inverse of existing `pause()`). When Record Flow starts, `pauseAnnotate()` removes all event listeners so clicks pass through to the web app. When recording stops, `resumeAnnotate()` re-adds the listeners so annotation mode works again. The `active` flag stays true throughout, preserving annotation state.

## Files Changed

- `extension/lib/annotate.js` - added `resume()` export that re-adds event listeners after `pause()`
- `extension/lib/sidebar/toggles.js` - imported `pause`/`resume`, call them in recBtn click handler
- `extension/tests/unit/bug031-record-flow-clicks.test.js` - 7 regression tests

## Regression Tests

- `(-) click listener is active when annotate starts` - confirms capture-phase listener blocks clicks
- `(+) clicks pass through after pause` - confirms recording allows interaction
- `(+) click listener is re-added after resume` - confirms annotation resumes after recording
- `(+) resume is no-op when not active` - edge case safety
- `(+) pause removes click listener` - verifies listener removal
- `(+) resume re-adds click listener` - verifies listener restoration
- `(+) isActive remains true during pause/resume cycle` - state preservation
