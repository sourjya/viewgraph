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

## Part 2: Intelligence / Memory Feature

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

- Per-project: `.viewgraph/intelligence.json` (committed, shared with team)
- Per-user: `~/.viewgraph/intelligence/` (personal patterns)
- Capture history index: `.viewgraph/history.json` (list of past captures
  with scan result summaries)

### MCP Tools (future)

| Tool | Purpose |
|---|---|
| `get_intelligence` | Return learned patterns and recommendations |
| `get_style_profile` | Return project's learned style profile |
| `check_watchlist` | Run watchlist checks against a capture |
| `check_style_drift` | Compare capture against style profile |
| `report_correction` | Agent reports a user correction for learning |

### Roadmap Placement

- Extension UI patterns: M4-M6 (extension milestones)
- Capture history tracking: M9
- Recurring issue detection: M9
- Style profile: M9
- Regression watchlist: M9
- Agent mistake tracking: post-M9 (requires agent-side integration)
- Team intelligence: far future

---

## Key Principle

The intelligence features should feel like a senior developer who's been
on the project for months and remembers every issue they've seen. Not a
database of findings - a learned intuition that gets sharper over time.
