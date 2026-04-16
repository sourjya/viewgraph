# F15: Auto-Inspect Suggestions - Design

## Overview

Proactive issue detection that surfaces problems automatically and lets the user cherry-pick which ones to send to the agent. Instead of clicking elements to find problems, ViewGraph finds them and presents a pick-list.

## Architecture

### New Module: `lib/sidebar/suggestions.js`

Aggregates results from existing collectors into a ranked, deduplicated suggestion list.

```
Existing collectors (a11y, network, console, landmarks, stacking, focus, testid)
    |
    v
suggestions.js - aggregate, rank, deduplicate, cap at 10
    |
    v
Suggestion checklist UI in sidebar (Review tab)
    |
    v (user selects + sends)
Annotations with full DOM context -> agent
```

### Detection Tiers

| Tier | Source collectors | Example suggestions |
|---|---|---|
| Accessibility | axe-collector, landmark-collector, focus-collector | Missing alt text, no accessible name, contrast failures, missing landmarks |
| Quality | network-collector, console-collector, visibility-collector, stacking-collector | Failed API calls, console errors, hidden elements with content, z-index conflicts |
| Testability | element-diagnostics, component-collector | Missing data-testid on interactive elements, unlabeled form inputs |

### Suggestion Object Shape

```js
{
  id: 'sug-1',
  tier: 'accessibility',       // accessibility | quality | testability
  severity: 'error',           // error | warning | info
  title: 'Missing alt text',   // short description
  detail: '3 <img> elements have no alt attribute',
  selector: 'img:nth-child(2)', // target element (first/worst offender)
  elements: ['img:nth-child(2)', 'img.hero', 'img.logo'], // all affected
  source: 'axe-collector',     // which collector found it
  dismissed: false,
  selected: false,
}
```

### Ranking Algorithm

1. Errors before warnings before info
2. Within same severity: accessibility > quality > testability
3. Within same tier: more affected elements ranks higher
4. Cap at 10 suggestions (configurable via config.json `maxSuggestions`)

### Deduplication

Before presenting suggestions, filter out any element that already has an annotation (by matching selector against existing annotation selectors).

### UI Integration

The suggestion list renders as a collapsible section at the top of the Review tab, above the annotation timeline:

```
[Review] [Inspect]

  5 Suggestions  [Refresh] [Select All]
  -----------------------------------------------
  ☐ 🔴 2 failed network requests (404 /api/users, /api/config)
  ☐ ⚠  Missing alt text on 3 images
  ☐ ⚠  Button ".submit-btn" has no accessible name
  ☐ 💡 12 elements missing data-testid
  ☐ ⚠  Contrast ratio 2.1:1 on ".hero-text"
  -----------------------------------------------
  [Send 0 to Agent]

  --- Annotations ---
  (existing annotation timeline below)
```

### Conversion to Annotations

When the user clicks "Send N to Agent", each selected suggestion becomes:
- A page-note annotation with `diagnostic` field populated
- The `comment` field contains the suggestion title + detail
- The `element.selector` points to the first/worst offender
- The `diagnostic.section` identifies the source (e.g., "Accessibility")
- The `diagnostic.data` contains the full finding details

This means the agent receives the same rich context as manually-created annotations.

## Dependencies

- All existing collectors (no new external dependencies)
- `sidebar/review.js` for UI integration
- `annotate.js` for annotation creation

## Performance

- Scan runs once on sidebar open, not continuously
- Collectors already run in < 100ms each
- Total scan budget: < 500ms
- Results cached until "Refresh" clicked or sidebar reopened

## Config

```json
{
  "autoSuggestions": true,
  "maxSuggestions": 10
}
```

Controlled via `config.json` (server) or `chrome.storage` (standalone).
