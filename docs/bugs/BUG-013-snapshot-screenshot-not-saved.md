# BUG-013: Snapshot and Screenshot Not Saved

**ID:** BUG-013
**Severity:** Medium
**Status:** FIXED

## Description
HTML snapshots and screenshots are not saved to `.viewgraph/` when using the sidebar's Send to Agent or capture buttons.

## Root Cause
Two separate issues:

1. **Sidebar ignores snapshot setting:** The sidebar's "Send to Agent" uses `send-review` message type which never reads `vg-settings.html` and never passes `includeSnapshot`. The sidebar's capture button hardcodes `includeSnapshot: false`.

2. **Screenshot PNG never pushed:** Background script captures screenshot via `captureVisibleTab()` and attaches filename to metadata, but the actual PNG data URL is never sent to the server. No `pushScreenshot()` function exists.

## Fix
1. Sidebar reads `vg-settings` before capture/send and passes `includeSnapshot` accordingly
2. Add screenshot push to server via new POST endpoint or base64 in capture metadata
