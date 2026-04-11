# Sidebar UX Fixes - Implementation Plan

**Source:** [Sidebar UX Review 2026-04-12](../architecture/sidebar-ux-review-2026-04-12.md)
**Milestone:** M16 (Sidebar UX Polish)
**Estimated effort:** 2-3 days

---

## Priority 1: Bug Fix

### UX-01: Fix collapsed strip mode toggle (Bug)

**File:** `extension/lib/annotation-sidebar.js` line 1265
**Problem:** `captureMode` is an undefined variable. Should be `getCaptureMode()`. The mode toggle in the collapsed strip never detects the current mode, so it can't toggle off - it always activates.
**Fix:** Replace `captureMode` with `getCaptureMode()` on line 1265.
**Effort:** 5 minutes
**Tests:** Add test that collapsed strip mode toggle calls `setCaptureMode(null)` when mode is already active.

---

## Priority 2: Medium Impact

### UX-02: Adaptive footer for disconnected state

**File:** `extension/lib/annotation-sidebar.js` (footer section)
**Problem:** When the MCP server is offline, "Send to Agent" is disabled (opacity 0.4) but still occupies the most prominent position. The user's only available actions (Copy MD, Report) are visually subordinate.
**Fix:**
- When `mcpConnected` is false, swap the layout: promote Copy MD and Report to full-width primary buttons, collapse Send to Agent into a single-line hint ("Connect server to send to agent").
- When server reconnects (could poll or check on tab switch), restore the normal layout.
**Effort:** 1-2 hours
**Tests:** Test that footer renders Copy MD/Report as primary when disconnected.

### UX-03: Separate capture controls from Inspect diagnostics

**File:** `extension/lib/annotation-sidebar.js` (`refreshInspect` function)
**Problem:** The Inspect tab mixes diagnostic data (network, console, landmarks) with capture management controls (auto-capture toggle, record flow, snapshots status) below an `<hr>`. This violates the tab's purpose ("understand the page").
**Fix:**
- Wrap auto-capture, record flow, session note, and snapshots in a collapsible "Capture Controls" section with its own header, consistent with the other collapsible sections (Network, Console, etc.).
- Place it at the bottom of the Inspect tab, clearly separated.
- The section header shows recording state (red dot when active).
**Effort:** 1-2 hours
**Tests:** Test that capture controls render inside a collapsible section.

### UX-04: Mode bar collapse - add user feedback

**File:** `extension/lib/annotation-sidebar.js` (mode button click handlers)
**Problem:** Clicking Element or Region mode collapses the sidebar without explanation. The user clicked a mode selector, not a "hide" button. This is a learnability issue.
**Fix:**
- After collapsing, show a brief toast/tooltip on the collapsed strip: "Click elements on the page. Tap here to expand." Auto-dismiss after 3 seconds.
- On first use only (track in `chrome.storage`), show the toast. After that, the user knows the pattern.
**Effort:** 1 hour
**Tests:** Test that first-time collapse shows toast, subsequent collapses don't.

### UX-05: Keyboard navigation in annotation list

**File:** `extension/lib/keyboard-shortcuts.js`
**Problem:** Arrow keys don't navigate between annotations. Power users who use 1/2/3 for severity and Ctrl+Enter to send still need the mouse to switch annotations.
**Fix:**
- Arrow Up/Down: move focus through annotation list entries (highlight with a focus ring).
- Enter on focused entry: open the annotation panel for that entry.
- Track focused index in sidebar state; reset on filter change.
**Effort:** 2-3 hours
**Tests:** Test arrow key navigation cycles through entries, Enter opens panel.

---

## Priority 3: Low Impact Polish

### UX-06: Filter tabs - incremental update instead of rebuild

**File:** `extension/lib/annotation-sidebar.js` (`refresh` function)
**Problem:** Filter tabs (Open/Resolved/All) are destroyed and recreated on every `refresh()` call. This causes a visual flash and loses hover state on the trash button.
**Fix:**
- On first render, create the tab bar once and store references to the count text nodes.
- On subsequent refreshes, update only the text content of existing tab buttons.
- Only rebuild if the number of tabs changes (it doesn't - always 3).
**Effort:** 30 minutes
**Tests:** Test that tab bar DOM nodes persist across refresh calls.

### UX-07: Hover-expand - switch to click-to-expand

**File:** `extension/lib/annotation-sidebar.js` (`createEntry` function)
**Problem:** 600ms hover triggers comment expansion, which shifts content below and can cause the mouse to leave the entry (collapsing it again). Jumpy interaction.
**Fix:**
- Remove the 600ms hover timer.
- Add a small expand/collapse chevron to entries with long comments (> ~40 chars).
- Click the chevron to toggle expansion. No layout shift on hover.
**Effort:** 30 minutes
**Tests:** Test that click toggles expansion, hover does not.

### UX-08: Inspect tab empty state

**File:** `extension/lib/annotation-sidebar.js` (`refreshInspect` function)
**Problem:** When no diagnostic issues exist, the Inspect tab shows only the viewport breakpoint and capture controls. No positive signal that the page is healthy.
**Fix:**
- After rendering all diagnostic sections, if none had issues (no failed network, no console errors, no visibility/stacking/focus/scroll/landmark warnings), show a green checkmark row: "No issues detected".
- Place it between the last diagnostic section and the capture controls separator.
**Effort:** 15 minutes
**Tests:** Test that "No issues detected" renders when all collectors return clean.

### UX-09: Report button feedback

**File:** `extension/lib/annotation-sidebar.js` (dlBtn click handler)
**Problem:** Report button shows "Saving..." for 2 seconds then reverts, regardless of whether the download succeeded. Send and Copy confirm success; Report doesn't.
**Fix:**
- Change the timeout text from "Saving..." to "Saved!" with a checkmark icon (matching Send and Copy pattern).
- If possible, listen for the `chrome.downloads.onChanged` event to confirm completion before showing success.
**Effort:** 15 minutes
**Tests:** Test that button shows "Saved!" after timeout.

### UX-10: Collapsed strip active state highlighting

**File:** `extension/lib/annotation-sidebar.js` (collapsed strip mode icons)
**Problem:** When a mode is active and the sidebar is collapsed, the strip mode icons don't show which mode is active. No visual feedback.
**Fix:**
- After `setCaptureMode()` in the strip click handler, update the strip icon styles: active mode gets `color: #fff; background: #6366f1`, others stay `color: #9ca3af; background: transparent`.
- Store references to strip mode buttons for updating.
**Effort:** 20 minutes
**Tests:** Test that strip icon gets active style when mode is set.

---

## Summary

| # | Task | Priority | Effort | Files |
|---|---|---|---|---|
| UX-01 | Fix collapsed strip mode toggle bug | P1 | 5 min | annotation-sidebar.js |
| UX-02 | Adaptive footer for disconnected state | P2 | 1-2 hr | annotation-sidebar.js |
| UX-03 | Separate capture controls in Inspect tab | P2 | 1-2 hr | annotation-sidebar.js |
| UX-04 | Mode bar collapse feedback toast | P2 | 1 hr | annotation-sidebar.js |
| UX-05 | Keyboard navigation in annotation list | P2 | 2-3 hr | keyboard-shortcuts.js, annotation-sidebar.js |
| UX-06 | Filter tabs incremental update | P3 | 30 min | annotation-sidebar.js |
| UX-07 | Click-to-expand instead of hover-expand | P3 | 30 min | annotation-sidebar.js |
| UX-08 | Inspect tab empty state | P3 | 15 min | annotation-sidebar.js |
| UX-09 | Report button feedback | P3 | 15 min | annotation-sidebar.js |
| UX-10 | Collapsed strip active state | P3 | 20 min | annotation-sidebar.js |

**Total estimated effort:** 8-11 hours
