# BUG-028: No visual separation between sent and unsent annotations

- **ID**: BUG-028
- **Severity**: Medium
- **Status**: OPEN
- **Reported**: 2026-04-25
- **Fixed**: -

## Description

When a user sends annotations to the agent, adds more annotations while the agent is working, and then wants to send the new batch, there is no clear UX for distinguishing what's already been sent from what's new. The second Send re-sends everything, and the user can't tell which annotations the agent is already working on.

## Reproduction Steps

1. Add 3 annotations, click **Send to Agent** - agent starts fixing
2. Close the sidebar (or collapse it)
3. Reopen sidebar, add 2 more annotations
4. The timeline shows 5 items: 3 with amber "Sent to agent" text, 2 without
5. But the visual difference is subtle - just one line of amber text vs no text
6. Click **Send to Agent** again
7. A new capture is sent with ALL 5 annotations (including the 3 already being worked on)
8. The agent now has two captures with overlapping annotations

## Problems

### 1. No batch separation in the timeline

Old sent annotations and new unsent ones are interleaved by timestamp. The only visual cue is the amber "Sent to agent - waiting for fix..." line, which is easy to miss in a long list.

### 2. Second Send re-sends everything

`doSend()` marks ALL unresolved annotations as `pending = true` and the capture includes ALL annotations via `getAnnotations()`. The agent receives a capture with annotations it's already working on from the previous send. This can cause:
- Duplicate fixes (agent tries to fix something it already fixed)
- Confusion about which capture is the "current" one
- Wasted tokens re-processing old annotations

### 3. No "sent at" timestamp

Annotations don't track when they were sent. There's no way to group them by send batch or show "sent 5 min ago" vs "not yet sent."

## Proposed Fix

### Short-term: Visual batch separator + send-only-new

1. **Add `sentAt` timestamp** to annotations when Send is clicked. Store the ISO timestamp, not just a boolean `pending`.

2. **Send only unsent annotations** on second Send. Filter: include annotations where `!resolved && !sentAt` in the new capture. Already-sent annotations are excluded from the capture payload (the agent already has them).

3. **Visual batch separator** in the timeline. When rendering, group annotations by `sentAt` value. Show a thin separator line with the send timestamp between batches:
   ```
   ── Sent 5 min ago ──────────
   #1  Fix heading size        ⏳ Sent to agent
   #2  Password field type     ⏳ Sent to agent
   #3  Missing alt text        ⏳ Sent to agent
   ── Not yet sent ────────────
   #4  Button color wrong
   #5  Footer link broken
   ```

4. **Send button label changes** when there are unsent annotations: "Send 2 new" instead of "Send to Agent". This makes it clear that only the new batch will be sent.

### Long-term: Annotation lifecycle states

Replace the boolean `pending` with a proper state machine:

```
draft → sent → fixing → resolved
         ↑              ↓
         └── reopened ←─┘ (if follow-up needed, see BUG-023)
```

Each state has a distinct visual treatment in the timeline.

## Current Code

- `annotation-sidebar.js:doSend()` - marks all unresolved as `pending = true`, sends all
- `content.js:send-review` - `serializeAnnotations(getAnnotations())` includes everything
- `review.js:createEntry()` - shows amber text when `ann.pending && !ann.resolved`

## Files to Change

- `extension/lib/annotation-sidebar.js` - doSend: add sentAt, filter new-only for capture
- `extension/entrypoints/content.js` - send-review: accept filter for which annotations to include
- `extension/lib/sidebar/review.js` - render batch separators, update Send button label
- `extension/lib/annotate.js` - add sentAt field to annotation model
