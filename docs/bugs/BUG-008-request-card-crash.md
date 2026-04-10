# BUG-008: Request card crash - btnRow referenced before declaration

- **ID:** BUG-008
- **Severity:** Critical
- **Status:** FIXED

## Description

When a pending agent request appeared in the sidebar, the entire annotation list disappeared. Only the "Agent Requests (1)" header rendered - no request card, no annotation items below.

## Reproduction

1. Fire a capture request via `POST /requests/create`
2. Open sidebar - "Agent Requests (1)" header shows but nothing else
3. All annotation items below are also missing

## Root Cause

In the request card rendering loop, `topRow.append(label, urlText, btnRow)` referenced `btnRow` before its `const` declaration 15 lines below. JavaScript hoists `const` but does not initialize it, so this threw a `ReferenceError`. Since the error occurred inside `refresh()`, the entire list rendering aborted silently - no request card, no annotations.

## Fix

Reordered the code to create `btnRow`, `capBtn`, and `decBtn` before assembling the `topRow`. The buttons are now fully constructed before being appended.

## Files Changed

- `extension/lib/annotation-sidebar.js` - reordered request card DOM construction

## Regression Test

The existing sidebar tests cover `refresh()` rendering. The crash was a runtime ordering issue not caught by unit tests because the test mocks don't include pending requests. A test with pending requests would catch this.
