# BUG-010: Extension Settings Has Stale Manual URL Override

**ID:** BUG-010
**Severity:** Medium
**Status:** FIXED
**Date:** 2026-04-12

## Description

The extension options page has a "manual project mappings" feature (`vg-project-mappings` in `chrome.storage.sync`) that lets users add URL-to-capturesDir mappings from the browser. This is a separate system from `.viewgraph/config.json` which is the actual source of truth for URL patterns.

Two parallel config systems create confusion: patterns added via `--url` don't appear in extension settings, and patterns added in extension settings don't appear in `config.json`.

## Proposed Fix

1. Remove the manual override toggle and mapping editor from the extension options page
2. Replace with a read-only display of all connected servers and their URL patterns (from `/info`)
3. Add help text: "To add URL patterns, run `npx viewgraph-init --url <pattern>` or edit `.viewgraph/config.json`"
4. Remove the `OVERRIDE_KEY` and `PROJECT_MAPPINGS_KEY` code paths from `lookupCapturesDir()` in background.js

## Files Involved

- `extension/entrypoints/options/options.js` - remove mapping editor, add read-only display
- `extension/entrypoints/options/index.html` - update UI
- `extension/entrypoints/background.js` - remove manual override code path from `lookupCapturesDir()`
