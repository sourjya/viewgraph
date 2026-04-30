# ViewGraph Extension UX Design

**Date:** 2026-04-10
**Status:** Phase A and B shipped. Phase C-E planned for future milestones.

---

## 1. Design Principle: Two Mental Modes

Every user interaction with ViewGraph falls into one of two modes:

- **"I'm telling the agent what's wrong"** - annotating, commenting, exporting
- **"I'm understanding what's happening"** - checking network, console, history

These map to two sidebar tabs: **Review** and **Inspect**.

An earlier draft split this into three tabs (Notes / Diagnostics / History).
But diagnostics and history are both answers to the same question: "what is
the page doing?" They're reference data the user consults, not tasks the
user acts on. Two tabs reduces cognitive load and avoids a tab too thin to
justify.

---

## 2. UI Surfaces (Current)

### 2.1 Toolbar Icon

Single-click toggles annotate mode directly (like React DevTools). No popup
intermediary on injectable pages. The popup only appears as a fallback on
non-injectable pages (chrome://, about:, extensions).

### 2.2 Overlay

Hover highlights elements with a blue box and a fixed 2-line tooltip:

```
body > main > form > input.form-control
testid: email-input | role: textbox (implicit) | 330x38
```

The tooltip is always exactly 2 lines. This was a deliberate decision -
an earlier version showed 3-5 conditional lines (a11y info, isRendered
warnings, console errors) but the variable height was disorienting. Users
had to re-parse the layout on every hover. The detail now lives in the
sidebar instead (see Section 2.3).

Other overlay interactions:
- Click: freezes selection, shows copy-selector button
- Scroll wheel: navigates up/down the DOM tree
- Shift+drag: region selection with rubber-band box

### 2.3 Sidebar (300px, fixed right)

Two-tab layout with shared header:

```
+------------------------------------------+
| VG  [*]  [gear]  [>]  [x]              |
+------------------------------------------+
| [Review]  [Inspect]                      |
+------------------------------------------+
| (tab content)                            |
+------------------------------------------+
```

Header contains: connection status dot, gear (settings overlay), collapse
chevron, close button.

#### Review Tab (default)

For annotating and exporting. Contains:

- **Mode bar:** Element | Region | Page (three toggle buttons)
- **Agent request cards:** pending capture requests from the AI agent,
  each with a "Capture" button. These are actionable tasks for the user,
  which is why they live in Review (not Inspect).
- **Filter tabs:** Open (N) | Resolved (N) | All (N) | trash icon
- **Annotation list:** one clean line per entry:
  - Number badge (color encodes severity: red = critical, yellow = major,
    gray = minor, purple = no severity)
  - Ancestor element badge (monospace, blue)
  - Comment text (truncates, expands on 600ms hover)
  - Resolve and delete buttons on the right
- **Footer:** "Send to Agent" primary CTA, "Copy MD" and "Report" secondary

Design decision on sidebar entries: an earlier version showed severity as
outlined chips and categories as filled chips on a second row below each
comment. This created a wall of colorful badges that was noisy and hard to
scan. The current design encodes severity in the badge color (one visual
signal, zero extra space) and moves category to the annotation panel
(visible when you click to edit). The sidebar list is for scanning; the
panel is for editing.

#### Inspect Tab

For understanding page state. Contains:

- **Breakpoint indicator:** always visible, shows active range name and
  viewport width (e.g. `[md] 768px`)
- **Network section:** collapsible with arrow toggle. Badge shows failed
  count in red. Expanded view lists requests with method, path, size.
  Failed requests highlighted in red.
- **Console section:** collapsible. Badge shows error/warning counts.
  Expanded view lists error messages in red, warnings in yellow.
- **Visibility section:** collapsible, only appears when issues exist.
  Lists elements hidden by ancestor (opacity: 0, clip-path). These are
  elements that pass their own visibility check but are invisible because
  a parent hides them.

All sections refresh from live page data each time the user switches to
the Inspect tab. This means the data is always current - no stale state.

Future additions to Inspect (not yet built):
- Capture history with timestamps (Phase C, depends on M15.2)
- Baseline management and structural diff (Phase C)
- Journey recording entries (Phase D, depends on M14.2)
- Continuous capture status indicator (Phase D, depends on M14.1)

### 2.4 Annotation Panel (270px floating)

Appears near the selected element when clicked. Contains:
- Number badge with annotation color
- Delete and close buttons
- Severity chip-select (Critical / Major / Minor)
- Multi-category chips (Visual / Functional / Content / A11y / Perf)
- Textarea for comment

This is where severity and category are set and edited. The sidebar list
only shows the result (badge color for severity); the panel is the editor.

### 2.5 Settings Overlay

Gear icon opens a slide-over panel that covers the sidebar content with
a solid background. Back arrow dismisses it. Contains:
- Server connection status and project mapping (read-only)
- Capture format toggles (JSON always-on, HTML snapshot, screenshot)
- Link to advanced settings (options page)

Design decision: settings used to replace the sidebar content entirely,
hiding annotations. Now it overlays, so the user knows their work is
still there underneath.

### 2.6 Options Page

Full-tab page for multi-project configuration. Shows auto-detected server
info and manual override toggle for URL-to-captures-dir mapping. Most
users never visit this page.

---

## 3. User Journeys

### 3.1 Developer Annotating a Bug

1. Click ViewGraph icon - annotate mode activates directly
2. Sidebar opens on **Review** tab, overlay highlights elements on hover
3. Click element, type comment in annotation panel, set severity
4. Wonders "is there a network error causing this?" - clicks **Inspect**
5. Sees failed GET /api/users in network section
6. Back to **Review** - adds "404 on /api/users" to annotation comment
7. Clicks "Send to Agent"
8. Agent receives annotations + full DOM + network/console/breakpoint data

The tab switch at step 4 is a natural mental shift. Both tabs are one
click away throughout the session.

### 3.2 Developer Verifying a Fix

1. Agent says "fixed, request a capture to verify"
2. Click icon - sidebar opens, clicks **Inspect** tab
3. Sees network section clear of errors, console clean
4. Done - no annotations needed

Entire journey stays in Inspect. Review tab never touched.

### 3.3 Tester Filing a Bug Report

1. Click icon - annotate mode activates
2. **Review** tab: click 3 elements, add comments, set severity
3. Click "Copy MD" - paste into Jira

The markdown export automatically includes an Environment section with
breakpoint, failed requests, and console errors. The tester gets rich
context without touching the Inspect tab.

### 3.4 Developer Debugging a Hidden Element

1. Hover over element - tooltip shows breadcrumb and selector
2. Click **Inspect** tab - sees visibility warning for that element
3. Sees breakpoint is "md (768px)" - realizes it's a responsive issue
4. Fixes directly without annotating

Inspect tab serves as a lightweight DevTools alternative.

### 3.5 Reviewer Checking Responsive Behavior

1. Resize viewport to different breakpoints
2. **Inspect** tab shows active breakpoint changing (e.g. "lg" to "md")
3. Annotate any layout issues that appear at specific breakpoints
4. Enrichment data in export proves which breakpoint triggered the issue

---

## 4. Export Formats

### 4.1 Copy Markdown

Copies a structured bug report to clipboard. Includes:
- Page metadata (URL, date, viewport, browser)
- Environment section (breakpoint, failed requests, console errors)
- Each annotation with element details, severity, category

### 4.2 Download Report (ZIP)

Downloads a ZIP archive containing:
- `report.md` - same markdown as Copy MD, plus screenshot references
- `screenshots/` - cropped screenshots per annotation
- `network.json` - full network request data
- `console.json` - full console error/warning data

### 4.3 Send to Agent

Pushes annotations bundled with the full DOM capture to the MCP server.
The capture includes all enrichment data (network, console, breakpoints,
isRendered flags). The agent receives everything needed to implement fixes.

---

## 5. Design Decisions Log

### 5.1 Fixed 2-line tooltip (not variable height)

An earlier version showed 3-5 lines in the hover tooltip: breadcrumb,
meta, a11y info, isRendered warning, console error. Lines 3-5 were
conditional - they only appeared when relevant.

Problem: the tooltip changed height depending on what you hovered over.
Users had to re-parse the layout each time. It felt broken even when
working correctly.

Resolution: tooltip is always exactly 2 lines. Detail (a11y, isRendered,
console) moved to the Inspect tab where the user explicitly asks for it.

### 5.2 Severity as badge color (not chips)

An earlier version showed severity as outlined chips ("Critical", "Major")
and categories as filled chips ("Visual", "Functional") on a second row
below each annotation comment in the sidebar.

Problem: with multiple annotations, this created a wall of colorful badges.
The sidebar was noisy and hard to scan.

Resolution: severity encodes as the number badge color (red/yellow/gray/
purple). Category is only visible in the annotation panel when editing.
Each sidebar entry is exactly one line.

### 5.3 Two tabs (not three)

An earlier draft proposed three tabs: Notes, Diagnostics, History.

Problem: diagnostics and history are both "what is the page doing?" -
reference data, not user tasks. Three tabs meant one would always feel
too thin.

Resolution: two tabs. Review (user tasks) and Inspect (page state).
History will be added to Inspect when M15.2 ships.

### 5.4 Trash button in filter row (not header)

The trash (clear all annotations) button was originally in the sidebar
header alongside gear and close.

Problem: it's a bulk action on the annotation list, not a global sidebar
control. Placing it in the header gave it equal visual weight with
navigation controls.

Resolution: moved to the end of the filter tab row (Open | Resolved |
All | trash), next to the entries it acts on. Red hover color signals
the destructive action.

### 5.5 Settings as overlay (not screen replacement)

Settings originally replaced the sidebar content entirely - clicking gear
hid all annotations and showed the settings form.

Problem: users lost context. They couldn't see their annotations while
checking server status or toggling capture options.

Resolution: settings is an absolute-positioned overlay on top of the
sidebar. Back arrow dismisses it. The user knows their work is underneath.

---

## 6. Future Phases

### Phase C: History and Comparison (depends on M15.2)

Add to Inspect tab:
- Capture history list with timestamps
- "Set as baseline" action per capture
- Structural diff visualization (elements added/removed/shifted)
- Regression count badge vs baseline

### Phase D: Real-Time Features (depends on M14.1, M14.2)

Add to Inspect tab and mode bar:
- Continuous capture toggle with pulsing status indicator
- Toast notifications on auto-capture with diff summary
- Journey recording controls (record/stop in mode bar)
- Journey entries in Inspect tab

### Phase E: Source Linking (depends on M15.1)

Add to tooltip and annotation panel:
- Source file:line display (e.g. `LoginForm.tsx:87`)
- Click to copy source reference
- Heuristic: data-testid to grep, React fiber to component file
