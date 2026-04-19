# BUG-021: Server Dies After Long Idle Despite Extension Connection

- **ID**: BUG-021
- **Severity**: Medium
- **Status**: OPEN
- **Reported**: 2026-04-19
- **Fixed**: -

## Description

After 3-4 hours of inactivity, the ViewGraph extension shows "server not running" even though the browser is still open. The user must restart Kiro CLI to restore the connection.

## Root Cause

The server has two shutdown triggers:
1. `stdin close` detection - when the MCP agent closes its stdio pipe, the server exits immediately
2. 30-minute idle timeout - fires when no activity occurs

Kiro CLI may close or reset the stdio pipe during long idle periods. When this happens, the `stdin-closed` handler fires and shuts down the server immediately, even though the extension's HTTP receiver is still active and the extension is still connected.

## Proposed Fix

When stdin closes, don't shut down immediately if the HTTP receiver has had recent activity. Instead, switch to "HTTP-only mode" and let the idle timer handle eventual shutdown. This keeps the server alive for the extension while still cleaning up truly orphaned processes.

## Workaround

Restart Kiro CLI to restart the MCP server.
