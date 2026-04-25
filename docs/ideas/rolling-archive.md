# Rolling Archive for Resolved Captures

## The Problem

Capture files accumulate in `.viewgraph/captures/` indefinitely. Over weeks of active development, this directory grows to hundreds of files. Most are historical - all annotations resolved, no longer needed for active work. But they can't be deleted because:

- They contain resolution history (who fixed what, when)
- Baseline comparisons may reference them
- `diff_annotations` and `detect_recurring_issues` scan across captures for patterns
- Users may want to review past sessions

The result: a flat directory of hundreds of JSON files, most irrelevant to current work, slowing down `list_captures` and `get_unresolved` scans.

## The Vision

Automatically archive captures where all annotations are resolved into a nested `archive/` folder, with an index JSON that preserves metadata for historical queries without requiring the agent to scan hundreds of files.

```
.viewgraph/
├── captures/                    # Active captures (unresolved annotations or recent)
│   ├── viewgraph-localhost-2026-04-25-220000.json
│   └── viewgraph-localhost-2026-04-25-223000.json
├── archive/                     # Resolved captures, organized by month
│   ├── index.json               # Lightweight metadata index for all archived captures
│   ├── 2026-04/
│   │   ├── viewgraph-localhost-2026-04-08-1206.json
│   │   └── viewgraph-localhost-2026-04-10-192035.json
│   └── 2026-03/
│       └── viewgraph-localhost-2026-03-15-140000.json
└── config.json
```

## Archive Trigger

A capture is eligible for archiving when ALL of these are true:

1. **All annotations resolved** - every annotation has `resolved: true`
2. **Not a baseline** - the capture is not the current golden baseline for any URL
3. **Age threshold** - the capture is older than N hours (default: 24h, configurable)
4. **Not the latest** - never archive the most recent capture for a URL (even if fully resolved)

Captures with zero annotations are also eligible after the age threshold (they're one-off captures with no review context).

## index.json Schema

The archive index is a lightweight JSON file that stores metadata for all archived captures. This allows historical queries without reading individual files:

```json
{
  "version": 1,
  "lastUpdated": "2026-04-26T00:00:00Z",
  "captures": [
    {
      "filename": "2026-04/viewgraph-localhost-2026-04-08-1206.json",
      "originalPath": "viewgraph-localhost-2026-04-08-1206.json",
      "url": "http://localhost:8040/projects",
      "title": "TaskFlow - Projects",
      "timestamp": "2026-04-08T12:06:00Z",
      "nodeCount": 142,
      "annotations": {
        "total": 3,
        "resolved": 3,
        "categories": ["visual", "a11y"]
      },
      "resolutions": [
        { "uuid": "a1b2...", "action": "fixed", "by": "kiro", "summary": "Changed font-size", "at": "2026-04-08T12:30:00Z" }
      ],
      "archivedAt": "2026-04-09T12:00:00Z"
    }
  ]
}
```

The index carries enough metadata for:
- `detect_recurring_issues` - can scan resolutions without reading full captures
- `analyze_patterns` - categories and resolution actions are indexed
- `diff_annotations` - UUIDs and resolution status are indexed
- Historical reporting - "how many bugs did we fix this month?"

## When Archiving Runs

### Option A: On capture write (recommended)

After every `POST /captures`, check if any existing captures are now eligible for archiving. This is lazy and incremental - no separate process needed.

```
POST /captures → write new capture → check archive eligibility → move eligible files
```

### Option B: On server startup

Scan all captures on startup, archive eligible ones. Good for catching up after long idle periods.

### Option C: MCP tool

A new `archive_captures` tool that the agent or user can invoke explicitly. Useful for manual cleanup.

**Recommendation:** Option A (on write) + Option B (on startup). Option C as a nice-to-have.

## MCP Tool Changes

### Existing tools - no changes needed

| Tool | Why it still works |
|---|---|
| `list_captures` | Only lists from `captures/` (active). Archived captures are not in the indexer. |
| `get_capture` | Takes a filename. If the file isn't in `captures/`, check `archive/` as fallback. |
| `get_unresolved` | Only scans active captures. Archived captures have no unresolved annotations by definition. |
| `resolve_annotation` | Only operates on active captures. |
| `compare_captures` | Takes filenames. Fallback to archive if not found in active. |

### New tool: `list_archived`

List archived captures with optional filters (date range, URL, category).

```
list_archived({ from: "2026-04-01", to: "2026-04-15", url_filter: "localhost:3000" })
→ reads index.json, filters, returns metadata
```

### New tool: `archive_captures` (optional)

Manually trigger archiving. Useful for cleanup before a release or sprint end.

```
archive_captures({ older_than_hours: 12 })
→ moves eligible captures, updates index.json
```

## Prompt and Steering Integration

### Steering doc update (`viewgraph-workflow.md`)

Add guidance:
- "Active captures are in `.viewgraph/captures/`. Resolved captures are automatically archived to `.viewgraph/archive/` after 24 hours."
- "Use `list_archived` to search historical captures. Use `get_capture` with an archived filename - it falls back to the archive automatically."

### Prompt shortcut: `@vg-cleanup`

A new prompt that:
1. Calls `list_captures` to show active capture count
2. Reports how many are eligible for archiving
3. Asks the user to confirm
4. Calls `archive_captures`

### Power hook: auto-archive on sprint end

A hook that triggers archiving when the user runs a sprint-end review. Pairs with the existing Tier 3 security review workflow.

## Configuration

In `.viewgraph/config.json`:

```json
{
  "urlPatterns": ["localhost:3000"],
  "archive": {
    "enabled": true,
    "ageThresholdHours": 24,
    "keepLatestPerUrl": 2
  }
}
```

| Key | Default | Description |
|---|---|---|
| `enabled` | `true` | Enable automatic archiving |
| `ageThresholdHours` | `24` | Minimum age before a resolved capture is archived |
| `keepLatestPerUrl` | `2` | Always keep the N most recent captures per URL, even if fully resolved |

## Implementation Order

1. **Archive function** - `server/src/archive.js`: move file, update index.json, atomic write
2. **On-write trigger** - `http-receiver.js`: after POST /captures, check eligibility
3. **On-startup scan** - `index.js`: archive eligible on server start
4. **get_capture fallback** - check archive/ when file not found in captures/
5. **list_archived tool** - read index.json with filters
6. **@vg-cleanup prompt** - user-facing cleanup workflow
7. **Steering doc update** - explain archive behavior to agents

## Edge Cases

| Scenario | Behavior |
|---|---|
| Capture is a baseline | Never archive - baselines must stay in active directory |
| All annotations resolved but capture is < 24h old | Don't archive yet - user may reopen or add follow-ups |
| Agent resolves last annotation while archiving runs | Archive checks resolved status atomically per file |
| User requests archived capture via get_capture | Fallback reads from archive/ transparently |
| index.json gets corrupted | Rebuild from archive/ directory scan on next startup |
| Archive directory doesn't exist | Create on first archive operation |
| Capture has no annotations (one-off capture) | Archive after age threshold - no annotations to check |

## What This Does NOT Do

- Does not delete captures. Archiving is moving, not deleting. Files are preserved indefinitely.
- Does not compress captures. JSON files stay as-is in the archive. Compression is a future optimization.
- Does not archive baselines. Baselines are always active.
- Does not require user action. Archiving is automatic and silent. The `@vg-cleanup` prompt is for manual control, not a requirement.
