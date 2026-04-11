# Telemetry - Tasks

## Phase 1: Core Module + Consent UI

### Task 1: Create TELEMETRY.md
- [ ] Write `TELEMETRY.md` at repo root documenting every event, every parameter, every exclusion
- [ ] Include "What we collect", "What we never collect", "How to opt out" sections
- [ ] Link from README.md

### Task 2: Extension telemetry client
- [ ] Create `extension/lib/telemetry.js`
- [ ] Implement `track(event, params)` - adds to local buffer, never throws
- [ ] Implement `flush()` - POST batch to endpoint, handle errors
- [ ] Implement `enable()`, `disable()`, `isEnabled()` - reads/writes `chrome.storage.local`
- [ ] Implement `getLog()` - returns last 50 events from local buffer
- [ ] Implement `getInstallId()` - generates UUID v4 on first call, persists to storage
- [ ] 5-minute flush timer using `chrome.alarms` (not setInterval - service worker safe)
- [ ] Buffer cap at 500 events, drop oldest on overflow
- [ ] Tests: track adds to buffer, flush sends and clears, disable stops collection, buffer cap works

### Task 3: Server telemetry client
- [ ] Create `server/src/telemetry.js`
- [ ] Same interface as extension client but with in-memory storage backend
- [ ] Install ID stored in `.viewgraph/.telemetry-id` (mode 0600)
- [ ] Reads `VIEWGRAPH_TELEMETRY` env var and `.viewgraph/.telemetry-enabled` file
- [ ] Flush on SIGINT/SIGTERM (graceful shutdown)
- [ ] Tests: track adds to buffer, env var disables, flush sends batch

### Task 4: Options page - Usage Analytics section
- [ ] Add "Usage Analytics" section to `extension/entrypoints/options/index.html`
- [ ] Toggle switch (on by default), description text, link to TELEMETRY.md
- [ ] "View local log" button that shows last 50 events in a scrollable pre block
- [ ] Wire toggle to `chrome.storage.local` key `vg-telemetry-enabled`
- [ ] Tests: toggle persists state, log viewer shows events

### Task 5: Sidebar settings - telemetry toggle
- [ ] Add toggle row to settings overlay in `annotation-sidebar.js`
- [ ] Same key as options page (`vg-telemetry-enabled`)
- [ ] One-line description matching options page

## Phase 2: Instrument Extension Events

### Task 6: Session and annotation events
- [ ] `session_start` on sidebar create()
- [ ] `session_end` on sidebar destroy() with duration and annotation count
- [ ] `annotation_created` on addAnnotation() with type, hasSeverity, hasCategory
- [ ] Flush on session_end
- [ ] Tests: verify events are tracked with correct params

### Task 7: Export and navigation events
- [ ] `export_used` on Send/Copy MD/Report button clicks
- [ ] `tab_switched` on Review/Inspect tab change
- [ ] `mode_switched` on Element/Region/Page mode change
- [ ] `keyboard_shortcut_used` on shortcut trigger
- [ ] Tests: verify events fire with correct params

### Task 8: Infrastructure events
- [ ] `auto_capture_triggered` on HMR/continuous/journey capture
- [ ] `collector_error` in safe-collect.js catch block
- [ ] `server_connection` on discoverServer() result
- [ ] Tests: verify collector_error includes collector name

## Phase 3: Instrument Server Events

### Task 9: Server tool and capture events
- [ ] `server_start` on process startup with nodeVersion and platform
- [ ] `tool_called` wrapper around each tool handler with name, duration, success
- [ ] `tool_error` on tool error paths with name and error category
- [ ] `capture_received` on POST /captures with nodeCount, hasAnnotations, enrichmentCount
- [ ] Tests: verify tool_called includes duration, tool_error categorizes correctly

## Phase 4: Disclosure

### Task 10: Init script and README notices
- [ ] Add telemetry notice to init script output (one line + opt-out instruction)
- [ ] Add telemetry section to server/README.md under Configuration
- [ ] Add telemetry mention to root README.md under Getting Started
- [ ] Update Chrome Web Store privacy practices declaration

## Phase 5: Endpoint (Out of Scope for Extension/Server Code)

### Task 11: Analytics endpoint
- [ ] Deploy simple HTTPS endpoint that accepts POST /v1/events
- [ ] Store events in append-only storage (S3, BigQuery, or similar)
- [ ] No IP logging in access logs
- [ ] 90-day retention policy
- [ ] Rate limit: 1 request per install per minute
- [ ] This task is infrastructure, not extension/server code
