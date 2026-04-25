# Panic Capture - Instant Snapshot Mid-Action

## The Problem

Some bugs only appear during interaction - a dropdown flickers, a modal renders wrong for 500ms, a layout breaks during a drag operation, an error flashes and disappears. By the time you move your mouse to the ViewGraph icon and click, the moment is gone. The DOM has settled, the error has cleared, the transient state has vanished.

The Page Activity collector (F20) catches some of this passively, but it's a 30-second buffer of mutations - it doesn't capture the full DOM state at the exact moment something goes wrong.

## The Vision

A keyboard shortcut that instantly captures everything - DOM snapshot, screenshot, console errors, network state - without moving the mouse or changing focus. One keystroke, mid-action, while the bug is visible on screen.

```
User is dragging an element → layout breaks → hits Ctrl+Shift+V
→ DOM captured, screenshot taken, console errors frozen, network state saved
→ Small toast: "Snapshot saved" (disappears in 1s)
→ User continues working, opens sidebar later to annotate the snapshot
```

## Keyboard Shortcut

**`Ctrl+Shift+V`** (Windows/Linux) / **`Cmd+Shift+V`** (macOS)

Why this combo:
- `V` for ViewGraph (memorable)
- `Ctrl+Shift` prefix avoids conflicts with common shortcuts
- Works even when the sidebar is collapsed or closed
- Doesn't require the mouse (critical for mid-drag captures)

Fallback if `Ctrl+Shift+V` conflicts with paste-without-formatting in some apps: `Ctrl+Shift+.` (period).

## What Gets Captured

Everything the normal capture gets, plus extras specific to transient state:

| Data | Source | Why it matters mid-action |
|---|---|---|
| Full DOM tree | Traverser | The structural state at the exact moment |
| Screenshot | `chrome.tabs.captureVisibleTab` | Visual proof of the transient bug |
| Console errors | Console interceptor buffer | Errors that appeared during the interaction |
| Network failures | Performance API | Failed API calls that caused the UI break |
| Transient mutations | Mutation buffer (F20) | What changed in the last 30 seconds |
| Mouse position | `event.clientX/Y` at capture time | Where the user was interacting |
| Active element | `document.activeElement` | What had focus (useful for keyboard/focus bugs) |
| Scroll position | `window.scrollX/Y` | Viewport state at capture time |

The capture metadata includes `captureMode: 'panic'` so the agent knows this was a mid-action snapshot, not a deliberate review capture.

## Visual Feedback

The feedback must be instant and non-disruptive - the user is mid-action and can't afford UI interference:

1. **Screen flash** - brief white overlay (50ms, 10% opacity) like a camera shutter. Confirms the capture happened without blocking interaction.
2. **Corner toast** - small "Snapshot saved" text in the bottom-left corner (not near the sidebar). Fades after 1.5s. No click target, no interaction needed.
3. **Strip badge pulse** - if the collapsed strip is visible, the count badge pulses once to indicate a new capture.

No modal, no sidebar open, no focus change. The user's interaction continues uninterrupted.

## How It Works

### Extension side

1. Content script registers a global `keydown` listener for the shortcut
2. On trigger: immediately capture DOM (traverser runs synchronously on the main thread)
3. Send `chrome.runtime.sendMessage({ type: 'panic-capture' })` to background script
4. Background script calls `chrome.tabs.captureVisibleTab()` for the screenshot
5. Background script pushes capture + screenshot to the server
6. Content script shows the flash + toast

The DOM traversal happens synchronously before any async operations, so the DOM state is frozen at the exact moment of the keystroke.

### Server side

No changes needed. The capture arrives via the normal `POST /captures` endpoint. The `captureMode: 'panic'` metadata lets the agent distinguish it from normal captures.

### Agent side

When the agent sees a panic capture (via `get_latest_capture` or `list_captures`), it knows:
- This was captured mid-action - the DOM may be in a transient state
- Console errors and network failures are especially relevant
- The screenshot shows what the user saw at that exact moment
- Mouse position and active element provide interaction context

## Relationship to Existing Features

| Feature | How panic capture differs |
|---|---|
| Normal capture (icon click) | Requires mouse movement, changes focus, DOM may settle before capture |
| Auto-capture (F10) | Fires on DOM mutations with 2s debounce - misses sub-second transients |
| Page Activity (F20) | Passive mutation log, not a full DOM snapshot |
| Record Flow | Multi-step journey recording, not instant single-frame capture |

Panic capture fills the gap: instant, full-state, mid-action, no UI disruption.

## Configuration

The shortcut is registered via the browser's extension commands API (`manifest.json`), which means users can customize it through the browser's built-in shortcut settings - no ViewGraph config needed:

- **Chrome**: `chrome://extensions/shortcuts`
- **Firefox**: `about:addons` → gear icon → Manage Extension Shortcuts

This is the standard browser pattern. Users who have conflicts with `Ctrl+Shift+V` (paste-without-formatting in some apps) can remap it to any combo they want through the browser UI.

### manifest.json entry

```json
{
  "commands": {
    "panic-capture": {
      "suggested_key": {
        "default": "Ctrl+Shift+V",
        "mac": "Command+Shift+V"
      },
      "description": "Instant snapshot - capture DOM + screenshot mid-action"
    }
  }
}
```

The browser handles the keystroke globally (even when the page has focus) and sends a `chrome.commands.onCommand` event to the background script. No content script keydown listener needed - the browser's command system is more reliable and doesn't interfere with page event handlers.

### Settings panel display

The sidebar Settings panel shows the current shortcut (read from `chrome.commands.getAll()`) with a link to the browser's shortcut settings page:

```
Panic capture: Ctrl+Shift+V  [Customize]
```

The "Customize" link opens `chrome://extensions/shortcuts` (Chrome) or the Firefox equivalent.

## Implementation Order

1. **Keyboard listener** in content script - register on `document_idle`, check for shortcut
2. **Panic capture handler** in background script - `captureVisibleTab` + push
3. **Visual feedback** - flash overlay + corner toast (no sidebar dependency)
4. **Metadata enrichment** - mouse position, active element, scroll position
5. **Agent guidance** - update steering doc with panic capture handling

## Edge Cases

| Scenario | Behavior |
|---|---|
| Sidebar is open | Capture still works - sidebar is excluded from DOM traversal (ATTR filter) |
| Sidebar is closed | Capture works - content script listener is always active |
| User is mid-drag | Capture fires, drag continues uninterrupted |
| Page has no ViewGraph | Shortcut does nothing (content script not injected) |
| Multiple rapid presses | Debounce: ignore presses within 2s of last capture |
| Screenshot fails (permissions) | Capture still saves without screenshot - DOM data is the priority |
