# BUG-028: No visual separation between sent and unsent annotations

- **ID**: BUG-028
- **Severity**: Medium
- **Status**: FIXED
- **Reported**: 2026-04-25
- **Fixed**: 2026-04-26

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

### 1. `extension/lib/annotate.js` - Data model

Add `sentAt` field to annotation creation (lines ~310, ~416, ~715):

```js
// Current
const annotation = { id, uuid, type, region, comment: '', severity: '', ... };

// New - add sentAt: null
const annotation = { id, uuid, type, region, comment: '', severity: '', sentAt: null, ... };
```

Update `save()` serialization to include `sentAt`. Update `load()` to read it back.

### 2. `extension/lib/annotation-sidebar.js` - doSend() (line ~516)

Replace blanket `pending = true` with `sentAt` timestamp. Only mark unsent annotations:

```js
// Current
function doSend(trustOverride = false) {
  // ...
  for (const ann of getAnnotations()) {
    if (!ann.resolved) ann.pending = true;
  }
}

// New
function doSend(trustOverride = false) {
  const now = new Date().toISOString();
  const unsent = getAnnotations().filter((a) => !a.resolved && !a.sentAt);
  for (const ann of unsent) {
    ann.sentAt = now;
    ann.pending = true;  // keep for backward compat with existing rendering
  }
  save();
  // ...
}
```

### 3. `extension/entrypoints/content.js` - send-review handler (line ~147)

Add option to filter annotations in the capture payload:

```js
// Current
capture.annotations = serializeAnnotations(getAnnotations());

// New - accept a filter mode from the message
const anns = getAnnotations();
const filtered = message.sendNewOnly
  ? anns.filter((a) => !a.resolved && !a.sentAt)  // only unsent
  : anns;                                           // all (first send, or explicit full send)
capture.annotations = serializeAnnotations(filtered);
```

The sidebar passes `sendNewOnly: true` when there are already-sent annotations:

```js
// In doSend():
const hasAlreadySent = getAnnotations().some((a) => a.sentAt && !a.resolved);
chrome.runtime.sendMessage({
  type: 'send-review', includeCapture: true, includeSnapshot: true,
  sendNewOnly: hasAlreadySent,  // only new batch if previous send exists
  sessionNote, trustOverride
}, () => {});
```

### 4. `extension/lib/sidebar/review.js` - Batch separators (renderReviewList)

After sorting annotations, group by `sentAt` value and insert separator elements:

```js
// In renderReviewList, after filtering:
const batches = groupByBatch(visible);
// batches = [
//   { label: 'Sent 5 min ago', annotations: [...] },
//   { label: 'Not yet sent', annotations: [...] },
// ]

for (const batch of batches) {
  // Render separator
  const sep = document.createElement('div');
  sep.textContent = `── ${batch.label} ──`;
  // ... styling
  list.appendChild(sep);
  // Render entries
  for (const ann of batch.annotations) {
    list.appendChild(createEntry(ann, callbacks));
  }
}
```

Grouping logic:
- Group by `sentAt` value (same timestamp = same batch)
- Sort batches: most recent sent first, unsent last
- Label format: "Sent Xm ago" / "Sent Xh ago" / "Not yet sent"

### 5. `extension/lib/sidebar/footer.js` - Send button label

Update the Send button text when there are mixed sent/unsent annotations:

```js
// In updateDisabledState or a new updateSendLabel method:
const total = anns.filter((a) => !a.resolved).length;
const unsent = anns.filter((a) => !a.resolved && !a.sentAt).length;
const hasSent = total > unsent;

if (hasSent && unsent > 0) {
  sendBtn.textContent = `Send ${unsent} new`;
} else {
  sendBtn.textContent = 'Send to Agent';  // default
}
```

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| First send (no prior sentAt) | All annotations sent, all get sentAt. Button says "Send to Agent". |
| Second send with new annotations | Only new annotations in capture. Button says "Send 2 new". |
| Agent resolves some, user adds more | Resolved ones disappear from Open tab. New ones show in "Not yet sent" batch. |
| All annotations resolved, user adds new | Fresh state - no batches, just new annotations. Button says "Send to Agent". |
| User closes sidebar between sends | sentAt persists in storage. Reopening shows correct batch grouping. |
| Agent resolves via sync while sidebar is open | Resolved annotations move to Resolved tab. Batch separator updates count. |
| User clicks Send with 0 unsent annotations | Button is disabled (all already sent or resolved). |

## Migration

Existing annotations in storage won't have `sentAt`. Treat `sentAt === undefined` the same as `sentAt === null` (unsent). The `pending` boolean is kept for backward compatibility but `sentAt` is the source of truth going forward.

## Test Plan

| Test | Type |
|---|---|
| First send sets sentAt on all unresolved annotations | Unit (annotate.js) |
| Second send only marks unsent annotations | Unit (annotation-sidebar.js) |
| Capture payload filters to new-only when sendNewOnly=true | Unit (content.js) |
| Batch separator renders between sent and unsent groups | Unit (review.js) |
| Send button shows "Send N new" when mixed batches exist | Unit (footer.js) |
| sentAt persists across sidebar close/reopen | Integration |
| Resolved annotations don't appear in any batch | Unit (review.js) |
| Empty unsent batch disables Send button | Unit (footer.js) |
