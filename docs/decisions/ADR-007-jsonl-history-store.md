# ADR-007: JSONL Event Log for History and Resolution Tracking

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** sourjya
**Relates to:** Unified Review Panel spec (`.kiro/specs/unified-review-panel/`)

## Context

ViewGraph needs persistent history and bidirectional resolution tracking. When a user annotates a page and sends it to Kiro, Kiro fixes the issues and needs to signal "done" back to the extension. We also need an audit trail of all capture/annotate/resolve events across sessions.

This requires:
1. A store for event history (captures, annotations, resolutions)
2. A mechanism for Kiro to update annotation state (resolved/unresolved)
3. Cross-capture queries ("show all unresolved annotations")
4. Persistence across server restarts

Three options were evaluated: JSONL with in-memory index, SQLite, and capture-JSON-only (no separate store).

## Decision

**Use JSONL (JSON Lines) with an in-memory Map index.** Capture JSON files remain the source of truth for current state. The JSONL file is an append-only audit log.

```
.viewgraph/
  captures/           <- source of truth (current state)
  history.jsonl       <- audit log (event history)
```

## Alternatives Considered

### Option A: SQLite via better-sqlite3

SQLite provides indexed queries, atomic transactions, concurrent write safety, and relational queries out of the box.

**Why rejected:**

1. **Native dependency risk.** `better-sqlite3` requires native compilation (node-gyp, C++ toolchain). This fails on:
   - Windows WSL environments without build-essential
   - ARM-based machines (some Chromebooks, Raspberry Pi)
   - Alpine/musl-based Docker containers
   - CI environments without native build tools
   ViewGraph targets broad compatibility - it should work anywhere Node.js 18+ runs. A native dependency contradicts this.

2. **Overkill for our scale.** We cap history at 1000 events and captures at 50 per project. At this scale, an in-memory Map provides O(1) lookups and sub-millisecond filtered scans. SQLite's B-tree indexes provide no measurable advantage over iterating 1000 Map entries.

3. **Binary format.** SQLite databases are not human-readable. Debugging requires the `sqlite3` CLI or a GUI tool. JSONL can be inspected with `cat`, `grep`, `jq`, or any text editor. For a developer tool, inspectability matters.

4. **Dependency weight.** `better-sqlite3` adds ~2MB to the install and requires periodic updates for Node.js version compatibility. ViewGraph currently has minimal dependencies (MCP SDK, Zod, WXT). Adding a native addon changes the maintenance profile significantly.

5. **Git is not a concern.** `.viewgraph/` is gitignored, so the "binary files in git" argument against SQLite doesn't apply. However, this also means the "human-readable diffs" argument for JSONL doesn't apply either. The inspectability advantage is about debugging, not version control.

### Option B: Capture JSON only (no separate store)

Store everything in the capture JSON files. No history file at all. Resolution state lives in the annotation objects within each capture.

**Why rejected:**

1. **No cross-capture queries.** To find all unresolved annotations, the server must read and parse every capture JSON file. At 50 captures averaging 100KB each, that's 5MB of JSON parsing per query. With JSONL + in-memory Map, it's a sub-millisecond Map iteration.

2. **No audit trail.** When a capture is deleted (maxCaptures pruning), its history is lost. The JSONL preserves the record that an annotation existed and was resolved, even after the capture file is gone.

3. **No event timeline.** The capture JSON shows current state but not the sequence of events. "When was this annotated? When was it resolved? How long did the fix take?" These questions require event history.

## Justification for JSONL + In-Memory Map

### Concurrency is not a problem

The MCP server is single-threaded Node.js. MCP tools execute sequentially over a single stdio connection. The HTTP receiver processes one request at a time per endpoint. The only theoretical race condition is an HTTP POST (extension sends capture) concurrent with an MCP tool call (Kiro resolves annotation) on the same file. In practice this never happens - the user just sent the capture, Kiro hasn't read it yet.

JSONL appends are atomic at the OS level for writes under the filesystem block size (typically 4KB). Our event lines are ~200 bytes. No file locking needed.

### Performance is adequate

| Operation | JSONL + Map | SQLite |
|---|---|---|
| Server startup (load 1000 events) | ~10ms | ~5ms |
| Lookup by UUID | O(1) Map.get | O(1) indexed |
| Filter by status (1000 events) | ~1ms iterate | ~1ms indexed |
| Append event | ~1ms appendFileSync | ~1ms INSERT |
| Compact (rewrite 1000 lines) | ~50ms (rare) | N/A (auto) |

No measurable difference at our scale. SQLite wins on compaction (automatic VACUUM vs manual rewrite), but compaction happens at most once per 1000 events.

### Portability is critical

ViewGraph is a developer tool that runs alongside any project. It must install cleanly with `npm install` on any platform. Native dependencies are the #1 cause of "it doesn't work on my machine" issues in the Node.js ecosystem. JSONL requires zero native code.

### Event sourcing fits the domain

Our data naturally forms an event stream: capture, annotate, resolve, expire. Each event is immutable. Current state is derived by finding the latest event per UUID. This is event sourcing at its simplest - no framework, no library, just append-only lines.

The JSONL file is the log. The in-memory Map is the materialized view. If the Map is lost (server restart), it's rebuilt from the log in ~10ms.

### Inspectability aids debugging

```bash
# What happened in the last hour?
tail -20 .viewgraph/history.jsonl

# What's unresolved?
grep -v '"event":"resolve"' .viewgraph/history.jsonl | grep '"event":"annotate"'

# How many captures today?
grep '"event":"capture"' .viewgraph/history.jsonl | grep '2026-04-09' | wc -l
```

This is valuable for a tool whose users are developers. No special CLI needed.

## Consequences

### Positive
- Zero native dependencies - installs cleanly everywhere
- Human-readable history - debuggable with standard Unix tools
- Simple implementation - ~100 lines of code for the store
- Portable across all Node.js platforms

### Negative
- Manual compaction needed (rewrite file when > 1000 lines)
- No built-in concurrent write safety (not needed, but no safety net)
- In-memory Map consumes RAM (~500KB for 1000 events) - negligible
- If JSONL file is corrupted (partial write on crash), last line may be invalid - mitigated by skipping unparseable lines on load

### Risks
- If event volume grows beyond 10,000 (unlikely given 50-capture cap), the in-memory approach may need revisiting. Monitor and reassess if this happens.
- If we later need complex relational queries (joins across captures and annotations), JSONL won't scale. This would trigger a migration to SQLite. The JSONL format is simple enough that a migration script would be straightforward.

## Review Triggers

Revisit this decision if:
- Event volume exceeds 10,000 per project
- We need relational queries that can't be served by the in-memory Map
- A new requirement demands concurrent write safety (e.g., multiple MCP servers per project)
