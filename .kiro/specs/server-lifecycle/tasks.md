# Server Lifecycle Management - Tasks

## Phase 1: Stdin Close Detection

- [x] 1.1 Add `process.stdin.on('end', () => shutdown('stdin-closed'))` in stdio branch of `server/index.js`
- [x] 1.2 Add `process.stdin.on('end', () => shutdown('stdin-closed'))` in native messaging branch
- [x] 1.3 Write integration test: spawn server as child process, close stdin, assert exit within 5s
- [x] 1.4 Write unit test: verify shutdown is called with 'stdin-closed' reason

**Checkpoint:** Server exits cleanly when parent agent dies. No orphaned processes.

## Phase 2: Idle Timeout

- [x] 2.1 Add `VIEWGRAPH_IDLE_TIMEOUT_MINUTES` to `server/src/config.js` with default `30`
- [x] 2.2 Implement `resetIdleTimer()` / idle timeout logic in `server/index.js`
- [x] 2.3 Hook `resetIdleTimer()` into HTTP receiver request handler
- [x] 2.4 Hook `resetIdleTimer()` into WebSocket server message handler
- [x] 2.5 Call `resetIdleTimer()` on startup in `main()`
- [x] 2.6 Write unit test: idle timer fires after configured timeout
- [x] 2.7 Write unit test: idle timer resets on activity
- [x] 2.8 Write unit test: `VIEWGRAPH_IDLE_TIMEOUT_MINUTES=0` disables timer

**Checkpoint:** Server auto-shuts down after 30 min idle. Configurable via env var.

## Phase 3: Documentation

- [x] 3.1 Add `VIEWGRAPH_IDLE_TIMEOUT_MINUTES` to env var table in `docs/runbooks/server-setup.md`
- [x] 3.2 Update `docs/bugs/BUG-014` with reference to this spec as the fix
- [x] 3.3 Add entry to `docs/changelogs/CHANGELOG.md`
