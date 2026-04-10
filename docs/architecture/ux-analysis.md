# ViewGraph Extension UX Analysis

**Date:** 2026-04-10
**Status:** Analysis complete, recommendations pending implementation
**Scope:** Extension UI across all surfaces (popup, sidebar, overlay, options)

---

## 1. Current UI Surface Inventory

### 1.1 Popup (220px wide)

Entry point. Two buttons: Capture, Annotate. Settings toggles for output
format (JSON always-on, HTML snapshot, Screenshot). MCP connection status
dot with server URL tooltip. Gear icon toggles settings panel.

**Strengths:** Minimal, fast to scan, clear primary actions.
**Weaknesses:** No indication of what's been captured. No way to see
annotations without entering annotate mode. Dead-end after capture
(just shows "Captured N elements" then nothing).

### 1.2 Sidebar (300px fixed right)

Main workspace during annotation. Components top-to-bottom:
- Header: "ViewGraph: Review Notes" label, connection dot, gear, trash, close
- Mode bar: Element | Region | Page (three toggle buttons with icons)
- Filter tabs: Open (N) | Resolved (N) | All (N)
- Annotation list: scrollable, each entry shows #number, ancestor element
  badge, comment preview, severity/category chips, resolve/delete buttons
- Agent request cards: bell icon, URL, guidance text, "Capture" button
- Settings screen: replaces list when gear clicked (server info, project
  mapping, capture toggles)
- Footer: "Send to Agent" primary CTA, "Copy MD" and "Report" secondary

**Strengths:** Good information density. Filter tabs work well. Severity/
category chips are scannable. Collapse-to-badge behavior preserves screen
space during element selection.
**Weaknesses:** 300px is tight for long comments. Settings screen replaces
the list entirely (can't see annotations while checking settings). Mode bar
takes vertical space even when not switching modes. No search/sort. No
indication of capture enrichment data (network, console, breakpoints).

### 1.3 Annotation Panel (270px floating)

Appears near selected element. Shows: #number, delete/close buttons,
severity chip-select, multi-category chips, textarea for comment.

**Strengths:** Positioned near the element being annotated. Chip-select
pattern is compact. Multi-category selection works well.
**Weaknesses:** No preview of what the agent will see (DOM context, styles).
No way to see network errors or console errors related to the element.
Panel can overlap with sidebar on narrow viewports.

### 1.4 Options Page (full tab)

Project mapping configuration. Shows auto-detected server info (project
root, captures dir). Manual override toggle for multi-project setups.
URL pattern to captures directory mapping rows.

**Strengths:** Clean separation of advanced config from main UI.
**Weaknesses:** Rarely visited. Most users never need manual overrides.
Could be folded into sidebar settings.

### 1.5 Overlay (page-level)

Hover: blue highlight box + tooltip showing breadcrumb, CSS selector,
meta line (tag, role, testid, dimensions). Click: freezes selection,
shows copy-selector button. Scroll wheel: navigates DOM tree up/down.
Shift+drag: region selection with rubber-band box.

**Strengths:** Scroll-wheel DOM navigation is powerful and unique.
Breadcrumb tooltip gives immediate context. Freeze-on-click prevents
accidental deselection.
**Weaknesses:** No indication of element's isRendered status. No
network/console context. No breakpoint indicator. Tooltip doesn't show
accessibility info (role, name, states).

---

## 2. User Journeys

### 2.1 Developer with AI Agent (primary persona)

**Current journey:**
1. Open app in Chrome
2. Click ViewGraph icon -> popup opens
3. Click "Annotate" -> popup closes, sidebar opens, overlay activates
4. Click elements or shift+drag regions
5. Type comments in annotation panel
6. Set severity/category
7. Click "Send to Agent" in sidebar footer
8. Switch to IDE/CLI, ask agent about annotations
9. Agent fixes issues, marks resolved
10. Sidebar shows resolved status (after sync)

**Pain points:**
- Step 2-3: Two clicks to start annotating (icon + Annotate button).
  The popup is a speed bump. Most developers will always want Annotate.
- Step 7-8: Context switch from browser to IDE. No feedback that the
  agent received the annotations or is working on them.
- Step 9-10: Resolution sync requires polling. No real-time feedback.
- No way to see what enrichment data (network errors, console errors)
  will be sent with the capture. Developer can't verify "did it capture
  the 404 I'm seeing?"

**With M12-M15 features, new needs:**
- See network request failures inline (M12.1)
- See console errors inline (M12.2)
- See which breakpoint is active (M12.6)
- See isRendered status on hover (M13.3)
- Continuous capture on hot-reload (M14.1) - no manual capture step
- Bidirectional element linking (M15.1) - click element, see source file
- Regression baseline comparison (M15.2) - see what changed

### 2.2 Tester / QA (secondary persona)

**Current journey:**
1. Open app in Chrome
2. Click ViewGraph icon -> Annotate
3. Annotate issues with comments, severity, category
4. Click "Copy MD" -> paste into Jira/Linear/GitHub
5. OR click "Report" -> download ZIP with markdown + screenshots

**Pain points:**
- Same popup speed bump as developer
- No way to attach network/console context to bug reports
- Copy MD doesn't include screenshots (only Report ZIP does)
- No way to compare current state against a known-good baseline

**With new features, new needs:**
- Include network failures in bug reports (M12.1)
- Include console errors in bug reports (M12.2)
- Record a user journey across pages (M14.2)
- Compare against baseline to prove regression (M15.2)

### 2.3 Reviewer / Design QA (tertiary persona)

**Current journey:**
1. Open app, enter annotate mode
2. Check visual consistency across pages
3. Annotate deviations from design spec
4. Export as markdown or send to developer

**Pain points:**
- No cross-page comparison tool
- No way to check component consistency (same header on 10 pages)
- No design token validation (is this really the right shade of blue?)

**With new features, new needs:**
- Cross-page consistency checker (M15.3)
- State machine visualization (M15.4)

---

## 3. UX Gaps and Friction Points

### 3.1 The Popup Speed Bump

**Problem:** Every session starts with: click icon -> see popup -> click
Annotate. The popup's Capture button is rarely used standalone (agents
request captures via MCP). The popup exists mainly as a gateway to
annotate mode.

**Recommendation:** Make the toolbar icon a direct toggle for annotate
mode (like React DevTools). First click enters annotate mode, second
click exits. Move the popup to a long-press or right-click context menu
for the rare "capture without annotating" case.

**Impact:** Saves one click on every session. Reduces time-to-first-annotation.

### 3.2 Enrichment Data is Invisible

**Problem:** The extension now captures network requests, console errors,
breakpoints, and isRendered status - but none of this is visible in the
UI. The user can't verify what's being captured or use it to inform their
annotations.

**Recommendation:** Surface enrichment data in a dedicated Inspect tab
(see Section 4.1). Users can reference network/console data when writing
annotations. Bug reports become more precise.

**Impact:** Users can verify "did it capture the 404?" before sending.

### 3.3 No Element-Level Context in Overlay

**Problem:** The hover tooltip shows breadcrumb + selector + dimensions but
not: accessibility info, isRendered status, console errors from this component.

**Recommendation:** Expand the tooltip to show a11y info, isRendered warnings,
and related console errors (see Section 4.5).

**Impact:** Developer gets immediate context without opening DevTools.

### 3.4 Sidebar is Overloaded

**Problem:** The sidebar serves too many roles: annotation list, settings,
agent request queue, capture controls. The settings screen replaces the
annotation list entirely.

**Recommendation:** Split into two tabs: Review (human feedback) and
Inspect (page state). Settings become a slide-over overlay (see Section 4.4).

**Impact:** Each tab has a focused purpose. Settings don't hide annotations.

### 3.5 No Capture History or Comparison

**Problem:** The extension captures pages but doesn't show capture history.
The server has `compare_captures` but there's no UI for it.

**Recommendation:** Add capture history to the Inspect tab with baseline
management and structural diff (see Section 4.4).

**Impact:** Enables regression baseline workflow from the extension UI.

### 3.6 Export Doesn't Include Enrichment Data

**Problem:** "Copy MD" and "Report" export annotations but not network
errors, console errors, or breakpoint context.

**Recommendation:** Include enrichment summary in exports (see Section 4.6).

**Impact:** Bug reports are self-contained with full debugging context.

---

## 4. Redesign: Two-Tab Sidebar Model

### 4.1 Core Principle: Two Mental Modes

Every user interaction with ViewGraph falls into one of two modes:

- **"I'm telling the agent what's wrong"** - annotating, commenting, exporting
- **"I'm understanding what's happening"** - checking network, console, history, diffs

These map to two sidebar tabs:

| Tab | Purpose | Contains |
|---|---|---|
| **Review** | Human-authored feedback | Annotations, filters, severity/category, agent requests, Send/Copy/Report |
| **Inspect** | Machine-observed page state | Network, console, breakpoints, isRendered, capture history, diffs, baselines |

**Why two tabs, not three:** An earlier draft split this into Notes/Diagnostics/
History. But "diagnostics" (network errors, console) and "history" (captures,
diffs) are both answers to the same question: "what is the page doing?" They're
reference data the user consults, not tasks the user acts on. Merging them
avoids a tab that's too thin to justify and reduces cognitive load.

### 4.2 Journey Validation Against Two-Tab Model

Each persona's journey was walked against this model to verify it holds:

**Developer annotating a bug:**
1. Click icon -> annotate mode (direct toggle, no popup)
2. Sidebar opens on **Review** (default) - annotate elements, set severity
3. Wonders "is there a network error causing this?" -> clicks **Inspect**
4. Sees failed request, copies context back to annotation comment
5. Back to **Review** -> "Send to Agent"

The tab switch at step 3 is natural: "let me check what's going on" is a
distinct mental shift from "let me describe what's wrong."

**Developer verifying a fix:**
1. Agent says "fixed, capture to verify"
2. Click icon -> sidebar opens, clicks **Inspect**
3. Sees latest capture, clicks "Compare with previous"
4. Sees diff: "button restored, padding fixed" - done

Entire journey stays in Inspect. Review tab never touched.

**Tester filing a bug report:**
1. Click icon -> annotate mode
2. **Review**: annotate 3 issues, set severity/category
3. "Copy MD" -> paste into Jira - done

Entire journey stays in Review. Inspect tab never touched.

**Developer debugging a hidden element:**
1. Hover over element, tooltip shows `! Hidden: ancestor opacity: 0`
2. Click **Inspect** -> sees isRendered warning, console error, breakpoint "md"
3. Realizes it's a responsive issue, fixes directly without annotating

Inspect tab serves as lightweight DevTools alternative.

**Agent requests a capture:**
Agent requests appear at the top of **Review** tab. They're actionable tasks
for the user (like annotations are actionable tasks for the agent). The
request card has a "Capture" button - that's an action, not reference data.

**Journey recording (M14.2, future):**
Record button lives in the mode bar (it's a capture mode). Journey results
appear in **Inspect** under History. Recording controls are actions; results
are reference data.

### 4.3 Priority 1: Quick-Start (eliminate popup speed bump)

- Toolbar icon click -> direct toggle annotate mode (like React DevTools)
- Right-click icon -> context menu with Capture, Settings, Options
- Remove popup.html (keep as fallback for non-injectable pages only)

### 4.4 Priority 2: Two-Tab Sidebar Layout

**Review tab** (default when entering annotate mode):
- Mode bar: Element | Region | Page
- Agent request cards (if any pending)
- Filter tabs: Open (N) | Resolved (N) | All (N)
- Annotation list with severity/category chips
- Footer: Send to Agent | Copy MD | Report

**Inspect tab:**
- Breakpoint indicator: active range + viewport width
- Network section: collapsible, failed requests highlighted, count badge
- Console section: collapsible, errors/warnings with stack traces
- Visibility warnings: elements hidden by ancestors
- Capture history: timestamped list for current page
- Baseline indicator + "Compare" action
- Diff summary (when comparing)
- Journey entries (when M14.2 ships)

Settings remain as a slide-over panel (gear icon) that overlays either tab
without replacing content.

### 4.5 Priority 3: Enhanced Overlay Tooltip

Expand hover tooltip from 2 lines to up to 5 (conditional):

```
body > main > div.card > button          (breadcrumb - always)
button[data-testid="submit"]             (selector - always)
role: button | name: "Submit Form"       (a11y - new, always for interactive)
! Not rendered (ancestor opacity: 0)     (isRendered - new, only when false)
! console.error: Missing provider        (console - new, only when matched)
```

Lines 3-5 only appear when relevant. Color-coded: a11y in blue,
isRendered warning in orange, console error in red.

### 4.6 Priority 4: Enrichment in Exports

Markdown export adds an Environment section:
```markdown
## Environment
- Viewport: 1440x900 (xl breakpoint)
- Failed requests: GET /api/users (0 bytes)
- Console errors: 1 error, 2 warnings
  - Error: "No QueryClient set, use QueryClientProvider"
```

ZIP report includes `network.json` and `console.json` alongside `report.md`.

### 4.7 Priority 5: Source Linking (when M15.1 ships)

In freeze tooltip, add source line:
```
Source: PulseCard.tsx:42  [copy]
```

In annotation panel, add source context below the element badge.

### 4.8 Priority 6: Continuous Capture UI (when M14.1 ships)

- Toggle in Inspect tab: "Auto-capture on reload"
- Pulsing green indicator in sidebar header when active
- Toast notification on each auto-capture with diff summary
- Auto-diffs appear in Inspect tab history section

### 4.9 Priority 7: Journey Recording UI (when M14.2 ships)

- Record button in mode bar (red circle icon)
- Recording indicator in header (red dot + duration)
- Journey entries in Inspect tab history section
- Stop + export controls

---

## 5. Implementation Phases

### Phase A: Quick wins (no new features needed)

1. Direct-toggle annotate mode from toolbar icon
2. Enhanced tooltip with a11y info
3. Enrichment data in exports (network/console in markdown + ZIP)

### Phase B: Two-tab sidebar (M12 features visible)

4. Review + Inspect tab layout
5. Inspect tab: network/console/breakpoint/visibility panels
6. Settings as slide-over overlay

### Phase C: History and comparison (M15.2 prerequisite)

7. Capture history list in Inspect tab
8. Baseline management (set/compare)
9. Structural diff visualization

### Phase D: Real-time features (M14.1, M14.2)

10. Continuous capture toggle + status indicator
11. Journey recording controls
12. Auto-diff in Inspect tab

### Phase E: Source linking (M15.1)

13. Source file display in tooltip and annotation panel
14. Click-to-copy source reference

---

## 6. Wireframe Sketches

### 6.1 Review Tab (default)

```
+------------------------------------------+
| VG  [*]        [Review] [Inspect]  [x]  |
+------------------------------------------+
| [Element] [Region] [Page]               |
+------------------------------------------+
| Agent Request: capture localhost:3000    |
| "Check login form after fix"  [Capture] |
+------------------------------------------+
| Open (3) | Resolved (1) | All (4)       |
+------------------------------------------+
| #1 button.submit  Fix padding            |
|    ! Critical  Visual                    |
| #2 div.card  Wrong background color      |
|    ! Major  Visual                       |
| #3 input.email  Add aria-label           |
|    ! Minor  A11y                         |
+------------------------------------------+
| [====== Send to Agent ======]            |
| [Copy MD]  [Report]                      |
+------------------------------------------+
```

### 6.2 Inspect Tab

```
+------------------------------------------+
| VG  [*]        [Review] [Inspect]  [x]  |
+------------------------------------------+
|                                          |
| BREAKPOINT                               |
| [md] 768px                               |
|                                          |
| NETWORK                          [1 err] |
| v GET /api/users        0B   FAILED     |
|   GET /api/config     1.2KB  234ms      |
|   GET /styles.css     8.4KB   45ms      |
|                                          |
| CONSOLE                    [1 err 2 wrn] |
| v Error: No QueryClient set, use        |
|   QueryClientProvider to set one         |
|   at App.tsx:12                          |
| > Warn: Deprecated prop 'size'          |
| > Warn: Missing key prop                |
|                                          |
| VISIBILITY                       [2 wrn] |
| ! div#overlay - ancestor opacity: 0     |
| ! span.sr-only - off-screen positioned  |
|                                          |
| CAPTURES                                 |
| * 16:30:15  375 nodes  [baseline]       |
|   16:28:42  372 nodes  [compare]        |
|   16:25:01  370 nodes                    |
|                                          |
| DIFF vs BASELINE                         |
| +3 elements added                        |
| -0 elements removed                      |
| ~2 layout shifts                         |
| 1 testid removed: btn-unlink            |
|                                          |
+------------------------------------------+
```

### 6.3 Enhanced Tooltip

Normal element:
```
+------------------------------------------------+
| body > main > div.card > button                |
| button[data-testid="submit-form"]              |
| role: button | name: "Submit Form" | focusable |
| Source: LoginForm.tsx:87                        |
+------------------------------------------------+
```

Element with warnings (conditional lines):
```
+------------------------------------------------+
| body > div.modal > div.overlay                 |
| div.overlay                                    |
| role: dialog | name: "Settings"                |
| ! Hidden: ancestor has opacity: 0              |
| ! Error: Cannot read property 'map' of null    |
+------------------------------------------------+
```

### 6.4 Settings Slide-Over

Overlays current tab content (doesn't replace it):
```
+------------------------------------------+
| < Settings                               |
+------------------------------------------+
| SERVER                                   |
| * Connected (localhost:3100)             |
| Project: /home/user/myapp               |
| Captures: .viewgraph/captures           |
|                                          |
| CAPTURE INCLUDES                         |
| ViewGraph JSON          [====]           |
| HTML snapshot           [    ]           |
| Screenshot              [    ]           |
|                                          |
| AUTO-CAPTURE                             |
| Capture on reload       [    ]           |
|                                          |
| [Advanced settings...]                   |
+------------------------------------------+
```
