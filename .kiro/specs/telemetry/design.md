# Telemetry - Design

## Architecture

```
Extension (content/background)     MCP Server
  |                                  |
  v                                  v
telemetry-client.js              telemetry-client.js
  |                                  |
  |  batch (chrome.storage.local)    |  batch (in-memory array)
  |                                  |
  +------ HTTPS POST --------> Analytics Endpoint
          (every 5 min)         (simple JSON receiver)
```

Both components share the same `telemetry-client.js` interface but with platform-specific storage backends. The extension uses `chrome.storage.local`; the server uses an in-memory array. Both flush to the same HTTPS endpoint.

## Module Design

### `telemetry-client.js` (shared interface, two implementations)

```
TelemetryClient {
  constructor(config: { endpoint, version, platform, storageBackend })
  track(event: string, params?: object): void    // fire-and-forget, never throws
  flush(): Promise<void>                          // send batch, called on timer
  enable(): void
  disable(): void
  isEnabled(): boolean
  getLog(): Event[]                               // last 50 events for transparency UI
  getInstallId(): string
}
```

**Storage backend interface:**

```
StorageBackend {
  get(key: string): Promise<any>
  set(key: string, value: any): Promise<void>
}
```

Extension implementation: wraps `chrome.storage.local`.
Server implementation: wraps a plain object (in-memory, lost on restart - acceptable since server events are low-volume).

### Event Schema

Every event is a flat JSON object:

```json
{
  "event": "tool_called",
  "installId": "a1b2c3d4-...",
  "version": "0.1.0",
  "platform": "chrome",
  "timestamp": "2026-04-12T01:00:00.000Z",
  "tool": "audit_accessibility",
  "durationMs": 42,
  "success": true
}
```

Rules:
- All values are strings, numbers, or booleans - no nested objects
- No arrays (keeps the schema flat for any analytics backend)
- Parameter names are camelCase
- `event`, `installId`, `version`, `platform`, `timestamp` are always present (added by `track()`)

### Install ID Generation

```javascript
// Extension: on first run
const id = crypto.randomUUID();
await chrome.storage.local.set({ 'vg-telemetry-id': id });

// Server: on first run
const id = crypto.randomUUID();
writeFileSync('.viewgraph/.telemetry-id', id, { mode: 0o600 });
```

The ID is a random UUID v4. Not derived from hardware. Not hashed from anything identifiable. Can be reset by deleting the storage key.

## Consent Flow

### Extension

1. **Fresh install:** telemetry is enabled by default. The options page shows a "Usage Analytics" section with:
   - Toggle switch (on by default)
   - One-line description: "Send anonymous usage data to help improve ViewGraph. No page content, URLs, or project data is ever collected."
   - Link to `TELEMETRY.md` for full details
   - "View local log" button showing last 50 events

2. **Sidebar settings overlay:** same toggle, same description. Quick access without opening options.

3. **Chrome Web Store listing:** privacy practices section declares:
   - Data collected: "Usage statistics (feature usage, error counts)"
   - Data not collected: "Personal information, browsing history, page content"
   - Data usage: "Product improvement"

### MCP Server

1. **Init script output:** after setup completes, prints:
   ```
   Telemetry: anonymous usage data is collected to improve ViewGraph.
   No project data, URLs, or capture content is ever sent.
   Disable: set VIEWGRAPH_TELEMETRY=off or edit .viewgraph/.telemetry-enabled
   ```

2. **Server startup:** reads `.viewgraph/.telemetry-enabled` file. If file contains `false` or env var `VIEWGRAPH_TELEMETRY=off`, telemetry is disabled.

3. **README:** one-line notice in the server README under Configuration.

## Transport

### Endpoint

A single HTTPS POST endpoint. URL is a constant in the codebase:

```javascript
const TELEMETRY_ENDPOINT = 'https://telemetry.viewgraph.dev/v1/events';
```

Not user-configurable. Changing it requires a code change (prevents redirection attacks).

### Request Format

```
POST /v1/events
Content-Type: application/json

{
  "events": [
    { "event": "session_start", "installId": "...", ... },
    { "event": "annotation_created", "installId": "...", ... }
  ]
}
```

### Response

- `200 OK` - events accepted
- `429 Too Many Requests` - back off, retry next cycle
- Any other status or timeout (2s) - drop batch, don't retry indefinitely

### Security

- HTTPS only (TLS 1.2+)
- No authentication required (events are anonymous, no value in impersonation)
- Server-side: no IP logging, no request header storage
- Rate limit: 1 request per install per 5 minutes (enforced client-side)
- Payload max: 100 events per batch, ~50KB max

## Batching Strategy

```
track("event_name", params)
  |
  v
Add to local buffer (array in storage)
  |
  v
Timer fires every 5 minutes
  |
  v
If buffer has events AND telemetry enabled:
  - Take up to 100 events from buffer
  - POST to endpoint
  - On success: clear sent events from buffer
  - On failure: leave in buffer, retry next cycle
  - If buffer > 500: drop oldest events
```

Additionally, `flush()` is called on:
- Extension: `session_end` (annotate mode deactivated)
- Server: `SIGINT`/`SIGTERM` (graceful shutdown)

## Integration Points

### Extension

| Location | Event | Trigger |
|---|---|---|
| `annotation-sidebar.js` create() | `session_start` | Sidebar created |
| `annotation-sidebar.js` destroy() | `session_end` | Sidebar destroyed |
| `annotate.js` addAnnotation() | `annotation_created` | New annotation |
| `annotation-sidebar.js` sendBtn click | `export_used` | Send to Agent |
| `annotation-sidebar.js` copyBtn click | `export_used` | Copy MD |
| `annotation-sidebar.js` dlBtn click | `export_used` | Download Report |
| `annotation-sidebar.js` switchTab() | `tab_switched` | Tab change |
| `annotation-sidebar.js` mode click | `mode_switched` | Mode change |
| `keyboard-shortcuts.js` handler | `keyboard_shortcut_used` | Shortcut fired |
| `auto-capture.js` trigger | `auto_capture_triggered` | Auto-capture |
| `safe-collect.js` catch | `collector_error` | Collector failure |
| `constants.js` discoverServer() | `server_connection` | Discovery result |

### MCP Server

| Location | Event | Trigger |
|---|---|---|
| `index.js` startup | `server_start` | Process start |
| Each tool handler | `tool_called` | Tool invocation |
| Each tool handler (error path) | `tool_error` | Tool error |
| `http-receiver.js` POST /captures | `capture_received` | Capture pushed |

### Settings UI

| Location | Element |
|---|---|
| `options/index.html` | "Usage Analytics" section with toggle, description, TELEMETRY.md link, log viewer |
| `annotation-sidebar.js` settings overlay | Toggle switch matching options page |

## File Layout

```
extension/
  lib/
    telemetry.js           Client: track(), flush(), enable/disable, getLog()
  entrypoints/
    options/
      index.html           Add "Usage Analytics" section
      options.js            Wire toggle to chrome.storage

server/
  src/
    telemetry.js           Client: same interface, in-memory storage backend

TELEMETRY.md               Full event catalog, exclusions, privacy policy
```

## What This Design Intentionally Does NOT Do

- **No A/B testing** - telemetry is for understanding, not experimentation
- **No session replay** - no sequence of events within a session
- **No funnel analysis** - no tracking of multi-step flows
- **No user segmentation** - install IDs are not grouped or profiled
- **No third-party SDKs** - no Google Analytics, Mixpanel, Amplitude, or Segment
- **No real-time dashboard** - batch processing only, no streaming
