# Live Annotation Status Updates

## The Problem

After clicking "Send to Agent," the user sees amber "Sent to agent - waiting for fix..." on every annotation. Then nothing happens visually until the agent resolves each one. The gap between "sent" and "resolved" can be minutes - during which the user has no idea:

- Has the agent started working?
- Which annotation is it working on right now?
- Did it get stuck?
- Is it done with some but not others?

This is especially bad when the user closes the sidebar and comes back later. They see a wall of amber "waiting" text with no progress indication.

## The Vision

Each annotation should show its real-time lifecycle status as the agent works through them:

```
#1  Fix heading size        ✅ Fixed by Kiro
#2  Password field type     🔧 Kiro is fixing...
#3  Missing alt text        ⏳ Queued
#4  Button color wrong      ○  Not yet sent
```

The user can see at a glance: 1 done, 1 in progress, 1 queued, 1 not sent.

## Lifecycle States

```
draft  →  sent  →  queued  →  fixing  →  resolved
                                  ↓
                              failed (agent couldn't fix)
```

| State | Visual | How it's set |
|---|---|---|
| **draft** | No indicator | Default - annotation just created |
| **sent** | ⏳ "Sent to agent" (amber) | User clicks Send to Agent |
| **queued** | ⏳ "Queued" (amber, dimmer) | Agent calls `get_annotations` or `get_unresolved` - acknowledges receipt |
| **fixing** | 🔧 "Kiro is fixing..." (blue pulse) | Agent calls `find_source` or edits a file related to this annotation |
| **resolved** | ✅ "Fixed by Kiro" (green) | Agent calls `resolve_annotation` |
| **failed** | ⚠️ "Could not fix" (red) | Agent calls `resolve_annotation` with action `wontfix` |

## How It Works

### Server side

The MCP server already tracks annotation state in the capture JSON. The new states would be communicated via:

1. **WebSocket events** - the server emits `annotation:status` events when the agent interacts with annotations through MCP tools
2. **Tool hooks** - certain tool calls imply status changes:
   - `get_annotations` / `get_unresolved` → all unresolved annotations move to `queued`
   - `get_annotation_context(annotation_id)` → that annotation moves to `fixing`
   - `find_source` with a selector matching an annotation → that annotation moves to `fixing`
   - `resolve_annotation` → `resolved` (already implemented)

### Extension side

The sidebar already has WebSocket sync for resolved annotations (`syncResolved` in `sync.js`). Extend this to handle status updates:

1. Listen for `annotation:status` WebSocket events
2. Update the annotation's `status` field in local state
3. Re-render the timeline entry with the new visual treatment
4. Optionally pulse/animate the transition (e.g., amber → blue pulse when fixing starts)

### Capture JSON

Add an optional `status` field to the annotation schema:

```json
{
  "id": 1,
  "uuid": "...",
  "comment": "Fix heading size",
  "resolved": false,
  "status": "fixing",
  "statusHistory": [
    { "status": "sent", "at": "2026-04-25T22:00:00Z" },
    { "status": "queued", "at": "2026-04-25T22:00:05Z" },
    { "status": "fixing", "at": "2026-04-25T22:00:12Z" }
  ]
}
```

The `statusHistory` array is optional and only populated when the server tracks transitions. It enables the timeline to show "started fixing 30s ago" relative timestamps.

## Visual Design

### Timeline entry states

```
Draft (not sent):
  ○  #4  Button color wrong

Sent (waiting for agent to pick up):
  ⏳ #3  Missing alt text
       Sent to agent - waiting for fix...

Queued (agent acknowledged):
  ⏳ #3  Missing alt text
       Agent received - in queue

Fixing (agent actively working):
  🔧 #2  Password field type
       Kiro is fixing...                    [pulse animation]

Resolved:
  ✅ #1  Fix heading size
       ✓ fixed by Kiro: Changed to type="password"
```

### Collapsed strip

The collapsed strip badge could show a mini progress indicator:
- `3/5` instead of just `5` - meaning 3 of 5 annotations resolved

### Notification

When an annotation transitions to `resolved`, the sidebar could show a brief toast or the bell icon could pulse - giving the user a "ding" moment even if they're not looking at the timeline.

## Relationship to BUG-028

This feature builds on BUG-028 (batch separation). The `sentAt` timestamp from BUG-028 becomes the `sent` status entry. The batch separators become status-group separators. Implement BUG-028 first, then layer status updates on top.

## Implementation Order

1. **BUG-028** - sentAt timestamp, batch separators, send-only-new (prerequisite)
2. **Server: tool hooks** - emit WebSocket events when tools imply status changes
3. **Extension: status rendering** - update timeline entries on WebSocket events
4. **Extension: animations** - pulse on fixing, toast on resolved
5. **Capture JSON: statusHistory** - optional, for audit trail

## Scope Boundaries

- Status updates are **best-effort** - if the WebSocket disconnects, the sidebar falls back to the current behavior (sent → resolved, no intermediate states)
- The agent doesn't need to explicitly set status - the server infers it from tool usage patterns
- `statusHistory` is optional metadata, not required for the feature to work
- This does NOT require changes to the MCP protocol - it uses the existing WebSocket channel
