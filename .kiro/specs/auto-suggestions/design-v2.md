# F15: Auto-Inspect Suggestions - UX Redesign

Supersedes the original design for the suggestions UI. The scan engine (`suggestions.js`) is unchanged.

## Design Principles

1. **Single send workflow** - suggestions become annotations, sent via the existing "Send to Agent" button
2. **Collapsed by default** - one-line badge, not a permanent checklist
3. **User edits before sending** - suggestions are drafts, not final output
4. **Consistent styling** - matches existing annotation timeline patterns

## User Journey

### Step 1: User opens sidebar
Suggestions scan runs automatically. A one-line indicator appears at the top of the Review tab:

```
💡 5 suggestions  [Review]
```

If no issues found: `✓ No issues detected` (green, no button).

### Step 2: User clicks "Review"
The indicator expands into a checklist. Each row shows tier tag + title + add button:

```
💡 5 suggestions                    [Collapse]
──────────────────────────────────────────────
  ⚠ A11Y   Missing alt text on 3 images  [+]
  🔴 QUAL   2 failed network requests     [+]
  ⚠ A11Y   Button has no accessible name  [+]
  💡 TEST   12 elements missing testid    [+]
  ⚠ A11Y   2 inputs without labels       [+]
──────────────────────────────────────────────
  [Add All to Review]  [Dismiss All]
```

### Step 3: User adds suggestions to review
- Click `[+]` on a row: that suggestion becomes an annotation in the timeline. Row fades out.
- Click `[Add All to Review]`: all remaining suggestions become annotations. Section collapses.
- Click `[Dismiss All]`: all suggestions cleared for this session. Shows "✓ No issues".

### Step 4: User edits and sends
Added suggestions appear as annotations in the timeline. User can:
- Edit the comment (add context, refine description)
- Change severity
- Add their own manual annotations alongside
- Click "Send to Agent" when ready - sends everything together

## Visual Specifications

### Collapsed state (one line)
- Left: lightbulb icon (amber `#f59e0b`)
- Text: "N suggestions" in 11px bold
- Right: "Review" button (small, outlined)
- Background: transparent
- Border-bottom: 1px solid `#2a2a3a`

### Clean state (no issues)
- Left: checkmark icon (green `#4ade80`)
- Text: "No issues detected" in 11px
- No button
- Same border

### Expanded state
- Each row: tier pill + title + `[+]` button
- Tier pills: `A11Y` (amber bg), `QUAL` (red bg), `TEST` (blue bg)
- Pill style: 9px uppercase, 2px 6px padding, border-radius 3px
- Row hover: background `#1a1a2e`
- `[+]` button: circle with plus, appears on hover, 16px
- Bottom row: "Add All to Review" (primary) + "Dismiss All" (ghost)

### Conversion to annotation
When a suggestion is added to review:
- Creates a page-note annotation
- Comment: `[tier]: title - detail` (e.g., "A11Y: Missing alt text on 3 images - img.hero, img.logo")
- Diagnostic field populated with tier and source data
- Element selector set if available
- Severity mapped: error -> critical, warning -> major, info -> minor

## Implementation

### Changes to `suggestions-ui.js`
Complete rewrite. New exports:
- `renderSuggestionBar(container, suggestions, callbacks)` - renders collapsed/expanded state
- Callbacks: `onAdd(suggestion)`, `onAddAll(suggestions)`, `onDismissAll()`, `onRefresh()`

### Changes to `annotation-sidebar.js`
- Replace `renderSuggestionList` call with `renderSuggestionBar`
- `onAdd` callback: create annotation from suggestion, remove from cache, refresh
- `onAddAll`: same for all remaining suggestions
- `onDismissAll`: clear cache, refresh

### No changes to
- `suggestions.js` (scan engine) - unchanged
- `review.js` (annotation list) - unchanged, receives annotations as normal
- `annotate.js` (annotation CRUD) - unchanged
