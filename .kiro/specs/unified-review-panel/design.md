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

## History Store - Decision: JSONL vs SQLite

### Option A: JSONL (append-only log)

```
.viewgraph/history.jsonl
```

```jsonl
{"ts":"2026-04-09T12:41:00Z","event":"capture","uuid":"abc","url":"localhost:5173/login","filename":"viewgraph-...json"}
{"ts":"2026-04-09T12:42:00Z","event":"annotate","uuid":"def","captureUuid":"abc","comment":"fix font"}
{"ts":"2026-04-09T12:50:00Z","event":"resolve","uuid":"def","by":"kiro","note":"Fixed to 14px"}
```

Pros:
- Zero dependencies, human-readable, grep-able
- Simple append, no corruption risk
- Easy to backup (copy file)

Cons:
- Queries are O(n) full scan
- Updates require rewriting the file (for resolution tracking)
- No indexes, no concurrent write safety
- Rolling/pruning requires rewriting

### Option B: SQLite via better-sqlite3

```
.viewgraph/history.db
```

```sql
CREATE TABLE events (
  uuid TEXT PRIMARY KEY,
  capture_uuid TEXT,
  type TEXT NOT NULL,  -- capture, element, page-note
  event TEXT NOT NULL,  -- created, resolved, deleted
  url TEXT,
  comment TEXT,
  severity TEXT,
  resolved INTEGER DEFAULT 0,
  resolution TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  filename TEXT
);
CREATE INDEX idx_capture ON events(capture_uuid);
CREATE INDEX idx_resolved ON events(resolved);
```

Pros:
- Indexed queries (unresolved items, by capture, by date)
- Concurrent-safe, atomic updates
- Built-in size management (DELETE oldest)
- Relational queries across captures

Cons:
- Adds `better-sqlite3` dependency (~2MB native addon)
- Binary file, not human-readable
- Native compilation can fail on some systems
- Overkill if we only have < 1000 events

### Recommendation: JSONL with in-memory index

Use JSONL for storage (simple, portable, no native deps) but load into a Map on server start for O(1) lookups. The file stays small (< 200KB for 1000 events). Updates append a new event line rather than modifying existing lines - resolution is an event, not a mutation.

```
capture abc → annotate def (on abc) → resolve def → expire abc
```

Each line is immutable. To get current state, replay events. This is event sourcing at the simplest level.

Pruning: when file exceeds 1000 lines, compact by keeping only the latest event per UUID, rewrite file.

This avoids the SQLite dependency while giving us fast reads (in-memory Map) and simple writes (append). The tradeoff is a ~10ms startup cost to parse 1000 lines - acceptable.

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
