# BUG-007: Agent capture requests not visible in sidebar - no polling, no notification

- **ID:** BUG-007
- **Severity:** Major
- **Status:** FIXED

## Description

When Kiro calls `request_capture`, the request card never appears in the sidebar. The user has no way to know a request was made.

## Root Cause

Two issues:

1. `pollRequests()` was called once on sidebar create but never again. No `setInterval`. If the sidebar was already open when Kiro sent a request, it would never appear.
2. No visual indicator in the header. Even if the user was on the Inspect tab, there was no bell or badge to signal "switch to Review - there's a request waiting."

## Fix

1. Added `startRequestPolling()` with 5s interval, cleaned up in `destroy()`
2. Added notification bell icon in header (amber color) that appears when pending requests exist
3. Bell plays a 3-cycle swing animation to draw attention
4. Clicking the bell switches to the Review tab where request cards are shown
5. Bell hides when no pending requests

## Files Changed

- `extension/lib/annotation-sidebar.js` - polling interval, bell indicator, cleanup
