# BUG-006: Collapsed sidebar strip not showing icons or responding to clicks

- **ID:** BUG-006
- **Severity:** Major
- **Status:** FIXED

## Description

After collapsing the sidebar, the collapsed strip does not show the 3 mode icons (Element/Region/Page) or the expand chevron. The strip appears but is not interactive - clicking does nothing.

## Reproduction

1. Open ViewGraph sidebar on any page
2. Click the collapse chevron in the header
3. Sidebar slides away, collapsed strip appears on right edge
4. Expected: vertical strip with expand chevron + 3 mode icons
5. Actual: strip appears but icons are missing, clicking has no effect

## Root Cause

`updateBadgeCount()` replaced `badgeEl.innerHTML` with a VG logo + count badge HTML string. This was called from `collapse()` and `refresh()`, wiping out all the child elements (expand button, divider, mode icon buttons) that were appended during `create()`.

## Fix

Replaced `updateBadgeCount()` to use a targeted count indicator element (`[data-vg-badge-count]`) that is appended/updated/removed without touching the other children.

## Files Changed

- `extension/lib/annotation-sidebar.js` - `updateBadgeCount()` rewritten
