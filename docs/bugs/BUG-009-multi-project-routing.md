# BUG-009: Multi-Project Server Routing Broken

**ID:** BUG-009
**Severity:** Critical
**Status:** FIXED
**Date:** 2026-04-12

## Description

When two ViewGraph servers run simultaneously for different projects (e.g., `~/demos/app-one` on port 9876 and `~/demos/app-two` on port 9877), the extension routes ALL captures to whichever server it discovers first (lowest port), regardless of which project the page belongs to.

## Reproduction

1. `cd ~/demos/app-one && viewgraph-init` - starts server on port 9876
2. `cd ~/demos/app-two && viewgraph-init` - starts server on port 9877
3. Open `app-one/index.html` in Chrome
4. Click ViewGraph icon - sidebar shows green dot
5. Sidebar shows `app-two`'s captures directory, not `app-one`'s

## Root Cause

Three issues in the extension's server discovery and routing:

### 1. `discoverServer()` caches the first healthy server for 30 seconds

`extension/lib/constants.js` line 40-55: scans ports 9876-9879, returns the first `status: ok` response, caches it for 30s. With two servers, the lower port always wins regardless of which project the page belongs to.

### 2. `fetchServerInfo()` caches one server's auto-mapping

`extension/entrypoints/background.js` line 28-35: fetches `/info` from one server at startup and stores it as `vg-auto-mapping`. Only one mapping is stored - the last server checked overwrites the previous.

### 3. `lookupCapturesDir()` has no URL-to-project matching

`extension/entrypoints/background.js` line 43-55: checks manual overrides (if enabled), then falls back to the single auto-mapping. There's no logic to match a page URL to the correct project/server.

## Expected Behavior

Each capture should route to the server whose project contains the page being captured. When `app-one/index.html` is open, captures go to the server on port 9876 (app-one). When `app-two/dashboard.html` is open, captures go to port 9877 (app-two).

## Proposed Fix

The extension should query ALL healthy servers on each capture (not cache one) and match by comparing the page URL against each server's `projectRoot` from `/info`. The server whose `projectRoot` is a prefix of the page's file path (for `file://` URLs) or whose URL pattern matches (for `localhost` URLs) gets the capture.

For `file://` URLs this is straightforward: `file:///home/user/demos/app-one/index.html` starts with the server's `projectRoot` `/home/user/demos/app-one`.

For `localhost` URLs, the init script should store a URL pattern in the server config (e.g., `localhost:3000` -> app-one) so the extension can match.

## Files Involved

- `extension/lib/constants.js` - `discoverServer()`, caching logic
- `extension/entrypoints/background.js` - `fetchServerInfo()`, `lookupCapturesDir()`, `pushToServer()`

## Workaround

For now, run only one ViewGraph server at a time. Kill existing servers before running `viewgraph-init` in a different project.

## Fix Applied

### constants.js - rewritten

- Replaced single-server cache with a **server registry** (Map of all running servers)
- `refreshRegistry()` probes all 4 ports in parallel, stores capturesDir + projectRoot per server
- `discoverServer(pageUrl, targetDir)` now accepts the page URL and matches against projectRoots
- For `file://` URLs: longest projectRoot prefix match wins
- `getAllServers()` returns all running servers for the background script
- Registry TTL reduced from 30s to 15s for faster detection of new servers

### background.js - three functions fixed

- `fetchServerInfo()`: stores ALL server mappings (array), not just one
- `lookupCapturesDir(pageUrl)`: matches file:// URLs against all projectRoots by longest prefix
- `pushToServer(capture, capturesDir)`: passes `capture.metadata.url` to `discoverServer()` for correct routing

### annotation-sidebar.js

- Status dot discovery passes `window.location.href` to show the correct server for the current page

### Files changed

- `extension/lib/constants.js`
- `extension/entrypoints/background.js`
- `extension/lib/annotation-sidebar.js`
- `docs/bugs/BUG-009-multi-project-routing.md`

### Follow-up fixes (2026-04-12)

- All 8 `discoverServer()` calls in sidebar now pass `window.location.href`
- URL normalization: `127.0.0.1`, `0.0.0.0`, `[::1]` normalized to `localhost`
- Windows file path normalization: backslash to forward slash in projectRoot comparison
- Port-only fallback: pattern `localhost:3000` matches any hostname on `:3000` (covers `myapp.local`, `lvh.me`, `host.docker.internal`)
- 39 unit tests covering all routing modes and edge cases
- Multi-project setup guide: `docs/runbooks/multi-project-setup.md`
