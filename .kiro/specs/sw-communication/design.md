# Service Worker Communication Migration - Design

## Architecture

### File Tree (New/Modified)

```
extension/
├── entrypoints/
│   └── background.js              MODIFIED - orchestrates SW modules
├── lib/
│   ├── transport.js               UNCHANGED - moves to SW context only
│   ├── transport-client.js        NEW - content script proxy
│   ├── discovery.js               MODIFIED - thin client in CS, logic in SW
│   ├── auth.js                    MODIFIED - thin client in CS, logic in SW
│   ├── constants.js               MODIFIED - re-exports from transport-client
│   ├── annotation-sidebar.js      MODIFIED - uses transport-client, no teardown
│   ├── sw/                        NEW - service worker modules
│   │   ├── transport-handler.js   NEW - message handler for transport ops
│   │   ├── ws-manager.js          NEW - WebSocket lifecycle
│   │   ├── sync-alarms.js         NEW - alarm-based polling
│   │   └── discovery-sw.js        NEW - server discovery in SW context
│   └── sidebar/
│       ├── sync.js                MODIFIED - reads from storage, no polling
│       ├── captures.js            MODIFIED - import change
│       ├── settings.js            MODIFIED - import change
│       ├── toggles.js             MODIFIED - import change
│       └── trust-gate.js          MODIFIED - import change
└── tests/
    └── unit/
        ├── transport-client.test.js   NEW
        ├── sw/
        │   ├── transport-handler.test.js  NEW
        │   ├── ws-manager.test.js         NEW
        │   ├── sync-alarms.test.js        NEW
        │   └── discovery-sw.test.js       NEW
        └── sidebar/
            └── sync-storage.test.js       NEW
```

## Module Design

### transport-client.js (Content Script)

Thin proxy that mirrors the `transport.js` API but routes all calls through `chrome.runtime.sendMessage`.

```js
/**
 * Transport Client - Content Script Proxy
 *
 * Same API as transport.js but routes all calls through the service worker
 * via chrome.runtime.sendMessage. Content script never makes direct HTTP
 * or WebSocket connections to the server.
 *
 * @see lib/transport.js - the real transport (runs in service worker)
 * @see lib/sw/transport-handler.js - service worker message handler
 */

// Query operations (GET-like)
export async function getInfo() {
  return _query('getInfo');
}
export async function getHealth() {
  return _query('getHealth');
}
export async function getCaptures(url) {
  return _query('getCaptures', { url });
}
// ... same for getResolved, getPendingRequests, getConfig, getBaselines

// Send operations (POST/PUT-like)
export async function sendCapture(data, headers) {
  return _send('sendCapture', { data, headers });
}
export async function updateConfig(data) {
  return _send('updateConfig', { data });
}
// ... same for setBaseline, ackRequest, declineRequest

// Event subscription (via chrome.storage.onChanged)
export function onEvent(type, callback) { ... }
export function offEvent(type, callback) { ... }

// Server URL (cached from last discovery)
export function getServerUrl() { ... }
```

**Message protocol:**

```js
// Content script -> Service worker
{ type: 'vg-transport', op: 'getInfo', args: {} }
{ type: 'vg-transport', op: 'sendCapture', args: { data, headers } }

// Service worker -> Content script (via sendResponse)
{ ok: true, result: { ... } }
{ ok: false, error: 'Server offline' }
```

### sw/transport-handler.js (Service Worker)

Receives `vg-transport` messages and delegates to `transport.js`.

```js
/**
 * Service Worker Transport Handler
 *
 * Receives vg-transport messages from content scripts and routes them
 * to the real transport.js module. Single point of entry for all
 * server communication.
 */

const HANDLERS = {
  getInfo:           () => transport.getInfo(),
  getHealth:         () => transport.getHealth(),
  getCaptures:       (args) => transport.getCaptures(args.url),
  getResolved:       (args) => transport.getResolved(args.pageUrl),
  getPendingRequests:() => transport.getPendingRequests(),
  getConfig:         () => transport.getConfig(),
  sendCapture:       (args) => transport.sendCapture(args.data, args.headers),
  updateConfig:      (args) => transport.updateConfig(args.data),
  // ... all transport operations
};

export function handleTransportMessage(message, sendResponse) {
  const handler = HANDLERS[message.op];
  if (!handler) { sendResponse({ ok: false, error: 'Unknown op' }); return; }
  handler(message.args || {})
    .then(result => sendResponse({ ok: true, result }))
    .catch(err => sendResponse({ ok: false, error: err.message }));
}
```

### sw/discovery-sw.js (Service Worker)

Server discovery logic extracted from `discovery.js`, running in service worker context.

```js
/**
 * Service Worker Discovery
 *
 * Port scans 9876-9879, builds server registry, initializes transport,
 * performs HMAC handshake. Runs in service worker context only.
 * Content scripts get server URL via chrome.runtime.sendMessage.
 *
 * Replaces: discovery.js (content script) + fetchServerInfo() (background.js)
 */

let _serverRegistry = new Map();
let _registryExpiry = 0;

export async function discover(pageUrl) { ... }
export async function getAllServers() { ... }
export function getServerUrl() { ... }
export function getAgentName() { ... }

// Persist registry to chrome.storage.local for survival across SW termination
async function persistRegistry() { ... }
async function restoreRegistry() { ... }
```

### sw/ws-manager.js (Service Worker)

WebSocket lifecycle management in the service worker.

```js
/**
 * WebSocket Manager - Service Worker
 *
 * Maintains a single WebSocket connection to the ViewGraph server.
 * Connects when any sidebar is open, disconnects when all sidebars close.
 * Writes incoming events to chrome.storage.local for content script consumption.
 *
 * Keepalive: 20s ping to prevent service worker termination.
 * Reconnect: exponential backoff (1s, 2s, 4s, max 30s).
 */

const WS_EVENTS_KEY = 'vg-ws-events';
const KEEPALIVE_MS = 20000;
const MAX_RECONNECT_MS = 30000;

let _ws = null;
let _keepaliveTimer = null;
let _sidebarCount = 0;  // tracks open sidebars across tabs

export function sidebarOpened() {
  _sidebarCount++;
  if (!_ws) connect();
}

export function sidebarClosed() {
  _sidebarCount = Math.max(0, _sidebarCount - 1);
  if (_sidebarCount === 0) disconnect();
}

function connect() { ... }
function disconnect() { ... }

// Write events to storage for content script consumption
async function handleEvent(msg) {
  // Append to circular buffer in chrome.storage.local
  // Content scripts read via chrome.storage.onChanged
}
```

### sw/sync-alarms.js (Service Worker)

Alarm-based background polling.

```js
/**
 * Sync Alarms - Service Worker
 *
 * Periodic background polling via chrome.alarms API.
 * Polls for resolved annotations and pending capture requests
 * even when no sidebar is open.
 *
 * Alarm interval: 30s (unpacked) / 60s (published).
 * Results written to chrome.storage.local.
 */

const ALARM_NAME = 'vg-sync';
const RESOLVED_KEY_PREFIX = 'vg-resolved-';
const PENDING_KEY = 'vg-pending-requests';

export function startSync() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
}

export function stopSync() {
  chrome.alarms.clear(ALARM_NAME);
}

export async function onAlarm(alarm) {
  if (alarm.name !== ALARM_NAME) return;
  await pollResolved();
  await pollRequests();
}

async function pollResolved() {
  // Get URLs with open annotations from chrome.storage.local
  // Poll /annotations/resolved for each
  // Write results to chrome.storage.local
}

async function pollRequests() {
  // Poll /requests/pending
  // Write to chrome.storage.local
  // Update badge
}
```

## Data Flow Diagrams

### Agent Resolves Annotation (Sidebar Closed)

```
Agent                MCP Server           Service Worker        chrome.storage
  |                      |                      |                      |
  |-- resolve_annotation |                      |                      |
  |                      |-- write .viewgraph/   |                      |
  |                      |                      |                      |
  |                      |          alarm fires  |                      |
  |                      |<-- GET /resolved -----|                      |
  |                      |--- { resolved: [...] }|                      |
  |                      |                      |-- set vg-resolved-*  |
  |                      |                      |-- setBadgeText('')   |
  |                      |                      |                      |
  |                      |                      |     (user opens sidebar)
  |                      |                      |                      |
  |                      |                      |        Content Script |
  |                      |                      |        reads storage  |
  |                      |                      |        dims markers   |
```

### Agent Resolves Annotation (Sidebar Open)

```
Agent                MCP Server           Service Worker        Content Script
  |                      |                      |                      |
  |-- resolve_annotation |                      |                      |
  |                      |-- WS: annotation:resolved                   |
  |                      |                      |-- receive WS event   |
  |                      |                      |-- write to storage   |
  |                      |                      |                      |
  |                      |                      |   onChanged fires --> |
  |                      |                      |                      |-- update sidebar
  |                      |                      |                      |-- dim marker
```

### Agent Requests Capture (Sidebar Closed)

```
Agent                MCP Server           Service Worker        Browser UI
  |                      |                      |                      |
  |-- request_capture    |                      |                      |
  |                      |-- queue request       |                      |
  |                      |                      |                      |
  |                      |          alarm fires  |                      |
  |                      |<-- GET /pending ------|                      |
  |                      |--- { requests: [...] }|                      |
  |                      |                      |-- set vg-pending     |
  |                      |                      |-- setBadgeText('1') -|-> badge visible
  |                      |                      |                      |
  |                      |                      |     (user clicks icon)
  |                      |                      |     sidebar opens    |
  |                      |                      |     reads pending    |
  |                      |                      |     shows request UI |
```

## chrome.storage Schema

### New Keys

| Key | Area | Type | Writer | Reader | Purpose |
|---|---|---|---|---|---|
| `vg-server-registry` | local | `Array<ServerEntry>` | SW discovery | SW transport | Cached server registry |
| `vg-server-url` | local | `string\|null` | SW discovery | CS transport-client | Current server URL |
| `vg-auth-state` | session | `{ sessionId, secret, authenticated }` | SW auth | SW transport | HMAC session (cleared on browser restart) |
| `vg-ws-events` | local | `Array<WsEvent>` | SW ws-manager | CS transport-client | Circular buffer of recent WS events |
| `vg-resolved-{url}` | local | `Array<{ uuid, resolution }>` | SW sync-alarms | CS sidebar | Resolved annotations per URL |
| `vg-pending-requests` | local | `Array<CaptureRequest>` | SW sync-alarms | CS sidebar | Pending agent capture requests |

### Removed Keys (Phase 5)

| Key | Reason |
|---|---|
| `vg-auto-mapping` | Replaced by `vg-server-registry` |

## Message Protocol

### Content Script -> Service Worker

| Message Type | Payload | Response | Phase |
|---|---|---|---|
| `vg-transport` | `{ op, args }` | `{ ok, result\|error }` | 0 |
| `vg-get-server` | `{ pageUrl }` | `{ url, agentName, trust }` | 1 |
| `vg-sidebar-opened` | `{ tabId }` | `{ ok }` | 3 |
| `vg-sidebar-closed` | `{ tabId }` | `{ ok }` | 3 |

### Existing Messages (Unchanged)

All existing message types (`capture`, `send-review`, `download-report`, `fetch-info`, `toggle-annotate`, etc.) continue to work unchanged. The new messages are additive.

## Security Design

### Content Script Isolation

After migration, the content script has zero network access to the server:
- No `fetch()` calls to localhost
- No WebSocket connections
- No HMAC credentials in memory
- All server communication via `chrome.runtime.sendMessage` (browser-enforced IPC)

### Auth State Protection

- HMAC session stored in `chrome.storage.session` (extension-only, cleared on browser restart)
- More secure than current module variables (content script memory is accessible to page via prototype pollution in theory)
- Session survives service worker termination (chrome.storage persists)

### Event Validation

- Service worker validates all `vg-transport` message types against a whitelist
- Unknown operations rejected with error
- Content script cannot invoke arbitrary transport methods
