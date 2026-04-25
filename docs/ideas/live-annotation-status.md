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

Add optional agent-writable fields to the annotation schema. These are empty by default and populated by the agent via MCP tools as it works through annotations:

```json
{
  "id": 1,
  "uuid": "a1b2c3d4-...",
  "comment": "Fix heading size",
  "resolved": false,
  "status": "fixing",
  "agentContext": {
    "status": "fixing",
    "startedAt": "2026-04-25T22:00:12Z",
    "sourceFile": "src/components/Header.tsx:42",
    "notes": "Changing font-size from 56px to 28px"
  },
  "resolution": null,
  "statusHistory": [
    { "status": "sent", "at": "2026-04-25T22:00:00Z" },
    { "status": "queued", "at": "2026-04-25T22:00:05Z" },
    { "status": "fixing", "at": "2026-04-25T22:00:12Z" }
  ]
}
```

### Fields the agent can write

| Field | Type | Set by | Purpose |
|---|---|---|---|
| `resolved` | boolean | `resolve_annotation` tool | Already exists - marks annotation as done |
| `resolution` | object | `resolve_annotation` tool | Already exists - action, summary, filesChanged, by, at |
| `status` | string | Server (inferred from tool calls) | New - current lifecycle state |
| `agentContext` | object | Future `update_annotation_status` tool | New - agent's working notes |
| `agentContext.status` | string | Agent | Current state: queued, fixing, blocked, failed |
| `agentContext.startedAt` | string | Agent | When the agent started working on this |
| `agentContext.sourceFile` | string | Agent | File the agent identified via find_source |
| `agentContext.notes` | string | Agent | Free-text working notes (what the agent is doing) |
| `statusHistory` | array | Server | New - audit trail of state transitions |

### What already exists vs what's new

**Already implemented:**
- `resolved` + `resolution` - written by `resolve_annotation` tool
- WebSocket `annotation:resolved` event - notifies extension on resolve

**New (this feature):**
- `status` field - inferred by server from tool call patterns
- `agentContext` object - written by a new `update_annotation_status` tool (or inferred)
- `statusHistory` array - appended by server on each transition
- WebSocket `annotation:status` event - notifies extension on any status change

### Backward compatibility

All new fields are optional. Existing captures without these fields continue to work. The extension treats missing `status` as `draft` and missing `agentContext` as empty. The `resolve_annotation` tool continues to work exactly as before - it just also appends to `statusHistory` when the feature is active.

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

## Prerequisite: Trust-Once Tool Approval

This entire feature depends on the agent being able to call ViewGraph tools **without per-call user approval**. If the user has to click "Allow" on every `get_annotations`, `find_source`, and `resolve_annotation` call, the workflow is broken:

- Status inference requires uninterrupted tool call sequences
- The user gets bombarded with approval dialogs instead of seeing smooth progress
- The "fixing..." state never appears because the agent is blocked waiting for approval

### What's needed

ViewGraph's MCP tools are **read-heavy and safe by design** - they read capture files, query DOM structure, and write resolution metadata. They never modify source code directly (the agent does that through its own file editing, not through ViewGraph tools). This makes them ideal candidates for trust-once approval:

| Tool category | Risk level | Should auto-approve? |
|---|---|---|
| Read tools (`get_capture`, `get_annotations`, `list_captures`, etc.) | None - reads local JSON files | Yes |
| Query tools (`audit_accessibility`, `find_source`, `get_elements_by_role`, etc.) | None - analysis only | Yes |
| Annotation tools (`resolve_annotation`, `get_unresolved`, etc.) | Low - writes metadata to capture JSON | Yes |
| Request tools (`request_capture`) | Low - asks user via extension sidebar | Yes (user approves in browser, not IDE) |
| Baseline tools (`set_baseline`, `compare_baseline`) | Low - copies a JSON file | Yes |

No ViewGraph tool modifies source code, deletes files, or makes network requests to external services. Every tool operates on local `.viewgraph/` files only.

### How agents should configure this

Each MCP-compatible agent has its own trust mechanism:

| Agent | How to trust-once |
|---|---|
| **Kiro IDE** | MCP tools from configured servers are auto-approved by default |
| **Kiro CLI** | Tools run without approval prompts in CLI mode |
| **Claude Code** | Use `--allowedTools` flag or `/allowed-tools` command to whitelist ViewGraph tools |
| **Cursor** | MCP tools are auto-approved when the server is in the config |
| **Windsurf** | MCP tools are auto-approved when the server is in the config |
| **Cline** | Configure "Auto Approve" for the ViewGraph MCP server in settings |

### Documentation action

When this feature ships, the Quick Start guide and Kiro Power page should include a note: "For the best experience, ensure ViewGraph MCP tools are set to auto-approve in your agent. ViewGraph tools only read and annotate local capture files - they never modify your source code."
