# BUG-011: Init Script Token Mismatch on Re-run

**ID:** BUG-011
**Severity:** Critical
**Status:** FIXED
**Date:** 2026-04-13

## Description

Captures silently fail with 401 Unauthorized. The extension shows "Sent!" (green checkmark) but no capture file appears. Three interrelated issues in the auth token lifecycle:

1. **Init script didn't pass token to server.** The server generated its own random token on startup. The init script wrote a different token to `.token`. They never matched.

2. **Extension cached stale tokens.** The extension stored the auth token in `chrome.storage.local` from a previous session. After server restart, the old token was still used.

3. **Extension routed to wrong server.** `lookupCapturesDir()` read stale project mappings from `chrome.storage.local`, sending captures to the wrong server (e.g., app-one instead of app-two).

## Root Cause

The auth token had three separate sources of truth that were never synchronized:
- Server: `crypto.randomUUID()` at startup (in memory)
- Disk: `.viewgraph/.token` (written by server OR init script)
- Extension: `chrome.storage.local['vg-auth-token']` (set from options page or previous `/info` call)

## Fix (3 commits)

### Fix 1: Init generates token and passes to server
`scripts/viewgraph-init.js` now generates the token, writes it to `.viewgraph/.token`, and passes it to the server via `VIEWGRAPH_HTTP_SECRET` env var. One source of truth: the init script.

### Fix 2: Server exposes token via /info endpoint
`server/src/http-receiver.js` now includes `token` in the `/info` response. The endpoint is localhost-only so this is safe. The extension reads the token fresh from `/info` on every registry refresh (every 15 seconds).

### Fix 3: Extension uses per-server tokens from registry
`extension/lib/constants.js` stores the token per server in the registry (from `/info`). `extension/entrypoints/background.js` uses `authHeaders(serverUrl)` which reads the token from the matched server's registry entry. No more stale `chrome.storage.local` tokens.

## Files Changed

- `scripts/viewgraph-init.js` - generate token, pass via env var
- `server/src/http-receiver.js` - include token in `/info` response
- `extension/lib/constants.js` - store token per server in registry, remove chrome.storage token fetch
- `extension/entrypoints/background.js` - use registry token in pushToServer
- `docs/bugs/BUG-011-init-token-mismatch.md` - this file

## Regression Tests Needed

- Init script: verify `.token` file matches `VIEWGRAPH_HTTP_SECRET` env var passed to server
- Server: verify `/info` returns token field
- Extension: verify pushToServer uses token from registry, not chrome.storage
