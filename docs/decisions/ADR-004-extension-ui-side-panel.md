# ADR-004: Extension UI - Slide-Out Panel Design

**Date:** 2026-04-08

**Status:** Accepted

**Deciders:** Project team

---

## Context

The extension needs a UI that supports multiple workflows:

1. Quick capture (one click, done)
2. Browse capture history for the current project
3. Annotate elements on the page
4. Review existing annotations
5. Trigger HTML snapshot (SingleFile)
6. See project context (name, server status)

A basic popup dropdown (300x400px) is too small for annotation lists and
history browsing. A full sidebar panel (like Web Highlights) is too heavy
and steals screen real estate permanently. We need something in between.

## Decision

Use a **slide-out side panel** that opens from the right edge of the
browser window. It overlays the page (does not resize it), can be
dismissed with Escape or clicking outside, and remembers its open/closed
state per session.

### Why side panel over popup dropdown

| Factor | Popup dropdown | Side panel |
|---|---|---|
| Width | Fixed ~300px | 320-380px, feels spacious |
| Height | Limited ~500px | Full viewport height |
| Persistence | Closes on any outside click | Stays open while working |
| Annotation list | Cramped, scrolls fast | Room for 10+ items |
| History list | 3-4 items visible | 8-10 items visible |
| Page interaction | Popup closes when you click page | Panel stays open |
| Annotation click-to-highlight | Impossible (popup closes) | Works perfectly |

The killer reason: **annotations require clicking between the panel and
the page**. A popup closes the moment you click the page. A side panel
stays open, letting you click an annotation in the list and see it
highlighted on the page.

---

## Panel Layout

### Structure (top to bottom)

```
┌─────────────────────────────────┐
│ ViewGraph          [project] [x]│  <- Header: logo, project name, close
├─────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ Cap │ │ Ann │ │ Hist│        │  <- Tab bar: Capture, Annotations, History
│ └─────┘ └─────┘ └─────┘        │
├─────────────────────────────────┤
│                                 │
│  [Tab content area]             │  <- Scrollable content
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ 📷  📝  📸  ⚙                  │  <- Action bar: capture, annotate,
└─────────────────────────────────┘     snapshot, settings
```

### Header

- ViewGraph logo/wordmark (small)
- Project name (detected from `.viewgraphrc.json` or URL hostname)
- Server status indicator (green dot = connected, grey = offline)
- Close button (X)

### Tab bar (3 tabs)

#### Tab 1: Capture (default)

The primary action screen. Minimal, focused.

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │    📷 Capture Page      │    │  <- Primary action button
│  └─────────────────────────┘    │
│                                 │
│  Status: Ready                  │
│  Server: Connected (9876)       │
│  Last: 2 min ago (208 elements) │
│                                 │
│  ─ Quick Stats ──────────────   │
│  Elements: 208                  │
│  TestIDs: 37/38 (97%)           │
│  A11y issues: 3                 │
│                                 │
└─────────────────────────────────┘
```

After capture, the status area updates with results. Quick stats show
a summary of the last capture so the user knows what the agent will see.

#### Tab 2: Annotations

List of annotations on the current page. Each item is clickable.

```
┌─────────────────────────────────┐
│  Annotations (3)        [+ New] │
│                                 │
│  ┌─ 1 ─────────────────────┐   │
│  │ 🟠 button:submit-form   │   │
│  │ "Should open confirm    │   │
│  │  dialog, not navigate"  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─ 2 ─────────────────────┐   │
│  │ 🟢 table:task-list      │   │
│  │ "Pagination missing"    │   │
│  │ RESOLVED                │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─ 3 ─────────────────────┐   │
│  │ ⚪ nav:main-menu        │   │
│  │ "2 items removed"       │   │
│  │ STALE                   │   │
│  └─────────────────────────┘   │
│                                 │
│  [Include in capture]           │
└─────────────────────────────────┘
```

**Click behavior:** Clicking an annotation card:
1. Scrolls the page to the element
2. Highlights it with a colored border matching the status
3. Shows a floating tooltip with the comment near the element
4. The card in the panel gets a selected state (left border accent)

**Status colors:** Same as annotation lifecycle design:
- 🟠 Orange: open (issue still present)
- 🟢 Green: resolved (issue fixed)
- ⚪ Grey: stale (element not found)

**"+ New" button:** Enters annotation mode. User clicks an element on
the page, a comment box appears, they type and save. The annotation
appears in the list immediately.

#### Tab 3: History

Recent captures for this URL/project. Shows last 10.

```
┌─────────────────────────────────┐
│  History (localhost:5173)       │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Today 7:06 PM           │   │
│  │ 208 elements | 155KB    │   │
│  │ 37 testids | 3 a11y     │   │
│  │ [View] [Compare]        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Today 6:45 PM           │   │
│  │ 205 elements | 148KB    │   │
│  │ 35 testids | 5 a11y     │   │
│  │ [View] [Compare]        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Yesterday 4:30 PM       │   │
│  │ 201 elements | 142KB    │   │
│  │ [View] [Compare]        │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**"View"** opens the capture JSON in a new tab (formatted).
**"Compare"** selects this capture as the "before" for a diff. User then
captures again or selects another history item as "after." The diff
result shows in the panel.

### Action bar (bottom toolbar)

Persistent across all tabs. Icon buttons for quick actions.

```
┌─────────────────────────────────┐
│ 📷   📝   📸   ⚙               │
│ Cap  Note Snap  Set             │
└─────────────────────────────────┘
```

| Icon | Action | Description |
|---|---|---|
| 📷 | Capture | Quick capture (same as Capture tab button) |
| 📝 | Annotate | Enter annotation mode (click elements to comment) |
| 📸 | Snapshot | SingleFile HTML snapshot (opt-in per ADR-003) |
| ⚙ | Settings | Open settings (server URL, capture preferences) |

The action bar means the user can trigger any action from any tab
without switching. Capture while browsing history. Annotate while
viewing capture stats.

---

## User Journeys

### Journey 1: Quick capture

1. User clicks ViewGraph icon in toolbar
2. Panel slides open on Capture tab
3. User clicks "Capture Page"
4. Status shows "Capturing..." then "208 elements captured"
5. Quick stats update
6. User closes panel or keeps working

**Time: 3 seconds.** Panel stays open so they can capture again after
making changes.

### Journey 2: QA annotation

1. User clicks ViewGraph icon, panel opens
2. User clicks 📝 (Annotate) in action bar or switches to Annotations tab
3. User clicks "+ New" or the annotate icon
4. Page enters annotation mode (cursor changes, elements highlight on hover)
5. User clicks a broken button on the page
6. Floating comment box appears near the element
7. User types "Should open confirmation dialog"
8. User clicks Save
9. Annotation appears in the panel list with orange status
10. User repeats for more elements
11. User clicks "Include in capture" to bundle annotations with next capture

### Journey 3: Review annotations after fix

1. Developer opens the page after fixing issues
2. Clicks ViewGraph icon, panel opens to Annotations tab
3. Sees 3 annotations: 2 now green (resolved), 1 still orange
4. Clicks the orange annotation
5. Page scrolls to the element, highlights it
6. Developer sees what's still broken, fixes it
7. Reloads page - annotation auto-re-validates, turns green

### Journey 4: Compare captures

1. User opens History tab, sees 3 recent captures
2. Clicks "Compare" on yesterday's capture
3. Panel shows "Select capture to compare against"
4. User clicks "Capture Page" to capture current state
5. Panel shows diff: "+3 elements, -1 testid, 2 layout shifts"

### Journey 5: HTML snapshot for QA handoff

1. User clicks 📸 (Snapshot) in action bar
2. Status shows "Saving HTML snapshot..."
3. Both JSON + HTML files are saved
4. User shares the HTML file with QA team

---

## Implementation

### Chrome Side Panel API

Chrome has a native [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
(MV3). This is the right approach:

```javascript
// manifest.json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel"]
}
```

The side panel:
- Opens from the right edge
- Has full viewport height
- Persists across page navigations within the same tab
- Does not close when the user clicks the page
- Can communicate with content scripts and background worker

### Firefox equivalent

Firefox does not have the Side Panel API. For Firefox, we use
`sidebar_action` which provides similar functionality:

```javascript
// manifest.json (Firefox)
{
  "sidebar_action": {
    "default_panel": "sidepanel.html",
    "default_title": "ViewGraph"
  }
}
```

WXT can handle the cross-browser difference in the build config.

### Panel dimensions

- Width: 340px (fixed, does not resize page)
- Height: full viewport
- Background: dark theme matching the popup design (#1a1a2e)

### State management

- Panel state (open/closed, active tab) stored in `chrome.storage.session`
- Annotations stored in `chrome.storage.local` (persists across sessions)
- Capture history stored in `chrome.storage.local` (last 10 per URL)
- Server connection status checked on panel open via `GET /health`

---

## Alternatives Considered

### 1. Popup dropdown (current implementation)

Too small for annotation lists. Closes on outside click, making
annotation-to-page interaction impossible. Fine for quick capture only,
but we've outgrown it.

### 2. Full sidebar (Web Highlights style)

Web Highlights uses a permanent sidebar with tabs (Notebook, Reader,
Chat) and a bottom toolbar. This is too heavy:
- Always visible, steals screen space
- Too many features crammed in (AI chat, reader mode, bookmarks)
- Overwhelming for a focused tool

### 3. DevTools panel

Good for power users but invisible to casual users. QA team members
won't think to open DevTools to annotate. DevTools panel is better
suited for the inspector/debug workflow (M5), not the primary UI.

### 4. Floating widget on page

A small floating button that expands into a panel overlaid on the page.
This conflicts with page content, can be blocked by CSP, and feels
"bolted on." The browser's native side panel is cleaner.

## Consequences

### Positive

- Annotation click-to-highlight works (panel stays open)
- Room for history, annotations, and capture stats
- Native browser UI (side panel API) feels professional
- Action bar provides quick access from any tab
- Dark theme consistent with popup design

### Negative

- Requires `sidePanel` permission (Chrome) / `sidebar_action` (Firefox)
- More complex than a simple popup
- Cross-browser differences need WXT abstraction
- Panel width (340px) reduces visible page area

### Migration

The existing popup remains as a fallback for browsers that don't support
side panels. Clicking the extension icon opens the side panel if
available, falls back to popup if not.
