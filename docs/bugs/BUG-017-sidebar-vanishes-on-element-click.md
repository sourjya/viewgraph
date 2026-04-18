# BUG-017: Sidebar Vanishes When Clicking Element Mode Button

- **ID**: BUG-017
- **Severity**: High
- **Status**: FIXED
- **Reported**: 2026-04-18
- **Fixed**: 2026-04-18

## Description

Clicking the "Element" mode button in the sidebar causes the entire sidebar to vanish - both the main panel and the collapsed strip. The user has to click the extension icon in the browser toolbar to restart.

## Expected Behavior

Clicking Element should collapse the sidebar to the strip (so the user can click elements on the page), with the strip visible on the right edge showing mode icons.

## Actual Behavior

Both the sidebar and the strip disappear completely. No UI remains on screen.

## Root Cause

The strip element (collapsed badge) is appended to `document.documentElement`. Some pages or frameworks may remove unknown children during DOM reconciliation. The `collapse()` function accessed `badgeEl` without null checks and didn't re-append if removed.

## Fix

- Added null guard on `badgeEl` in `collapse()` and `expand()`
- Added re-append logic: if `badgeEl` or `hostEl` lost their parent, re-append to `document.documentElement`
- This makes collapse/expand resilient to DOM cleanup by host pages

## Files Changed

- `extension/lib/annotation-sidebar.js`

## Regression Tests

Existing collapse/expand tests cover the happy path. The re-append guard is defensive and doesn't change behavior when elements are present.
