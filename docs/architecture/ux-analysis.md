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

**Recommendation:** Add an enrichment panel to the sidebar with three
collapsible sections:
- **Network:** Failed requests (red), slow requests (yellow), count badge
- **Console:** Error count (red badge), warning count (yellow badge),
  expandable list
- **Breakpoints:** Current active range name + viewport width

This panel should be a tab alongside the annotation list, not a replacement.

**Impact:** Users can reference network/console data when writing annotations.
Bug reports become more precise ("the 404 on /api/users causes this empty state").

### 3.3 No Element-Level Context in Overlay

**Problem:** The hover tooltip shows breadcrumb + selector + dimensions but
not: accessibility info, isRendered status, network requests initiated by
this element, console errors from this component.

**Recommendation:** Expand the tooltip to show:
- Line 1: breadcrumb (existing)
- Line 2: selector (existing)
- Line 3: role + accessible name + states (new)
- Line 4: isRendered status if false (new, warning color)
- Line 5: related console errors if any (new, red)

Keep it compact - only show lines 3-5 when relevant (non-empty).

**Impact:** Developer gets immediate context without opening DevTools.

### 3.4 Sidebar is Overloaded

**Problem:** The sidebar serves too many roles: annotation list, settings,
agent request queue, capture controls. The settings screen replaces the
annotation list entirely. The mode bar takes permanent vertical space.

**Recommendation:** Restructure sidebar into tabs:
- **Notes** (default): annotation list + filter tabs (current behavior)
- **Diagnostics**: network/console/breakpoints enrichment data
- **History**: capture history, baseline comparisons, journey recordings

Move settings to a slide-over panel that overlays rather than replaces.
Move mode bar into the overlay itself (floating toolbar near cursor).

**Impact:** Each tab has a focused purpose. Settings don't hide annotations.

### 3.5 No Capture History or Comparison

**Problem:** The extension captures pages but doesn't show capture history.
Users can't see what was captured, when, or compare before/after. The
server has `compare_captures` but there's no UI for it.

**Recommendation:** Add a History tab to the sidebar showing:
- List of captures for current page (timestamped)
- "Set as baseline" action per capture
- "Compare with previous" action showing structural diff
- Badge showing regression count vs baseline

**Impact:** Enables the regression baseline workflow (M15.2) from the
extension UI, not just via MCP tools.

### 3.6 No Journey Recording UI

**Problem:** M14.2 proposes user journey recording but there's no UI to
start/stop recording, view the journey, or replay it.

**Recommendation:** Add a record button to the mode bar (or floating
toolbar). When recording:
- Red dot indicator in sidebar header
- Each navigation auto-captures and adds a timestamped entry
- Stop button ends recording and shows the journey as a linked sequence
- Export journey as a series of captures

**Impact:** Enables the journey recording workflow without CLI.

### 3.7 No Bidirectional Linking UI

**Problem:** M15.1 proposes clicking an element to see its source file,
but there's no UI for displaying this information.

**Recommendation:** When an element is frozen (clicked), show a "Source"
line in the tooltip or annotation panel:
- `PulseCard.tsx:42` (if React component detected)
- `[data-testid="pulse-card"]` -> grep result
- Click to copy the file:line reference

**Impact:** Eliminates the "which file renders this?" guessing game.

### 3.8 Continuous Capture Needs a Status Indicator

**Problem:** M14.1 proposes auto-capture on hot-reload, but the user needs
to know it's active and see the results.

**Recommendation:** When continuous capture is enabled:
- Pulsing green dot in sidebar header (distinct from connection dot)
- Toast notification on each auto-capture: "Auto-captured: 3 elements
  shifted, 1 added"
- Auto-diff appears in the History tab

**Impact:** User trusts the system is working without manual verification.

### 3.9 Export Doesn't Include Enrichment Data

**Problem:** "Copy MD" and "Report" export annotations but not network
errors, console errors, or breakpoint context. Bug reports miss crucial
debugging context.

**Recommendation:** Include enrichment summary in exports:
- Markdown: add "## Environment" section with breakpoint, viewport,
  failed requests, console errors
- ZIP report: include network.json and console.json alongside markdown

**Impact:** Bug reports are self-contained. Developers don't need to
reproduce to see the network/console state.

---

## 4. Redesign Recommendations

### 4.1 Priority 1: Quick-Start (eliminate popup speed bump)

- Toolbar icon click -> direct toggle annotate mode
- Right-click icon -> context menu with Capture, Settings, Options
- Remove popup.html entirely (or keep as fallback for non-injectable pages)

### 4.2 Priority 2: Sidebar Tab Restructure

Replace single-purpose sidebar with three tabs:

```
[Notes] [Diagnostics] [History]
```

**Notes tab** (current default):
- Mode bar (Element | Region | Page)
- Filter tabs (Open | Resolved | All)
- Annotation list
- Footer: Send to Agent | Copy MD | Report

**Diagnostics tab** (new):
- Breakpoint indicator: "md (768px)" with active range highlight
- Network section: failed count badge, expandable request list
- Console section: error/warning count badges, expandable message list
- isRendered warnings: elements that are hidden by ancestors

**History tab** (new):
- Capture list for current page (timestamped)
- Baseline indicator (star icon on baseline capture)
- Diff summary between captures
- Journey recording controls (when M14.2 ships)

### 4.3 Priority 3: Enhanced Overlay Tooltip

Expand hover tooltip from 2 lines to up to 5:

```
body > main > div.card > button          (breadcrumb)
button[data-testid="submit"]             (selector)
role: button | name: "Submit Form"       (a11y - new)
! Not rendered (ancestor opacity: 0)     (isRendered - new, conditional)
! console.error: Missing provider        (console - new, conditional)
```

Lines 3-5 only appear when relevant. Color-coded: a11y in blue,
isRendered warning in orange, console error in red.

### 4.4 Priority 4: Enrichment in Exports

Add to markdown export:
```markdown
## Environment
- Viewport: 1440x900 (xl breakpoint)
- Failed requests: GET /api/users (0 bytes)
- Console errors: 1 error, 2 warnings
  - Error: "No QueryClient set, use QueryClientProvider"
```

Add to ZIP report: `network.json`, `console.json` alongside `report.md`.

### 4.5 Priority 5: Source Linking (when M15.1 ships)

In freeze tooltip, add source line:
```
Source: PulseCard.tsx:42  [copy]
```

In annotation panel, add source context:
```
Element: button[data-testid="submit"]
Source:  LoginForm.tsx:87
```

### 4.6 Priority 6: Continuous Capture UI (when M14.1 ships)

- Toggle in sidebar settings: "Auto-capture on reload"
- Pulsing indicator in header when active
- Toast notifications for auto-captures
- Auto-diffs appear in History tab

### 4.7 Priority 7: Journey Recording UI (when M14.2 ships)

- Record button in mode bar (red circle icon)
- Recording indicator in header (red dot + duration)
- Journey entries in History tab (linked sequence)
- Stop + export controls

---

## 5. Implementation Phases

### Phase A: Quick wins (no new features needed)

1. Direct-toggle annotate mode from toolbar icon
2. Enhanced tooltip with a11y info
3. Enrichment data in exports (network/console in markdown + ZIP)

### Phase B: Sidebar restructure (M12 features visible)

4. Three-tab sidebar (Notes | Diagnostics | History)
5. Diagnostics tab with network/console/breakpoint panels
6. isRendered warnings in tooltip and diagnostics

### Phase C: History and comparison (M15.2 prerequisite)

7. History tab with capture list
8. Baseline management (set/compare)
9. Structural diff visualization

### Phase D: Real-time features (M14.1, M14.2)

10. Continuous capture toggle + status indicator
11. Journey recording controls
12. Auto-diff in History tab

### Phase E: Source linking (M15.1)

13. Source file display in tooltip and annotation panel
14. Click-to-copy source reference

---

## 6. Wireframe Sketches

### 6.1 Redesigned Sidebar (Phase B)

```
+------------------------------------------+
| VG: Review Notes  [*] [gear] [trash] [x] |
+------------------------------------------+
| [Notes]  [Diagnostics]  [History]        |
+------------------------------------------+
|                                          |  <- tab content area
| (Notes tab shown by default)             |
|                                          |
| [Element] [Region] [Page]               |
|                                          |
| Open (3) | Resolved (1) | All (4)       |
| ---------------------------------------- |
| #1 button.submit  Fix padding            |
|    ! Critical  Visual                    |
| #2 div.card  Wrong background color      |
|    ! Major  Visual                       |
| #3 input.email  Add aria-label           |
|    ! Minor  A11y                         |
|                                          |
+------------------------------------------+
| [====== Send to Agent ======]            |
| [Copy MD]  [Report]                      |
+------------------------------------------+
```

### 6.2 Diagnostics Tab

```
+------------------------------------------+
| VG: Review Notes  [*] [gear] [trash] [x] |
+------------------------------------------+
| [Notes]  [Diagnostics]  [History]        |
+------------------------------------------+
|                                          |
| BREAKPOINT                               |
| [md] 768px  (min-width: 768px active)   |
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
+------------------------------------------+
```

### 6.3 History Tab (Phase C)

```
+------------------------------------------+
| VG: Review Notes  [*] [gear] [trash] [x] |
+------------------------------------------+
| [Notes]  [Diagnostics]  [History]        |
+------------------------------------------+
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
| JOURNEY (recording...)          [stop]   |
| 1. /login        16:20:01               |
| 2. /dashboard    16:20:15               |
| 3. /settings     16:20:32               |
|                                          |
+------------------------------------------+
```

### 6.4 Enhanced Tooltip

```
+------------------------------------------------+
| body > main > div.card > button                |
| button[data-testid="submit-form"]              |
| role: button | name: "Submit Form" | focusable |
| Source: LoginForm.tsx:87                        |
+------------------------------------------------+
```

With warnings (conditional lines):
```
+------------------------------------------------+
| body > div.modal > div.overlay                 |
| div.overlay                                    |
| role: dialog | name: "Settings"                |
| ! Hidden: ancestor has opacity: 0              |
| ! Error: Cannot read property 'map' of null    |
+------------------------------------------------+
```
