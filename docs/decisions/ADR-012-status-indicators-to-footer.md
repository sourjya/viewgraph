# ADR-012: Move Status Indicators from Header to Footer

- **Status**: Accepted
- **Date**: 2026-04-18

## Context

The sidebar header currently contains: logo, status dot (connection), trust shield, collapse button, and close button. That's 5 elements in a narrow bar competing for attention.

The footer currently contains: Send to Agent, Copy Markdown, Download Report buttons, settings gear, and version label.

## Decision

Move the connection status dot and trust shield from the header to the footer. Footer layout becomes:

```
[● dot] [🛡 shield]  ←spacer→  [⚙ settings] [v0.4.0]
```

Header becomes: logo + collapse/close buttons only.

## Rationale

- **Information architecture**: status indicators (connection, trust, version) are all "system health" info and belong together
- **Header clarity**: header should be for navigation/actions, not status display
- **Precedent**: browsers, IDEs, and desktop apps put status in the footer bar
- **Footer is always visible**: it's fixed at the bottom, so status is never hidden by a long annotation list
- **Reduces cognitive load**: fewer elements in the header means faster scanning

## Tradeoff

- Connection status is slightly less prominent on first sidebar open
- Users currently trained to look at header for the green/red dot

Both are minor - the footer is always visible and the dot's color is distinctive enough to notice in either location.

## Consequences

- Modify `header.js`: remove status dot and shield creation/updates
- Modify `footer.js`: add status dot and shield, rearrange layout
- Update `annotation-sidebar.js`: route status updates to footer instead of header
- Update tests for both modules
- Update screenshots in gitbook docs after implementation
