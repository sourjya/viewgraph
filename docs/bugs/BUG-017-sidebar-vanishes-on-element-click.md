# BUG-017: Sidebar Vanishes When Clicking Element Mode Button

- **ID**: BUG-017
- **Severity**: High
- **Status**: OPEN
- **Reported**: 2026-04-18
- **Fixed**: -

## Description

Clicking the "Element" mode button in the sidebar causes the entire sidebar to vanish - both the main panel and the collapsed strip. The user has to click the extension icon in the browser toolbar to restart.

## Expected Behavior

Clicking Element should collapse the sidebar to the strip (so the user can click elements on the page), with the strip visible on the right edge showing mode icons.

## Actual Behavior

Both the sidebar and the strip disappear completely. No UI remains on screen.

## Root Cause

Under investigation. The collapse() function sets `sidebarEl.style.transform = 'translateX(100%)'` and `badgeEl.style.display = 'flex'`. The strip element is appended to `document.documentElement` with z-index 2147483646. Possible causes:
1. The strip element is being removed by the page's framework (React/Vue DOM reconciliation)
2. The strip is rendered but not visible (CSS conflict with the host page)
3. The strip's position is off-screen

## Reproduction Steps

1. Open any page with ViewGraph sidebar
2. Click the "Element" button in the mode bar
3. Sidebar and strip both vanish
