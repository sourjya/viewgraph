# Inspect Tab Redesign - Spec

## Problem

The Inspect tab has several UX issues identified during review:

1. **Network paths are truncated and unreadable** - `/node_modules/.vite/deps/chunk-JQUR...` tells you nothing
2. **All network requests in a flat list** - 20 identical GET rows are noise
3. **Capture node counts are meaningless** - "208 nodes" has no context without comparison
4. **Baseline star icon is unexplained** - no label, no tooltip explaining what it does
5. **Auto-capture toggle at top** - it's a setting, not a primary action

## Design

### Network Request Grouping

Group requests by path prefix into collapsible categories:

- **Failed** (red, always on top if any) - requests with error status
- **App Sources** (`/src/`) - application code
- **Dependencies** (`/node_modules/`) - third-party deps
- **Static** (images, fonts, favicons) - asset files
- **API** (`/api/`, `/graphql`) - data fetches
- **Other** - anything that doesn't match above

Each group header shows: category name, request count, total transfer size.
Collapsed by default except Failed (always expanded if present).

### Smart Path Display

Instead of full truncated paths, show:
- Filename (bold) on the left
- Parent directory (dimmed) below or beside it
- Full path on hover tooltip

### Capture History Diffs

Instead of raw "208 nodes", show change vs previous capture:
- `+9 / -0 nodes` for additions/removals
- First capture just shows total count
- Baseline capture gets a clear "Baseline" label (not just a star)

### Auto-capture Position

Move to bottom of Inspect tab as a settings row, not a header item.

## Implementation Order

1. Network grouping (biggest impact, most code)
2. Smart path display (within network grouping)
3. Capture diffs
4. Auto-capture relocation
