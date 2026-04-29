# Extension UX Ideas and Intelligence Features

**Date:** 2026-04-08

**Status:** Ideas - to be refined into specs when extension work begins (M4-M6)

**Source:** Web Highlights extension analysis + original thinking on
long-term intelligence features.

---

## Part 1: Extension UI Patterns to Borrow

### Floating annotation toolbar

When the user selects text or an element, show a minimal floating toolbar
near the selection. Not a full sidebar - just the immediate actions.

```
  ┌─────────────────────────────────┐
  │ 💬 Comment  📌 Pin  🎯 Capture │
  └─────────────────────────────────┘
         ▲ appears near selection
```

- **Comment:** Opens a small floating comment box anchored to the element
- **Pin:** Marks the element for inclusion in the next capture
- **Capture:** Captures just this element with full details

Keep it to 3-4 actions max. Web Highlights has too many options in their
toolbar - we stay minimal.

### Floating comment box

When the user clicks Comment, a small box appears anchored to the element:

```
  ┌──────────────────────────────┐
  │ button#submit-form           │
  │ ┌──────────────────────────┐ │
  │ │ This button should open  │ │
  │ │ a confirmation dialog... │ │
  │ └──────────────────────────┘ │
  │ [Cancel]           [Save] 💬 │
  └──────────────────────────────┘
```

- Shows element identifier (tag + testid or text)
- Free-text comment field
- Saved comments become annotations in the capture
- Comments persist across page reloads (stored in `chrome.storage.local`)

### Element highlight overlay

When hovering in review mode, highlight the element with a colored border
and show a tooltip with key info:

```
  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  │  ┌──────────────────────┐  │
  │  │   Create Project     │  │  ← blue highlight border
  │  └──────────────────────┘  │
  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
  button | data-testid: create-project | 150x36
```

### What NOT to borrow from Web Highlights

- No sidebar panel (too heavy, steals screen space)
- No account/auth system (local-first, no cloud)
- No AI summary features (the MCP server handles analysis)
- No PDF viewer (out of scope)
- No social/sharing features
- No subscription/premium tiers in the extension itself

### Content script loading pattern to borrow

Web Highlights uses `requestIdleCallback` + dynamic `import()` to lazy-load
the heavy content script. This prevents blocking page load. We should do
the same:

```javascript
requestIdleCallback(() => {
  import(chrome.runtime.getURL('content.js'));
});
```

---

## Part 2: Annotation Lifecycle

### Persistence across page reloads

Annotations are stored in `chrome.storage.local` keyed by URL. On page
load, the content script checks for existing annotations and re-renders
them by re-finding elements via their selectors.

```json
{
  "http://localhost:5173/jobs": {
    "annotations": [
      {
        "id": "ann-1",
        "selector": "button[data-testid='view-chain']",
        "backupSelectors": ["button:nth-child(2)", "//button[text()='View Chain']"],
        "comment": "Should open in side panel",
        "status": "open",
        "captureTimestamp": "2026-04-08T07:15:00Z"
      }
    ]
  }
}
```

### Live re-validation on reload

When the page reloads, the extension doesn't just re-render annotations
blindly. It re-evaluates each one against the live DOM:

1. Re-find element by primary selector, fall back to backup selectors
2. If the annotation was tied to a scan finding (e.g., "missing aria-label"),
   re-run that specific check against the live element
3. Update the annotation status based on the result

### Annotation status and color coding

| Status | Color | Border | Meaning |
|---|---|---|---|
| `open` | Orange | Solid orange | Issue still present |
| `resolved` | Green | Solid green + checkmark | Issue fixed since annotation |
| `stale` | Grey | Dashed grey, dimmed | Element no longer found on page |
| `wontfix` | Grey | Solid grey, strikethrough | Manually dismissed by user |

The color change is immediate and visual. Developer reloads the page after
a fix and sees annotations flip from orange to green without any manual
action.

### Re-validation rules

| Annotation type | How to check "resolved" |
|---|---|
| Missing testid | Element now has `data-testid` attribute |
| Missing aria-label | Element now has `aria-label` or visible text |
| Missing alt | Image now has `alt` attribute |
| Missing form label | Input now has `aria-label` or associated label |
| General comment | Cannot auto-resolve - user must dismiss manually |
| Layout issue | Compare current bbox against annotated bbox |

### MCP server integration

The server can also drive annotation lifecycle:

```
Agent: [calls get_annotations({ filename: "before.json" })]
  -> sees 5 open annotations

Agent: fixes the issues in code

User: reloads page, extension captures fresh state

Agent: [calls compare_annotations({ original: "before.json", current: "after.json" })]
  -> returns: { resolved: 3, open: 1, stale: 1 }
```

New MCP tool: `compare_annotations` - checks each annotation from the
original capture against the new capture. Returns resolution status per
annotation.

---

## Part 3: Intelligence / Memory Feature

### The idea

Over time, ViewGraph accumulates captures across sessions. That history
contains patterns - recurring issues, common mistakes, drift from standards.
Instead of just reporting what's wrong NOW, we can build up intelligence
about what goes wrong REPEATEDLY and proactively prevent it.

### What "memory" means for ViewGraph

Not a knowledge base or bookmark system (that's Web Highlights territory).
For us, memory means:

**Project-level intelligence built from capture history.**

### Concrete features

#### 1. Recurring issue detection

Track scan results across captures over time. If the same issue appears
in 3+ captures, escalate it from a one-time finding to a recurring pattern.

```
"You've had missing testids on form inputs in 7 of your last 10 captures.
Consider adding a lint rule or pre-commit hook to enforce data-testid on
all interactive elements."
```

This is not just "here's what's wrong" - it's "here's what keeps going
wrong and here's how to prevent it."

#### 2. Regression watchlist

User marks certain elements or patterns as "watch these." On every new
capture, ViewGraph automatically checks if watched items changed.

```
Watchlist:
  - button:submit-form (selector stability)
  - nav:main-menu (structure)
  - heading hierarchy (a11y)

New capture detected. Checking watchlist...
  ✓ button:submit-form - unchanged
  ✗ nav:main-menu - 2 items removed
  ✓ heading hierarchy - valid
```

MCP tool: `check_watchlist({ filename })` - runs watchlist checks against
a new capture and returns changes.

#### 3. Project style profile

After 5+ captures, ViewGraph builds a "style profile" for the project:
typical colors, fonts, spacing values, layout patterns. New captures are
compared against this profile to detect drift.

```
"This page uses font-size: 13px which doesn't appear in your project's
typographic scale (12, 14, 16, 20, 24px). Consider using 14px instead."
```

MCP tool: `get_style_profile()` - returns the learned style profile.
MCP tool: `check_style_drift({ filename })` - compares capture against profile.

#### 4. Agent mistake tracking

This is the most powerful idea. Track what the coding agent gets wrong
and build up prevention rules.

**How it works:**

1. Agent generates code based on a capture (test, component, fix)
2. User reviews and corrects the agent's output
3. ViewGraph captures the correction pattern
4. Over time, patterns emerge: "agent always uses CSS selectors instead of
   testids", "agent forgets to add aria-labels to icon buttons", "agent
   generates wrong flex direction for this layout pattern"
5. These patterns become proactive recommendations injected into future
   agent context

**Storage:** `~/.viewgraph/intelligence/` or project-level
`.viewgraph/intelligence/`

```json
{
  "patterns": [
    {
      "id": "pattern-001",
      "type": "selector-preference",
      "observation": "Agent used CSS selector 12 times when testid was available",
      "recommendation": "Always prefer data-testid locators over CSS selectors",
      "confidence": 0.92,
      "occurrences": 12,
      "firstSeen": "2026-04-01",
      "lastSeen": "2026-04-08"
    },
    {
      "id": "pattern-002",
      "type": "a11y-omission",
      "observation": "Agent omitted aria-label on icon-only buttons 5 times",
      "recommendation": "When generating icon-only buttons, always include aria-label",
      "confidence": 0.85,
      "occurrences": 5,
      "firstSeen": "2026-04-03",
      "lastSeen": "2026-04-07"
    }
  ]
}
```

MCP tool: `get_intelligence()` - returns learned patterns and recommendations.
The agent includes these in its context before generating code.

#### 5. Team-level intelligence (future)

If multiple developers use ViewGraph on the same project, aggregate their
intelligence profiles. Common mistakes across the team become team-level
rules.

"3 developers on this project have had the same issue with missing form
labels. Consider adding an ESLint rule: jsx-a11y/label-has-associated-control."

---

## Implementation Approach

### Storage

Extension storage (in-browser):

| API | Use | Limit |
|---|---|---|
| `chrome.storage.local` | Annotations per URL, user preferences | 10MB (unlimited with `unlimitedStorage` permission) |
| `chrome.storage.session` | Current session state, active mode | 10MB, cleared on browser close |
| `chrome.storage.sync` | User preferences that sync across devices | 100KB |
| `IndexedDB` | Scan history, intelligence data, heatmap data | Hundreds of MB |

Project-level storage (on disk, committed to repo):

| File | Use |
|---|---|
| `.viewgraph/intelligence.json` | Learned patterns, team-shared |
| `.viewgraph/history.json` | Capture history index with scan summaries |
| `.viewgraph/captures/` | Capture files |

The extension owns raw data collection in IndexedDB. It periodically
writes a summary to `.viewgraph/intelligence.json` so the MCP server
and team members can access it.

### Project Health Dashboard

Visual dashboard in the extension popup or options page. Inspired by
GitHub contribution heatmaps and spaced repetition confidence trackers.

#### Capture activity heatmap

GitHub-style grid showing capture activity by day. Color intensity
indicates issue density:

- Light green: clean captures (few/no issues)
- Yellow: moderate issues
- Orange/red: many issues found
- Grey: no captures that day

#### Project health confidence tiers

| Tier | Color | Meaning |
|---|---|---|
| Resolved | Green | Issue found, fixed, verified across 3+ captures |
| Improving | Yellow-green | Issue count decreasing over time |
| Stable | Yellow | Same issues persist, not getting worse |
| Recurring | Orange | Issues keep coming back after fixes |
| Degrading | Red | New issues appearing, getting worse |
| Not tracked | Grey | No history yet |

#### Health score ring

Circular progress indicator showing overall project health as a
percentage - proportion of scans passing cleanly across recent captures.

#### Where it lives

- **Extension popup:** Quick glance at health score and recent activity
- **Extension options page:** Full dashboard with heatmap, tiers, history
- **MCP tool:** `get_project_health()` returns the same data for agent context

### MCP Tools (future)

| Tool | Purpose |
|---|---|
| `compare_annotations` | Check annotation resolution status between two captures |
| `get_intelligence` | Return learned patterns and recommendations |
| `get_project_health` | Return health score, heatmap data, confidence tiers |
| `get_style_profile` | Return project's learned style profile |
| `check_watchlist` | Run watchlist checks against a capture |
| `check_style_drift` | Compare capture against style profile |
| `report_correction` | Agent reports a user correction for learning |

### Roadmap Placement

- Extension UI patterns (toolbar, comments, highlights): M4-M6
- Annotation persistence and re-rendering: M6
- Annotation live re-validation and color coding: M6
- `compare_annotations` MCP tool: M6
- Capture history tracking: M9
- Project health dashboard: M9
- Recurring issue detection: M9
- Style profile: M9
- Regression watchlist: M9
- `get_project_health` MCP tool: M9
- Agent mistake tracking: post-M9 (requires agent-side integration)
- Team intelligence: far future

---

## Key Principle

The intelligence features should feel like a senior developer who's been
on the project for months and remembers every issue they've seen. Not a
database of findings - a learned intuition that gets sharper over time.
