# ADR-007: Capture JSON as Single Source of Truth (No Separate History Store)

**Status:** Accepted (revised)
**Date:** 2026-04-09
**Deciders:** sourjya
**Supersedes:** Original ADR-007 draft (JSONL history store)
**Relates to:** Unified Review Panel spec (`.kiro/specs/unified-review-panel/`)

## Context

ViewGraph needs persistent history and bidirectional resolution tracking. When a user annotates a page and sends it to Kiro, Kiro fixes the issues and needs to signal "done" back to the extension. We also need cross-capture queries ("show all unresolved annotations").

Three options were evaluated: JSONL with in-memory index, SQLite, and capture-JSON-only.

## Decision

**Use capture JSON files as the single source of truth.** No separate history store. Resolution state lives in the annotation objects within each capture. The server indexer (which already loads all captures into memory on startup) provides cross-capture queries.

```
.viewgraph/
  captures/           <- all state lives here
    viewgraph-localhost-2026-04-09-1241.json
    viewgraph-localhost-2026-04-09-1250.json
```

If audit trail is needed later, a write-only JSONL log can be added with zero query responsibility.

## Alternatives Rejected

### Option A: JSONL event log + capture JSON (original proposal)

The original design used JSONL as an append-only event log alongside capture JSON files. Resolution would be recorded in both: the capture JSON (current state) and the JSONL (audit trail).

**Why rejected:**

Two sources of truth is an anti-pattern. If `resolve_annotation` updates the capture JSON but the JSONL append fails (disk full, crash mid-write), they diverge silently. If someone manually edits a capture JSON, the JSONL is stale. Keeping two stores in sync adds complexity with no proportional benefit at our scale.

The audit trail benefit is real but not critical for v1. If needed later, a write-only JSONL log can be added that has zero query responsibility - it only appends, never reads. This eliminates the divergence risk because the JSONL is never consulted for current state.

### Option B: SQLite via better-sqlite3

SQLite provides indexed queries, atomic transactions, and a single-file database.

**Why rejected:**

1. **Native dependency risk.** `better-sqlite3` requires native compilation (node-gyp, C++ toolchain). This fails on:
   - Windows WSL environments without build-essential
   - ARM-based machines (some Chromebooks, Raspberry Pi)
   - Alpine/musl-based Docker containers
   - CI environments without native build tools
   ViewGraph targets broad compatibility - it should work anywhere Node.js 18+ runs.

2. **Still creates two sources of truth.** Even with SQLite, we'd need to keep capture JSON files for MCP tools that read them directly. The DB becomes a second store that must stay in sync with the JSON files - the same divergence problem as JSONL.

3. **Overkill for our scale.** We cap at 50 captures per project. The indexer already loads all captures into memory. Cross-capture queries are sub-millisecond Map iterations. SQLite's B-tree indexes provide no measurable advantage.

## Why Capture JSON Only Works

### Cross-capture queries

The server indexer already reads all capture files on startup and holds them in memory. Adding `getUnresolvedAnnotations()` is a filter over the existing in-memory index - the same pattern used by `audit_accessibility` and `find_missing_testids`.

Performance at 50 captures, ~100 annotations total: < 1ms to scan all annotations and filter by `resolved: false`.

### Resolution updates

`resolve_annotation` MCP tool:
1. Reads capture JSON from disk
2. Finds annotation by UUID
3. Sets `resolved: true`, writes `resolution` object
4. Writes updated JSON back

Single file, single write, no sync needed.

### Concurrency

The MCP server is single-threaded Node.js. MCP tools execute sequentially over a single stdio connection. The HTTP receiver and MCP tools can theoretically race on the same file, but this is unrealistic in practice - the user just sent a capture, Kiro hasn't read it yet.

### Offline extension state

The extension stores annotation state in `chrome.storage` for offline use. On reconnect, bidirectional sync uses last-write-wins by timestamp. The capture JSON on the server is authoritative when online.

## Consequences

### Positive
- Single source of truth - no divergence risk
- Zero additional dependencies
- Zero additional files to manage
- Leverages existing indexer infrastructure
- Human-readable (JSON files, inspectable with cat/jq)
- Simplest possible implementation

### Negative
- No audit trail (when was this annotated? when resolved? how long did the fix take?)
- Deleting a capture loses its history permanently
- No event timeline across captures

### Mitigations
- Audit trail can be added later as a write-only JSONL log with no query responsibility
- Capture deletion is controlled (maxCaptures pruning) and logged to stderr
- Event timeline is a nice-to-have, not a v1 requirement

### Risks
- If we later need complex audit queries ("average time to resolution", "annotations per week"), capture JSON won't support this. Trigger: add JSONL or SQLite at that point.
- If capture count grows beyond 50 (config change), in-memory indexing may need optimization. Current cap makes this unlikely.

## Review Triggers

Revisit this decision if:
- Audit trail becomes a hard requirement (compliance, team reporting)
- Capture count exceeds 200 per project
- We need temporal queries (time-to-resolution, annotation velocity)
- Multiple MCP servers need to share state for the same project
