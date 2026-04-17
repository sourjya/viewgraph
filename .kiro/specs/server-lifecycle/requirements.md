# Server Lifecycle Management - Requirements

## Problem

When the parent MCP host (Kiro, Claude Code, etc.) crashes or is force-killed, the ViewGraph
server process becomes orphaned. The HTTP listener keeps the process alive indefinitely,
consuming one of the 4 available ports (9876-9879). After enough orphaned processes accumulate,
all ports are exhausted and new server instances fail with `EADDRINUSE`, presenting as
"connection closed: initialize response" in the agent's MCP panel.

This affects any user who restarts their agent frequently or whose agent crashes.

## User Stories

1. As a developer, when I restart my AI agent, the old ViewGraph server should not block the
   new one from starting, so I never see "connection closed" errors.

2. As a developer working on multiple projects, I should not have to manually kill stale
   server processes to free ports.

3. As a developer, if I leave my agent idle overnight, the server should not consume resources
   indefinitely.

## Functional Requirements

- FR-1: Server MUST detect when the parent process disconnects (stdin closes) and shut down
  gracefully within 5 seconds. Applies to MCP stdio mode only.

- FR-2: Server MUST detect when the parent process disconnects in native messaging mode
  (stdin closes) and shut down gracefully within 5 seconds.

- FR-3: Server SHOULD implement an idle timeout. If no MCP tool call AND no WebSocket client
  AND no HTTP request for N minutes (configurable, default 30), the server shuts down.
  Applies to all modes.

- FR-4: Server MUST log the shutdown reason to stderr (e.g., "stdin-closed", "idle-timeout",
  "SIGTERM").

- FR-5: Idle timeout MUST be configurable via `VIEWGRAPH_IDLE_TIMEOUT_MINUTES` env var.
  Set to `0` to disable.

## Non-Functional Requirements

- NFR-1: Stdin close detection must add no measurable overhead (event listener only).
- NFR-2: Idle timer must not prevent Node.js from exiting naturally (use `unref()`).
- NFR-3: Graceful shutdown must close HTTP listener and file watcher before exiting.

## Out of Scope

- PID file / lock file management (adds complexity, stale file problems)
- Port conflict auto-resolution at startup (already implemented)
- Process manager / supervisor patterns (overkill for a dev tool)
