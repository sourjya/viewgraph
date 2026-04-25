# BUG-025: Scrollbar theme regression in annotation panel textarea

- **ID**: BUG-025
- **Severity**: Low
- **Status**: FIXED
- **Reported**: 2026-04-25
- **Fixed**: 2026-04-25

## Description

The annotation panel textarea uses system-default scrollbar styling instead of the dark theme used elsewhere. The diagnostic attachment preview in the same panel already has themed scrollbars (`scrollbarWidth: 'thin'`, `scrollbarColor`), but the textarea was missed.

## Root Cause

The textarea in `annotation-panel.js` was never given `scrollbarWidth` / `scrollbarColor` inline styles. The panel is appended directly to `document.documentElement` (not inside the sidebar's shadow DOM), so it doesn't inherit the shadow DOM scrollbar CSS from `annotation-sidebar.js` line 428.

## Fix

Add `scrollbarWidth: 'thin'` and `scrollbarColor` to the textarea's inline styles, matching the pattern already used by the `attachBody` div in the same file.

## Files Changed

- `extension/lib/annotation-panel.js` - add scrollbar styles to textarea
