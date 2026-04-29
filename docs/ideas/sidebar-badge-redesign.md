# Sidebar Annotation Badge Color Redesign

**Priority:** Medium (UX polish, post-beta)
**Status:** DONE
**Date:** 2026-04-15

## Problem

Two color systems compete on the same badge, causing visual confusion:

1. **Bounding box colors** - each annotation gets a unique color on the page overlay (cycling through a palette). These help the user match page highlights to sidebar entries.
2. **Severity colors** - the number badge in the sidebar changes color based on severity (red = critical, yellow = major, gray = minor, purple = none).

When annotation #3 has a teal bounding box on the page but a red badge in the sidebar (because it's critical), the user can't visually match them. The color parity between page and sidebar is broken.

## Proposed Fix

Separate the two concerns onto two visual elements:

```
Current:   [3]  div.card  "border radius broken"
            ^
            red = critical? or just #3?

Proposed:  [3] ●  div.card  "border radius broken"
            ^  ^
            |  red dot = critical severity
            teal bg = matches bounding box on page
```

### Design

- **Number badge**: background color matches the bounding box color on the page. Always the same color as the overlay highlight. This is the spatial identifier.
- **Severity dot**: a small filled circle (●) immediately after the number. Color encodes severity:
  - `#ef4444` (red) = Critical
  - `#eab308` (yellow) = Major
  - `#9ca3af` (gray) = Minor
  - `#a855f7` (purple) = No severity set

### Benefits

- Clear 1:1 mapping between page highlights and sidebar entries (by color)
- Severity is still visible at a glance (by dot color)
- No ambiguity about what each color means
- Works for colorblind users better (two separate indicators vs one overloaded one)

## Files

- `extension/lib/annotation-sidebar.js` - badge rendering in `createEntry()`
- `extension/lib/annotate.js` - bounding box color assignment
