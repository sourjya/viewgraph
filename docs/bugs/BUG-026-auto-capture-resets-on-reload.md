# BUG-026: Auto-capture toggle resets on page reload

- **ID**: BUG-026
- **Severity**: Medium
- **Status**: FIXED
- **Reported**: 2026-04-25
- **Fixed**: 2026-04-25

## Description

Turning on AUTO-CAPTURE and then reloading the page resets the toggle to OFF. The watcher state lives in a module-level `enabled` variable in `continuous-capture.js` which is destroyed when the content script unloads on navigation.

This defeats the primary use case: enabling auto-capture *before* a page load to catch onload animation jank and transient DOM mutations.

## Root Cause

`continuous-capture.js` stores `enabled` in a module-level variable. The sidebar content script is destroyed and re-injected on page reload, resetting all module state. The toggle in `toggles.js` reads `isWatcherEnabled()` on render, which returns `false` after reload.

## Fix

1. Persist toggle state to `chrome.storage.local` (key: `vg_auto_capture`) on toggle click
2. On `renderToggles()` init, read from storage and auto-start the watcher if it was enabled

## Files Changed

- `extension/lib/sidebar/toggles.js` - persist and restore auto-capture state
