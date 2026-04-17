# F11: Native Messaging Transport

## Requirements

### Native Messaging Host
1. A Node.js script registered as a Chrome/Firefox native messaging host that communicates via stdin/stdout length-prefixed JSON.
2. The host must forward messages to the MCP server process (or be the MCP server process itself).
3. Registration manifest (`com.viewgraph.host.json`) must be placed in the browser's native messaging directory.
4. `viewgraph-init` must register the native messaging host automatically.
5. The host must handle Chrome's 1MB message limit by chunking large captures.

### Extension Transport Abstraction
6. New `lib/transport.js` module that wraps communication with the server.
7. `sendCapture(data)`, `fetchInfo()`, `fetchCaptures()`, etc. use native messaging when available, HTTP when not.
8. Feature detection: try `chrome.runtime.sendNativeMessage` first, fall back to HTTP on error.
9. All existing HTTP calls in the extension must go through the transport abstraction.
10. WebSocket connection for real-time events must fall back gracefully when native messaging handles events.

### Server Dual-Transport
11. Server must accept messages from both native messaging stdin and HTTP receiver simultaneously.
12. Both transports feed into the same capture pipeline, indexer, and request queue.
13. Server can run in native-messaging-only mode (no HTTP port) or dual mode.

### Backward Compatibility
14. Extension must work with old servers that don't have native messaging (HTTP fallback).
15. HTTP receiver must continue working for Playwright fixture, CLI debugging, and remote mode.
16. `npx -y @viewgraph/core` via MCP config must continue working (stdio MCP + HTTP for extension).

### Security
17. Only the registered ViewGraph extension can communicate via native messaging (Chrome verifies extension ID).
18. Native messaging host must validate message format before processing.
19. The `trustOverride` flag from F17 must be preserved through native messaging transport.

## Non-Requirements
20. Remote MCP server mode (F11 Phase 2) is out of scope for this spec.
21. Firefox native messaging differences are documented but implementation is Chrome-first.
