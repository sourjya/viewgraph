# Unified Review Panel - Design

## Architecture Overview

```
Extension (Chrome)                    Server (Node.js)                  Kiro (MCP client)
┌──────────────────┐                 ┌──────────────────┐              ┌──────────────┐
│ Popup            │                 │ HTTP Receiver     │              │              │
│  [Review]        │                 │  POST /captures   │              │ resolve_     │
│                  │                 │  POST /resolve    │◄─────────────│ annotation() │
│ Sidebar          │                 │  GET /requests    │              │              │
│  Timeline items  │─── push ───────►│                  │              │ get_review_  │
│  Request banner  │◄── poll ────────│ History Store     │◄─────────────│ history()    │
│  Page notes      │                 │  .viewgraph/      │              │              │
│  Capture button  │                 │  history.db|jsonl │              │              │
└──────────────────┘                 └──────────────────┘              └──────────────┘
```

## UI Layout

### Popup (simplified)

```
┌─ ViewGraph ──────────┐
│                      │
│     [📝 Review]      │
│                      │
│ ● MCP connected      │
└──────────────────────┘
```

One button. One status. Capture is no longer a separate popup action.

### Sidebar (unified timeline)

```
┌─ Review (5 items) ─────────── [×] ┐
│                                    │
│ ┌ 🔔 Kiro wants /dashboard ─────┐ │  ← only when pending
│ │          [Capture Now]         │ │
│ └────────────────────────────────┘ │
│                                    │
│ 📸 Captured 2:41pm       [✓] [×]  │
│ 📝 "Spacing feels cramped"        │
│    [MAJOR]                [✓] [×]  │
│ #1 h1 "fix font size"             │
│    [CRITICAL]             [✓] [×]  │
│ #2 input "change label"           │
│    [MAJOR]                [✓] [×]  │
│ ✅ #3 resolved by Kiro            │  ← resolved item
│    "Fixed font to 14px"           │
│                                    │
│ [📸 Capture] [📝 Note]            │
│ [Send] [Copy MD] [Report]         │
│ ● MCP connected (9877)            │
└────────────────────────────────────┘
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
  "resolvedBy": null,
  "resolvedAt": null,
  "timestamp": "2026-04-09T12:41:00Z",
  "region": { "x": 100, "y": 200, "width": 300, "height": 40 },
  "ancestor": "h1.title",
  "nodeId": 42
}
```

New fields: `uuid`, `type`, `resolution`, `resolvedBy`, `resolvedAt`, `timestamp`.
Existing fields unchanged for backward compatibility.

### Capture JSON (extended)

```json
{
  "formatVersion": "2.2.0",
  "metadata": { ... },
  "nodes": [ ... ],
  "annotations": [
    { "uuid": "...", "type": "element", ... },
    { "uuid": "...", "type": "page-note", "comment": "overall spacing is off", ... },
    { "uuid": "...", "type": "capture", "timestamp": "...", ... }
  ]
}
```

## History Store - Decision: JSONL

### Why not SQLite?

SQLite was considered for indexed queries and concurrent write safety. However:

1. **No concurrent writes in practice.** The MCP server is single-threaded Node.js. MCP tools execute sequentially (single stdio connection). The HTTP receiver and MCP tools can theoretically race on the same file, but this is unrealistic - the user just sent a capture, Kiro hasn't read it yet. JSONL appends are atomic at the OS level for small writes (< 4KB).

2. **Cross-capture queries are fast enough with in-memory Map.** Loading 1000 JSONL lines takes ~10ms on startup. Filtering by status iterates Map values in < 1ms. We're not querying millions of rows.

3. **Native dependency risk.** `better-sqlite3` requires native compilation that can fail on ARM, musl, Windows WSL, and CI environments. ViewGraph targets broad compatibility.

4. **Git is not a concern.** `.viewgraph/` is gitignored, so binary vs text format doesn't matter for version control. But human inspectability (`cat history.jsonl | grep resolve`) is valuable for debugging.

### Architecture

```
.viewgraph/
  captures/           <- active capture JSON files (source of truth)
  history.jsonl       <- append-only event log (audit trail)
```

**Source of truth:** Capture JSON files hold current state (resolved/unresolved). The JSONL is an audit log. If they diverge, capture JSON wins.

**In-memory index:** On server start, parse history.jsonl into a `Map<uuid, event>`. All reads go through the Map. Writes append to JSONL and update the Map.

**Compaction:** When JSONL exceeds 1000 lines, compact by keeping only the latest event per UUID, rewrite file. This is rare and takes < 50ms.

### Event format

```jsonl
{"ts":"2026-04-09T12:41:00Z","event":"capture","uuid":"abc","url":"localhost:5173/login","filename":"viewgraph-...json"}
{"ts":"2026-04-09T12:42:00Z","event":"annotate","uuid":"def","captureUuid":"abc","comment":"fix font","severity":"critical"}
{"ts":"2026-04-09T12:50:00Z","event":"resolve","uuid":"def","by":"kiro","note":"Fixed to 14px"}
{"ts":"2026-04-09T13:00:00Z","event":"expire","uuid":"abc","reason":"maxCaptures exceeded"}
```

Each line is immutable. Resolution is a new event, not a mutation of the original. To get current state of an annotation, find the latest event for that UUID.

## New MCP Tools

### resolve_annotation

```
resolve_annotation(filename, annotation_uuid, resolution_note)
```

- Reads the capture JSON from disk
- Finds the annotation by UUID
- Sets `resolved: true`, `resolution: note`, `resolvedBy: "kiro"`, `resolvedAt: now`
- Writes the updated JSON back
- Appends a "resolve" event to history.jsonl
- Returns the updated annotation

### get_review_history

```
get_review_history(limit?, status?, capture_uuid?)
```

- Reads from the in-memory index (loaded from history.jsonl)
- Filters by status (open/resolved/all) and optionally by capture
- Returns chronological list of events
- Default limit: 50

## Resolution Flow

```
1. User annotates element, clicks Send
   Extension → POST /captures → server writes JSON + appends history

2. Kiro reads annotations
   Kiro → get_annotations(filename) → sees {uuid: "def", resolved: false}

3. Kiro fixes the code, then resolves
   Kiro → resolve_annotation(filename, "def", "Fixed font to 14px")
   Server → updates JSON on disk + appends resolve event to history

4. User reopens sidebar (or sidebar auto-refreshes)
   Extension → GET /captures/{filename} → reads updated JSON
   Sidebar shows: ✅ #1 resolved by Kiro - "Fixed font to 14px"
```

## Backward Compatibility

- Existing captures without `uuid` or `type` fields continue to work
- All existing MCP tools unchanged - they read the same JSON format
- `get_annotations` returns the extended fields when present
- Old captures treated as `type: "element"` with auto-generated UUIDs on read

## Security Considerations

- `resolve_annotation` validates filename against capturesDir (existing path validation)
- UUID must exist in the capture file - no creating new annotations via MCP
- History file is local to the project, not exposed via HTTP
- Resolution note is sanitized (max 500 chars, no HTML)
