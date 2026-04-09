# Unified Review Panel - Design

## Architecture Overview

```
Extension (Chrome)                    Server (Node.js)                  Kiro (MCP client)
┌──────────────────┐                 ┌──────────────────┐              ┌──────────────┐
│ Icon click →     │                 │ HTTP Receiver     │              │              │
│ Sidebar opens    │                 │  POST /captures   │              │ resolve_     │
│                  │                 │  POST /resolve    │◄─────────────│ annotation() │
│ Sidebar          │                 │  GET /requests    │              │              │
│  Timeline items  │─── push ───────►│                  │              │ get_review_  │
│  Request banner  │◄── poll ────────│ Indexer           │◄─────────────│ history()    │
│  Page notes      │                 │  (in-memory)      │              │              │
│  Capture button  │                 │                   │              │              │
│  Settings        │                 │                   │              │              │
└──────────────────┘                 └──────────────────┘              └──────────────┘
```

### Single source of truth: Capture JSON

No separate history store. All state lives in the capture JSON files. The server indexer
loads all captures into memory on startup and provides cross-capture queries. Resolution
state is stored in the annotation objects within each capture.

If audit trail is needed later, a write-only JSONL log can be added with zero query
responsibility. See ADR-007 for the full decision rationale.

## UI Design

### Extension Icon Behavior

Clicking the extension icon opens the sidebar directly on the page. No popup.

**Non-injectable pages** show a minimal fallback popup with a clear error:

| URL Pattern | Message |
|---|---|
| `chrome://` | "Chrome system pages can't be inspected. Navigate to a web page." |
| `chrome-extension://` | "Extension pages can't be inspected. Navigate to a web page." |
| `about:` | "Browser internal pages can't be inspected. Navigate to a web page." |
| `chrome.google.com/webstore` | "The Chrome Web Store can't be inspected. Navigate to a web page." |
| `file://` (no file access) | "Enable 'Allow access to file URLs' in extension settings to inspect local files." |
| `view-source:` | "Source view pages can't be inspected. Navigate to a web page." |
| `devtools://` | "DevTools pages can't be inspected. Navigate to a web page." |
| `data:` | "Data URLs can't be inspected. Navigate to a web page." |

Detection: check `tab.url` against these prefixes before attempting injection.

### Sidebar Layout

```
┌─ ViewGraph ──────────────── [×] ┐
│ ● Connected (9877)    [gear]    │
│                                  │
│ Open (4)                         │
│ 🔔 Kiro: capture /dashboard     │  <- request as timeline item
│    "Need the nav layout"         │
│    [Capture Now]                 │
│ #1 h1 "fix font" [CRIT] [v][x] │
│ #2 input "label"  [MAJ] [v][x] │
│ 📝 "spacing off"  [MAJ] [v][x] │
│                                  │
│ > Resolved (10)                  │  <- collapsed accordion
│                                  │
│ [Capture] [Note]                 │
│ [Send] [Copy MD] [Report]       │
│                                  │
│ > Settings                       │  <- collapsible
│   Server: localhost:9877         │
│   Project mappings...            │
│   Auth token: ****               │
└──────────────────────────────────┘
```

### Kiro Requests as Timeline Items

When Kiro calls `request_capture`, the request appears in the timeline with a
distinct bell icon (🔔), sorted chronologically with other items. Each request shows:

- **URL** Kiro wants captured
- **Guidance note** - what Kiro needs (e.g. "Need the nav layout after login")
- **[Capture Now]** button - captures current page and completes the request

Once captured, the request item transforms into a regular capture item (📸).
Expired requests show as dimmed with "Expired" label.

The `request_capture` MCP tool is extended with an optional `guidance` parameter:

```
request_capture(url, guidance?)
```

- `guidance` - brief instruction for the user (string, max 200 chars)
  e.g. "Navigate to the dashboard and capture the sidebar layout"
  e.g. "Capture the login page with validation errors showing"

This tells the user not just what URL to capture, but what state the page
should be in and what Kiro is looking for.

### Resolved Items Accordion

Resolved items move out of the main timeline into a collapsed accordion:

```
│ > Resolved (10)                  │  <- click to expand
```

Expanded:

```
│ v Resolved (10)                  │
│ check #3 "Fixed to 14px" - Kiro │
│ check #4 "Changed type" - Kiro  │
│ check #5 "Won't fix" - user     │
│ ...                              │
```

Rationale: keeps the working area focused on open items. Resolved items are
accessible but don't clutter the active workflow.

### Capture is Always Explicit

No auto-capture on sidebar open. The sidebar opens instantly with zero delay.
Capture is a manual user action via the Capture button in the footer.

Send behavior depends on whether a capture exists:
- **Send (no capture taken):** pushes annotations only (comments, severity, page notes)
- **Send (capture was taken):** pushes annotations bundled with the DOM snapshot

If Kiro needs DOM context and the user didn't capture, Kiro calls `request_capture`
and the notification banner appears. The user decides when to capture.

```
Open sidebar    -> instant, no capture, no delay
Annotate        -> click elements, add notes, set severity
Click Capture   -> user explicitly takes a DOM snapshot
Click Send      -> pushes whatever exists (annotations, and capture if taken)
Click Copy MD   -> exports annotations as markdown, no capture needed
Kiro needs DOM  -> calls request_capture, banner appears, user clicks Capture Now
```

## Data Model

### Annotation (extended)

```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "id": 1,
  "type": "element | page-note | capture",
  "comment": "fix font size",
  "severity": "critical | major | minor | ",
  "resolved": false,
  "resolution": null,
  "timestamp": "2026-04-09T12:41:00Z",
  "region": { "x": 100, "y": 200, "width": 300, "height": 40 },
  "ancestor": "h1.title",
  "nodeId": 42
}
```

### Resolution Object (fixed format)

```json
{
  "by": "kiro",
  "action": "fixed",
  "summary": "Changed font-size from 42px to 28px",
  "filesChanged": ["docs/demo/index.html"],
  "at": "2026-04-09T13:00:00Z"
}
```

Fields:
- `by` - who resolved (string, max 50 chars)
- `action` - enum: `fixed`, `wontfix`, `duplicate`, `invalid`
- `summary` - what was done (string, max 500 chars, plain text, no HTML)
- `filesChanged` - array of file paths modified (max 10 entries, max 200 chars each)
- `at` - ISO 8601 timestamp

Sanitization: strip HTML tags, enforce max lengths, validate `action` against enum.
Sidebar renders via `textContent` (XSS-safe). Markdown export escapes backticks and pipes.

### Capture JSON (extended)

```json
{
  "formatVersion": "2.2.0",
  "metadata": { ... },
  "nodes": [ ... ],
  "annotations": [
    { "uuid": "...", "type": "element", "resolved": false, ... },
    { "uuid": "...", "type": "page-note", "comment": "overall spacing is off", ... },
    { "uuid": "...", "type": "element", "resolved": true, "resolution": { ... }, ... }
  ]
}
```

## Key Design Decisions

### D1: Multiple captures of same page are separate items

Each capture is a snapshot in time. Even if the URL is the same, the DOM may have changed
(user fixed issues, different page state, different viewport). The timeline shows history.

Use cases:
- **Iterative fixing:** Capture, annotate, send, Kiro fixes, recapture to verify. Old and new
  captures are different DOM states - both valuable for comparison.
- **Different states:** Capture `/login` (empty form) vs `/login` (with validation errors).
  Same URL, different content.

The `compare_captures` MCP tool supports diffing two captures of the same page.
Users can delete old captures manually if they want to clean up.

### D2: Offline sync with last-write-wins

The extension stores annotation state in `chrome.storage`. When the server is available,
bidirectional sync occurs.

Conflict resolution: **last-write-wins by timestamp.**

```
Sidebar opens -> fetch capture JSON from server
  -> for each annotation:
    if server.resolvedAt > local.resolvedAt -> use server state
    if local.resolvedAt > server.resolvedAt -> push local state to server
    if neither resolved -> no conflict
```

Edge case: both sides resolve the same annotation with different notes while offline.
The later timestamp wins. The losing resolution is logged to console for debugging
but not preserved. This scenario is near-impossible in practice (requires Kiro and
user to resolve the exact same annotation during the exact same offline window).

Test cases required:
- Server resolved, extension not synced yet
- Extension resolved offline, server catches up on reconnect
- Both resolved with different notes (timestamp wins)
- Server unreachable (extension works with local state only)
- Server comes back after extended offline period

### D3: Page notes are general feedback

Page notes have no element reference by design. They represent holistic feedback:
"this page loads slowly", "overall layout feels cramped."

Kiro has the full DOM from the capture and can reason about the page holistically.
If Kiro needs more specificity, it asks the user in chat: "Which area feels cramped?
Can you annotate the specific element?"

No auto-request-capture. The conversation in Kiro is the right place to clarify.

### D4: UUID collision handling

`crypto.randomUUID()` v4 collision probability is 1 in 2^122. Server validates
uniqueness before accepting a resolve request.

If collision detected:
- Server returns `409 Conflict` with the existing annotation details
- Extension does NOT auto-reissue (indicates a bug, not a retry scenario)
- Collision logged to stderr for debugging
- In practice this will never fire

## New MCP Tools

### resolve_annotation

```
resolve_annotation(filename, annotation_uuid, action, summary, files_changed?)
```

- Reads the capture JSON from disk
- Finds the annotation by UUID (returns 404 if not found, 409 if UUID collision)
- Validates `action` against enum, enforces max lengths
- Sets `resolved: true`, writes `resolution` object
- Writes the updated JSON back to disk
- Returns the updated annotation

### get_unresolved

```
get_unresolved(filename?, limit?)
```

- If filename provided: returns unresolved annotations from that capture
- If no filename: scans all indexed captures for unresolved annotations
- Returns chronological list with capture filename, UUID, comment, severity
- Default limit: 50

## Security Considerations

- `resolve_annotation` validates filename against capturesDir (existing path validation)
- UUID must exist in the capture file - no creating new annotations via MCP
- Resolution fields sanitized: max lengths enforced, HTML stripped, action validated against enum
- `filesChanged` paths are informational only - not used for file operations
- Extension-to-server sync validates annotation UUIDs exist before accepting updates

## Backward Compatibility

- Existing captures without `uuid` or `type` fields continue to work
- All existing MCP tools unchanged - they read the same JSON format
- `get_annotations` returns the extended fields when present
- Old captures treated as `type: "element"` with auto-generated UUIDs on first read
- Format version bumped to 2.2.0 for captures with the new fields
