# BUG-022: request_capture Flow Fails - Capture Not Matched to Pending Request

- **ID**: BUG-022
- **Severity**: Critical
- **Status**: OPEN
- **Reported**: 2026-04-21
- **Fixed**: -

## Description

When an agent calls `request_capture`, the extension shows the request card. The user clicks Accept, the capture is sent, but the agent's `get_request_status` keeps returning "pending" until it expires. The capture file exists on disk but the request is never marked "completed."

## Observed Behavior

1. Agent calls `request_capture` with `url=http://localhost:3000/`
2. Extension shows request card in sidebar
3. User clicks Accept - card vanishes (capture sent)
4. Agent polls `get_request_status` - stays "pending"
5. Eventually expires: "capture request expired"
6. `get_unresolved` finds nothing (no annotations in the capture)

## Root Cause (Suspected)

The request queue lives in the MCP server process (started by the agent via stdio). The extension sends the capture via HTTP to whichever server it discovered on port scan. If multiple servers are running, or if the extension's `discoverServer()` matched a different port than the agent's server, the capture goes to the wrong server.

The request matching logic (`queue.findByUrl`) only checks the server that received the capture. If the capture lands on server A but the request was created on server B, the match never happens.

### Contributing Factors

1. **Port scan race**: Extension scans 9876-9879 and picks the first match. Agent's server might be on a different port.
2. **URL pattern mismatch**: If the project's `urlPatterns` is empty, the extension may route to the wrong server (related to BUG-015, partially fixed).
3. **No request ID in capture**: The capture doesn't carry the request ID, so matching relies on URL comparison which can fail on trailing slashes, query params, or hash differences.
4. **Single-server assumption**: The request queue is per-server-process. There's no cross-server request coordination.

## Proposed Fix

### Option A: Include request ID in capture (recommended)
1. When extension receives a `request_capture` via WebSocket, store the `requestId`
2. When the user accepts, include `requestId` in the capture metadata
3. Server matches by `requestId` (exact match) instead of URL (fuzzy match)
4. Eliminates URL normalization issues and multi-server routing problems

### Option B: Extension sends capture to the requesting server specifically
1. The WebSocket message includes the server's port/URL
2. Extension sends the capture back to that specific server, not the discovered one
3. Requires WebSocket to carry server identity

### Option C: Cross-server request broadcast
1. When a capture arrives, check request queues on all running servers
2. Complex, fragile, not recommended

## Workaround

Use "Send to Agent" button instead of `@vg-review`:
1. Open page, click ViewGraph icon
2. Annotate bugs
3. Click "Send to Agent"
4. Tell agent: "Fix the annotations from the latest ViewGraph capture"

This works because "Send to Agent" pushes directly to the server the extension is connected to.

## Files Involved

- `server/src/request-queue.js` - request matching logic
- `server/src/http-receiver.js` - capture receipt + request matching
- `server/src/ws-server.js` - WebSocket request push to extension
- `extension/lib/transport.js` - request handling in extension
- `extension/entrypoints/content.js` - capture send flow
