# BUG-024: Collapsed strip occludes page elements, not repositionable

- **ID**: BUG-024
- **Severity**: Low
- **Status**: FIXED
- **Reported**: 2026-04-25
- **Fixed**: 2026-04-26

## Description

The collapsed sidebar strip is fixed at `top: 60px; right: 0` and cannot be moved. Page elements underneath or behind the strip cannot be clicked to annotate. On shorter viewports or pages with right-aligned UI (FABs, chat widgets, toolbars), the strip can block the exact elements the user wants to review.

## Reproduction Steps

1. Open a page with interactive elements near the top-right area
2. Open ViewGraph sidebar, then collapse it
3. Try to click an element hidden behind the collapsed strip
4. **Expected**: Able to reach all page elements for annotation
5. **Actual**: Elements under the strip are unreachable

## Proposed Fix: Vertical drag to reposition

Allow the user to drag the collapsed strip up or down along the right edge of the viewport.

### UX Design

- **Drag handle on hover**: When the user hovers over the VG icon, a small drag grip indicator appears (e.g., 3 horizontal dots/lines above or below the icon, or the icon itself gets a subtle `grab` cursor). This signals "you can drag me" without cluttering the default strip appearance.
- **Click vs drag**: A plain click on the icon still expands the sidebar (existing behavior). Dragging (mousedown + move > 4px) initiates repositioning. This keeps the primary action (expand) discoverable and the secondary action (reposition) available on demand.
- **Constraint**: Vertical only, pinned to `right: 0`. The strip slides along the right edge. No horizontal movement - it always hugs the browser edge.
- **Snap behavior**: No snapping. Free positioning. The strip stays where the user drops it.
- **Persistence**: Save the `top` offset in `chrome.storage.local` so it survives page reloads and navigations. Key: `vg_strip_top`.
- **Bounds**: Clamp to viewport - `top` cannot go above 0 or below `window.innerHeight - stripHeight`.
- **Default**: Keep `top: 60px` as the default when no saved position exists.
- **Expand/collapse**: When expanding the sidebar, the sidebar opens at its normal position (not the strip's offset). When collapsing again, the strip returns to the saved offset.

### Why not other approaches

| Alternative | Why not |
|---|---|
| Left edge option | Adds settings complexity. Most pages have nav on the left - same problem, different side. |
| Free-floating (any position) | Overkill. The strip is a thin vertical bar - it only makes sense on an edge. Horizontal freedom adds drag complexity for no real benefit. |
| Auto-dodge (detect overlap) | Unreliable. Can't know which elements the user wants to annotate. User control is better. |
| Hide strip entirely | Loses the quick-access mode icons and annotation count. Strip has real utility. |

### Implementation

- Add `mousedown` listener on the strip (or just the icon area) that initiates drag
- On `mousemove`, update `el.style.top` clamped to viewport bounds
- On `mouseup`, persist to `chrome.storage.local`
- On strip creation, read saved position from storage
- Distinguish drag from click: only trigger `onExpand` if mouse moved < 4px total

## Files to Change

- `extension/lib/sidebar/strip.js` - add drag behavior, persist/restore position
