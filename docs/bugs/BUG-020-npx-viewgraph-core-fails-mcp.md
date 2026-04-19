# BUG-020: npx -y @viewgraph/core Fails as MCP Server

- **ID**: BUG-020
- **Severity**: Critical
- **Status**: FIXED
- **Reported**: 2026-04-19
- **Fixed**: 2026-04-19

## Description

The documented MCP config `{ "command": "npx", "args": ["-y", "@viewgraph/core"] }` fails with "initialize response" error. `npx` can't determine which executable to run because the package's `bin` field only has utility scripts (`viewgraph-init`, `viewgraph-status`, `viewgraph-doctor`), not the MCP server itself.

## Root Cause

`npx` resolves executables from the `bin` field in package.json. When a scoped package (`@viewgraph/core`) has multiple bin entries but none matching the package name, `npx` doesn't know which to run. The MCP server entry point is `server/index.js` (the `main` field), but `npx` ignores `main`.

## Fix

Add a `viewgraph` bin entry pointing to `server/index.js` with a proper shebang. This makes `npx -y @viewgraph/core` run the MCP server (since `npx` picks the first bin entry or the one matching the unscoped package name).

## Workaround (before fix)

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/path/to/node_modules/@viewgraph/core/server/index.js"]
    }
  }
}
```

## Files Changed

- `package.json` - added `viewgraph` bin entry
- `server/index.js` - added shebang line

## Impact

This breaks the primary install path documented in README, gitbook, and all user-facing docs. Every new user hitting this would fail on first setup.
