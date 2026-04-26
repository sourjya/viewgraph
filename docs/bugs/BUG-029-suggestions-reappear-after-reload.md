# BUG-029: Suggestions reappear after page reload, allowing duplicate adds

- **ID**: BUG-029
- **Severity**: Low
- **Status**: FIXED
- **Reported**: 2026-04-26
- **Fixed**: 2026-04-26

## Description

When a user adds a suggestion to the review list, reloads the page, and reopens the sidebar, the same suggestion appears again. Clicking "Add" creates a duplicate annotation.

## Root Cause

`_suggestionsCache` is in-memory only. On reload it resets to `null`, `scanForSuggestions()` re-scans the DOM and returns the same issues. The scan doesn't check if an annotation already exists for that suggestion.

## Fix

Filter out suggestions whose title already appears in existing annotation comments before rendering. Checked in the refresh function where `_suggestionsCache` is populated.
