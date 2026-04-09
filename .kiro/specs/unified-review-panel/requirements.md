# Unified Review Panel - Requirements

## Overview

Redesign the ViewGraph extension sidebar into a unified review panel that merges capture, annotation, page notes, and Kiro request tracking into a single chronological workflow. Add bidirectional resolution tracking so Kiro can mark annotations as resolved and the extension reflects it.

## Problem Statement

1. **Capture and Annotate are separate flows** - users must click Capture, then Annotate. These should be one action.
2. **No page-level comments** - users can annotate elements but can't say "this page loads slowly" or "overall layout is cramped."
3. **No visibility into Kiro requests** - when Kiro calls `request_capture`, the user has no idea. The extension silently polls.
4. **No resolution feedback** - after Kiro fixes an issue, the annotation stays "open" in the extension. No way for Kiro to signal "done."
5. **No history** - captures and annotations are ephemeral. No audit trail across sessions.

## Functional Requirements

### FR-1: Single Entry Point
- The popup shows one primary button: "Review"
- Clicking Review opens the annotation sidebar AND auto-captures the DOM
- The Capture button moves to the sidebar footer as a secondary action
- The popup retains the MCP connection status indicator

### FR-2: Unified Timeline
- All items appear in a single chronological list in the sidebar:
  - **Captures** (DOM snapshots) - auto on Review start, manual via Capture button
  - **Page notes** - text-only annotations without a specific element
  - **Element annotations** - click/drag selections with comments and severity
- Each item has: unique ID, timestamp, type indicator, resolve/delete actions
- Resolved items show a checkmark and resolution note (if provided by Kiro)

### FR-3: Page Notes
- A "Note" button in the sidebar footer adds a page-level comment
- Page notes are stored as annotations with `type: "page-note"` and no element reference
- Page notes support severity (Critical/Major/Minor) like element annotations
- Page notes appear in the timeline alongside element annotations

### FR-4: Kiro Request Notifications
- When Kiro calls `request_capture`, the request appears as a timeline item with a distinct icon
- Request item shows: requested URL, guidance note (what to capture), and a "Capture Now" button
- `request_capture` MCP tool extended with optional `guidance` parameter (max 200 chars)
- Clicking "Capture Now" captures the current page and completes the request
- Completed requests transform into regular capture items in the timeline
- Expired requests show as dimmed with "Expired" label
- Requests are sorted chronologically alongside annotations and captures

### FR-5: Bidirectional Resolution Tracking
- Each annotation has a globally unique ID (UUID)
- New MCP tool: `resolve_annotation(filename, annotation_id, resolution_note)`
- When Kiro resolves an annotation, the server updates the capture JSON on disk
- The extension reads back resolved state when the sidebar opens or refreshes
- Resolved annotations show: green checkmark, resolution note, "resolved by Kiro" label
- Users can also resolve annotations manually from the sidebar (existing behavior)

### FR-6: History and Persistence
- All events (capture, annotate, resolve, delete) are logged to a persistent store
- History is project-local, stored in `.viewgraph/`
- History survives browser restarts and extension reloads
- Queryable by Kiro via a new MCP tool: `get_review_history(limit, status_filter)`
- Capped at a configurable limit to prevent unbounded growth
- Oldest entries auto-pruned when limit is reached

### FR-7: Export Includes All Item Types
- Send to Kiro bundles: captures + page notes + element annotations + resolution status
- Copy Markdown includes page notes as a separate section
- Download Report includes page notes in the markdown file

## Non-Functional Requirements

### NFR-1: Performance
- Sidebar open time < 200ms even with 50 items in history
- History queries return in < 50ms for up to 1000 entries
- Auto-capture on Review start must not block sidebar rendering

### NFR-2: Storage
- Active captures capped at 50 per project (existing `maxCaptures` config)
- History store capped at 1000 events (~100-200KB)
- Total `.viewgraph/` footprint should stay under 20MB per project

### NFR-3: Security
- Resolution updates via MCP must validate annotation ID exists
- No arbitrary file writes - resolution only modifies existing capture files
- History store must not be writable from the network (local only)

### NFR-4: Compatibility
- All existing MCP tools continue to work unchanged
- Existing capture JSON format extended (not replaced) - backward compatible
- Extension works without MCP server (offline mode) - history stored locally via chrome.storage
