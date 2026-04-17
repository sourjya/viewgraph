# Server Lifecycle Management - Design

## Architecture

Two independent mechanisms, both in `server/index.js`:

### 1. Stdin Close Detection (Primary)

When the parent MCP host dies, the stdin pipe closes. The server detects this and exits.

```
Agent spawns server → stdin pipe open → agent dies → stdin emits 'end' → server calls shutdown()
```

Add to the stdio branch (after `server.connect(transport)`):

```js
process.stdin.on('end', () => shutdown('stdin-closed'));
```

Add to the native messaging branch (after setting up stdin data handler):

```js
process.stdin.on('end', () => shutdown('stdin-closed'));
```

No change needed for TTY/standalone mode - there's no parent to detect.

### 2. Idle Timeout (Secondary)

A timer that resets on any activity. If it fires, the server shuts down.

Activity sources that reset the timer:
- MCP tool call (any JSON-RPC request on stdin)
- WebSocket client connects or sends a message
- HTTP request received (capture upload, health check, etc.)

```
                    ┌─────────────────────┐
  MCP tool call ───→│                     │
  WS message ──────→│  resetIdleTimer()   │──→ clearTimeout + setTimeout(shutdown, N)
  HTTP request ────→│                     │
                    └─────────────────────┘
```

Implementation:

```js
const IDLE_TIMEOUT_MS = (parseInt(process.env.VIEWGRAPH_IDLE_TIMEOUT_MINUTES, 10) || 30) * 60_000;

let idleTimer = null;

function resetIdleTimer() {
  if (IDLE_TIMEOUT_MS <= 0) return;          // disabled
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => shutdown('idle-timeout'), IDLE_TIMEOUT_MS);
  idleTimer.unref();                          // don't keep process alive just for this
}
```

Hook points:
- **MCP**: stdin `data` event (already exists in native messaging; for stdio, the MCP SDK handles stdin internally - hook into the server's request handler or wrap the transport)
- **HTTP**: call `resetIdleTimer()` in the HTTP receiver's request handler
- **WebSocket**: call `resetIdleTimer()` on WS message receipt

### Existing Shutdown Function

Already exists and handles cleanup:

```js
function shutdown(signal) {
  console.error(`${LOG_PREFIX} Shutting down (${signal})`);
  if (httpReceiver) httpReceiver.stop();
  if (watcher) watcher.close();
  process.exit(0);
}
```

No changes needed - just call it with the new reason strings.

## Data Flow

```
server/index.js
├── main()
│   ├── stdio branch:  process.stdin.on('end', shutdown)
│   ├── native branch: process.stdin.on('end', shutdown)
│   └── all modes:     resetIdleTimer() on startup
├── HTTP receiver:     resetIdleTimer() on each request
├── WS server:         resetIdleTimer() on each message
└── shutdown():        existing - logs reason, stops HTTP, closes watcher, exits
```

## Configuration

| Env var | Default | Description |
|---|---|---|
| `VIEWGRAPH_IDLE_TIMEOUT_MINUTES` | `30` | Minutes of inactivity before auto-shutdown. `0` = disabled. |

## Testing Strategy

- Unit test: verify `shutdown()` is called when stdin emits `end`
- Unit test: verify idle timer fires after configured timeout with no activity
- Unit test: verify idle timer resets on simulated activity
- Unit test: verify `VIEWGRAPH_IDLE_TIMEOUT_MINUTES=0` disables the timer
- Integration test: spawn server, close stdin, verify process exits within 5s
