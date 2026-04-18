# BUG-019: Suggestions Panel Closes on Individual Add

- **ID**: BUG-019
- **Severity**: Medium
- **Status**: FIXED
- **Reported**: 2026-04-19
- **Fixed**: 2026-04-19

## Description

Clicking the `+` button on an individual suggestion in the expanded suggestions panel caused the entire panel to collapse back to the badge. Users had to click "Review" again to add more suggestions.

## Root Cause

The `onAdd` callback called `refresh()` which re-rendered the entire sidebar including the suggestions bar. `renderSuggestionBar()` always starts in collapsed state, so the expanded panel was replaced.

## Fix

Added `_skipSuggestionsRender` flag. The `onAdd` callback sets it before calling `refresh()`, so the annotation list updates but the suggestions panel is not re-rendered. The panel stays open for additional `+` clicks.

## Files Changed

- `extension/lib/annotation-sidebar.js`

## Regression Tests

Existing suggestions-ui tests cover add behavior. The flag is transparent to the test harness.

## Pattern

This is the same class of bug as the trash button stale closure (incremental updates triggering full re-renders). Consider a steering rule: "callbacks that modify state should refresh only the affected section, not the entire sidebar."
