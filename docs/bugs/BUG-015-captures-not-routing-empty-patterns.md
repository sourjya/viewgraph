# BUG-015: Captures Not Routing to Project When urlPatterns Empty

- **ID**: BUG-015
- **Severity**: High
- **Status**: OPEN
- **Reported**: 2026-04-18
- **Fixed**: -

## Description

When a project's `.viewgraph/config.json` has empty `urlPatterns: []`, the extension can't route captures to that project's server. Captures either go to the wrong server (first one found on port scan) or are lost.

This happens when:
1. `viewgraph-init` is run without `--url` flag
2. The auto-learn feature doesn't fire (e.g., config.json already exists but with empty patterns)
3. The server starts before any captures are taken (auto-learn only fires on first capture when no config exists)

## Reproduction Steps

1. Run `viewgraph-init` in a project without `--url`
2. Open the app in browser, annotate, click Send to Agent
3. Captures don't appear in the project's `.viewgraph/captures/`
4. They may appear in another project's captures dir (whichever server the extension finds first)

## Root Cause

The extension's `discoverServer()` scans ports 9876-9879 and matches by URL pattern. If a server has empty `urlPatterns`, it never matches any page URL. The extension falls back to the first responding server.

## Workaround

Run init with explicit URL: `viewgraph-init --url localhost:8040`

Or manually edit `.viewgraph/config.json`:
```json
{ "urlPatterns": ["localhost:8040"] }
```

## Fix Options

1. Auto-learn should fire even when config.json exists but has empty urlPatterns
2. `viewgraph-init` should warn when no `--url` is provided and prompt for one
3. Extension should show a warning when captures are sent to a server with no URL patterns

## Files Changed

-

## Regression Tests

-
