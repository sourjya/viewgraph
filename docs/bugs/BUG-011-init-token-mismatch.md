# BUG-011: Init Script Token Mismatch on Re-run

**ID:** BUG-011
**Severity:** High
**Status:** OPEN
**Date:** 2026-04-13

## Description

When `viewgraph-init` is run multiple times, the server may keep running from a previous init with an old auth token. The init script writes a new `.token` file but doesn't restart the server if it detects the same PID is still running. The extension then reads the new token but the server still has the old one in memory, causing all captures to fail with "Unauthorized."

## Reproduction

1. `cd ~/project && npx viewgraph-init` - server starts, token A written
2. `npx viewgraph-init` again - server still running (same PID), token B written to `.token`
3. Extension reads token B, server has token A in memory
4. All captures fail silently with 401

## Fix

The init script should always kill and restart the server for the current project's captures dir, ensuring the token in memory matches the token on disk.

## Files

- `scripts/viewgraph-init.js` - server restart logic
