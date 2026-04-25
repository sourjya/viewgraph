# BUG-027: Accepted capture request has no history trace and disappears abruptly

- **ID**: BUG-027
- **Severity**: Low
- **Status**: OPEN
- **Reported**: 2026-04-25
- **Fixed**: -

## Description

Two UX issues with the agent capture request flow:

### 1. No history after accepting

When the user accepts a capture request from the agent, the request card disappears and there's no record of it in the sidebar. The capture goes to the SNAPSHOTS list in the Inspect tab, but there's no connection between "agent asked for this" and the resulting snapshot. The user can't tell which snapshots were agent-requested vs manual.

### 2. Abrupt disappearance

After accepting, the request card fades out (opacity transition) but the surrounding panel content jumps - the layout shift feels jarring. The card should animate out more gracefully.

## Current Behavior

1. Agent sends `request_capture` -> request card appears in Review tab
2. User clicks capture button -> card shows checkmark, fades to opacity 0
3. After 1.3s total, card is removed from DOM and `refresh()` is called
4. No trace remains - the request is gone from `pendingRequests` and not tracked elsewhere

## Proposed Fix

### History: Move accepted requests to a "Completed" entry in the timeline

When a capture request is accepted and the capture completes:

1. Add a lightweight entry to the annotation timeline (Review tab) with:
   - Agent icon or label (e.g., "Agent capture")
   - The `purpose` and `guidance` text from the request
   - Timestamp
   - Link/reference to the resulting snapshot filename
2. This entry appears in the **Resolved** tab filter - it's not an annotation, but it's a completed action that belongs in the resolved timeline
3. The entry is read-only - no comment editing, no severity. Just a historical record.

This way the Resolved tab becomes a full activity log: resolved annotations + completed agent requests.

### Animation: Smooth collapse instead of layout jump

Replace the current fade-out with a height collapse animation:

1. Checkmark + green flash (existing, keep)
2. After 800ms, animate `maxHeight` from current height to 0, with `overflow: hidden` and `padding` transitioning to 0
3. On `transitionend`, remove from DOM and refresh

This eliminates the layout jump because the space collapses smoothly.

## Files to Change

- `extension/lib/annotation-sidebar.js` - store completed request as timeline entry
- `extension/lib/sidebar/review.js` - render completed request entries in Resolved tab
- `extension/lib/annotation-sidebar.js` - replace opacity fade with height collapse animation
