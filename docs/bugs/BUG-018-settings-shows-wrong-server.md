# BUG-018: Settings Shows Wrong Server for Unmatched Pages

- **ID**: BUG-018
- **Severity**: Medium
- **Status**: FIXED
- **Reported**: 2026-04-19
- **Fixed**: 2026-04-19

## Description

When browsing a page that doesn't match any server's URL patterns (e.g., `mybakestory.com`), the Settings panel still shows server info from a different project. The transport layer retains the last initialized server, so `getInfo()` returns stale data.

## Root Cause

`discoverServer()` returns null for unmatched URLs and calls `transport.reset()`. But the settings panel calls `transport.getInfo()` which may succeed if transport was previously initialized for a different page in the same browser session (registry cache TTL is 15s).

## Fix

Settings `refreshServerInfo()` now checks if the current page URL actually matches the server before displaying its info. If no server matches, shows "No matching server" message.

## Files Changed

- `extension/lib/sidebar/settings.js`
