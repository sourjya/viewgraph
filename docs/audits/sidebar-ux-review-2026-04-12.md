# ViewGraph Sidebar UX Review

**Date:** 2026-04-12
**Scope:** Sidebar layout, button organization, tab structure, interaction patterns, information architecture
**Method:** Code-level analysis of `annotation-sidebar.js` (1100+ lines), `annotation-panel.js`, `keyboard-shortcuts.js`, and `ux-analysis.md`

---

## Executive Summary

The sidebar is well-architected for its two core mental modes (annotate vs. diagnose). The two-tab model, severity-as-badge-color decision, and floating panel separation are strong design choices. However, the implementation has accumulated feature density that creates several UX friction points: the footer export area conflates primary and secondary actions, the Inspect tab mixes diagnostic data with capture controls, the collapsed strip has a dead interaction bug, and the mode bar's collapse-on-activate behavior is disorienting. Below is a detailed breakdown.

---

## What Works Well

### 1. Two-Tab Mental Model (Review / Inspect)

The split between "I'm telling the agent what's wrong" and "I'm understanding what's happening" is clean and well-executed. Each tab has a clear purpose. The user journey analysis in `ux-analysis.md` validates this - the tab switch at step 4 of the developer annotation flow is natural.

### 2. Severity Encoded in Badge Color

Moving severity from a chip in the list to a color on the number badge was the right call. The earlier design (outlined severity chips + filled category chips per entry) created visual noise. The current approach gives one-glance severity scanning without extra vertical space. Category editing correctly lives in the panel, not the list.

### 3. Floating Annotation Panel Separation

The panel is the editor; the sidebar list is the scanner. This separation prevents the list from becoming a form. The panel positions itself intelligently (avoids sidebar overlap, respects viewport edges) and includes contextual element diagnostics - a nice touch that surfaces a11y hints at the moment of annotation.

### 4. Shadow DOM Isolation

Wrapping the sidebar in Shadow DOM prevents host page CSS from breaking the UI. This is essential for a tool that runs on arbitrary websites and is correctly implemented.

### 5. Agent Request Cards

Placing capture requests in the Review tab (not Inspect) is correct - they're actionable tasks, not diagnostic data. The purpose icons (bell/magnifier/checkmark), guidance text with left-border accent, and Accept/Decline buttons are well-designed. The fade-out animation on accept/decline gives clear feedback.

### 6. Confirmation Dialog for Destructive Actions

Replacing `window.confirm()` with a themed card overlay was the right move. The dark card with red border, trash icon, and Cancel/Clear All buttons matches the sidebar aesthetic and avoids the jarring native dialog.

---

## What Could Improve

### 7. Footer: Primary vs. Secondary Action Hierarchy is Weak

**Current state:** The footer has "Send to Agent" (full-width primary CTA) above a row of "Copy MD" and "Report" (secondary, outlined buttons). All three are always visible.

**Problem:** When the server is disconnected, "Send to Agent" is disabled (opacity 0.4, cursor not-allowed) but still occupies the most prominent position. The user's only available actions (Copy MD, Report) are visually subordinate. The footer doesn't adapt to context.

**Recommendation:** When disconnected, promote Copy MD and Report to primary visual weight (filled background, larger). Optionally collapse the disabled Send button to a single line ("Connect server to send to agent") instead of a full-width disabled button that wastes space and draws the eye to something unusable.

### 8. Mode Bar Collapse Behavior is Disorienting

**Current state:** Clicking Element or Region mode collapses the sidebar to the strip. Clicking the same mode again expands it. Page mode doesn't collapse - it adds a note and stays expanded.

**Problem:** The sidebar disappearing when you click a mode button is unexpected. The user clicked a mode selector, not a "hide sidebar" button. The intent was "I want to select elements" - the sidebar collapsing is a side effect that requires the user to understand the implementation reason (sidebar covers the page). This is a learnability issue.

**Recommendation:** Instead of collapsing, narrow the sidebar to the strip width but keep the mode buttons visible and highlighted. Or add a brief tooltip/toast ("Sidebar collapsed - click elements on the page") so the user understands what happened and how to get back. The current behavior is discoverable only by accident.

### 9. Inspect Tab Mixes Diagnostic Data with Capture Controls

**Current state:** The Inspect tab contains, in order:
1. Viewport breakpoint (diagnostic)
2. Network requests (diagnostic)
3. Console errors (diagnostic)
4. Visibility warnings (diagnostic)
5. Stacking/Focus/Scroll/Landmark issues (diagnostic)
6. `<hr>` separator
7. Auto-capture toggle (control)
8. Record Flow start/stop (control)
9. Session note input (control)
10. Snapshots count + capture ID (status)

**Problem:** Items 7-10 are not diagnostics - they're capture management controls. The user comes to Inspect to understand the page, but the bottom half is about managing captures. This violates the tab's stated purpose ("I'm understanding what's happening"). The `<hr>` separator acknowledges the mismatch but doesn't resolve it.

**Recommendation:** Consider one of:
- Move capture controls (auto-capture, record flow, snapshots) to a third tab or to the settings overlay
- Move them to the Review tab footer area (they're about creating captures, which is an action)
- Keep them in Inspect but under a clearly labeled collapsible section ("Capture Controls") so they don't intermingle with diagnostic data

### 10. Collapsed Strip Has a Bug and Limited Utility

**Current state:** The collapsed strip shows an expand chevron, three mode icons (Element/Region/Page), and an annotation count bubble.

**Bug:** Line 1265 references `captureMode` (undefined variable) instead of `getCaptureMode()`. The mode toggle in the collapsed strip is broken - it can never detect the current mode to toggle off.

**UX issue:** The strip's mode icons duplicate the mode bar in the expanded sidebar. When collapsed, the user can click Element mode, but there's no visual feedback that it activated (no highlight state on the strip icons). The strip also has no access to the Inspect tab, export buttons, or filter tabs - it's a very limited view.

**Recommendation:** Fix the bug (`captureMode` -> `getCaptureMode()`). Add active-state highlighting to strip mode icons. Consider whether the strip needs mode icons at all - the primary use case for the collapsed state is "I'm actively selecting elements on the page" which means a mode is already active. The strip could just show the expand button + annotation count.

### 11. Filter Tabs Rebuild on Every Refresh

**Current state:** The filter tabs (Open/Resolved/All) and the trash button are rebuilt from scratch on every `refresh()` call. The `refresh()` function clears `tabContainer.innerHTML` and reconstructs the tabs.

**Problem:** This causes a flash when the user clicks a filter tab - the tab they just clicked is destroyed and recreated. If the user is mid-interaction (e.g., hovering over trash), the hover state is lost. It also means the trash button's event listener is re-attached on every annotation change.

**Recommendation:** Only rebuild the tab labels (to update counts) rather than destroying and recreating the entire tab bar. Or use a diffing approach - update text content of existing elements instead of replacing them.

### 12. No Keyboard Navigation in the Annotation List

**Current state:** Keyboard shortcuts exist for Esc (deselect), Ctrl+Enter (send), 1/2/3 (severity), Delete (remove). But there's no way to navigate between annotations using the keyboard (arrow up/down, Tab between entries).

**Problem:** Power users who use keyboard shortcuts for severity and send have to reach for the mouse to switch between annotations. The keyboard flow is incomplete.

**Recommendation:** Add arrow key navigation through the annotation list (up/down to move focus, Enter to open panel for focused annotation). This completes the keyboard-driven workflow.

### 13. Settings Overlay Positioning

**Current state:** The settings screen is `position: absolute` with `inset: 0` inside the sidebar, covering all content.

**Problem:** The settings screen covers the footer (export buttons). If the user opened settings to check the server connection before sending, they have to close settings, then click Send. Two steps instead of one.

**Recommendation:** Minor issue. Could show a mini connection status indicator in the footer itself (the status dot is already in the header, but the footer is where the action happens). Or keep settings as-is - it's a low-frequency interaction.

### 14. Annotation List Entry Hover Expand Timing

**Current state:** Hovering over an annotation entry for 600ms expands the comment text from single-line to multi-line (up to 120px max-height).

**Problem:** 600ms is long enough that fast scanners never see it, but short enough that it triggers during normal reading. The expansion shifts content below the hovered entry, which can cause the mouse to leave the entry, collapsing it again - a "jumpy" interaction.

**Recommendation:** Consider click-to-expand instead of hover-to-expand. Or use a tooltip/popover that doesn't shift the list layout. The current approach tries to serve both "quick scan" and "read full comment" but the layout shift undermines both.

### 15. No Empty State Guidance for Inspect Tab

**Current state:** When the Inspect tab has no issues (no failed requests, no console errors, no visibility warnings), the user sees only the viewport breakpoint, the auto-capture toggle, and the record flow button. The diagnostic sections simply don't render.

**Problem:** The absence of sections could be confusing - "is it working? Did it check?" There's no positive signal that the page is healthy.

**Recommendation:** Add a brief "All clear" or checkmark indicator when no diagnostic issues are found. The Console section already does this (`"No errors or warnings captured"` with a green checkmark) but the pattern isn't applied to the overall tab.

### 16. Export Button Feedback is Inconsistent

**Current state:**
- Send to Agent: changes to green checkmark "Sent!" for 2 seconds
- Copy MD: changes to green checkmark "Copied!" for 2 seconds
- Report: changes to clock icon "Saving..." for 2 seconds

**Problem:** "Saving..." implies the operation is in progress, but the button reverts after 2 seconds regardless of whether the ZIP was actually saved. The Report button doesn't confirm success - it just times out. Send and Copy have clear success states; Report doesn't.

**Recommendation:** Listen for the download completion event (or at least use "Saved!" instead of "Saving..." after the timeout). Match the pattern of the other two buttons.

---

## Summary Table

| # | Item | Severity | Effort |
|---|---|---|---|
| 7 | Footer doesn't adapt to disconnected state | Medium | Low |
| 8 | Mode bar collapse is disorienting | Medium | Medium |
| 9 | Inspect tab mixes diagnostics with capture controls | Medium | Medium |
| 10 | Collapsed strip has bug + no active state | High (bug) | Low |
| 11 | Filter tabs rebuild on every refresh | Low | Low |
| 12 | No keyboard navigation in annotation list | Medium | Medium |
| 13 | Settings covers footer | Low | Low |
| 14 | Hover-expand causes layout shift | Low | Low |
| 15 | No empty state for Inspect tab | Low | Low |
| 16 | Report button feedback inconsistent | Low | Low |

**Recommended priority order:** #10 (bug fix), #7, #9, #8, #12, then the rest.
