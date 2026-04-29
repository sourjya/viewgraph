# Service Worker Communication Migration - Requirements

## Overview

Move all extension-to-server communication (HTTP, WebSocket, auth, polling) from the content script to the service worker. The content script becomes a pure UI layer that communicates with the service worker via `chrome.runtime.sendMessage`. This fixes the architectural inversion where an ephemeral component (content script) owns persistent communication, and enables background sync when the sidebar is closed.

**Research:** [`docs/references/service-worker-migration-research.md`](../../../docs/references/service-worker-migration-research.md)

## User Stories

### US-1: Background annotation resolution
As a developer using ViewGraph with an AI agent, I want resolved annotations to sync even when the sidebar is closed, so that when I reopen the sidebar I see up-to-date resolution status without waiting for a poll cycle.

### US-2: Background capture request delivery
As a developer, I want to see a badge on the extension icon when the agent requests a capture, so that I know to open the sidebar and fulfill the request without having to keep the sidebar open at all times.

### US-3: Persistent auth session
As a developer, I want my HMAC auth session to persist across sidebar open/close cycles, so that I don't re-handshake every time I toggle the sidebar.

### US-4: Single server connection
As a developer with multiple tabs open, I want the extension to maintain a single connection to the server instead of one per tab, so that server resources are not wasted on duplicate connections.

### US-5: Real-time event delivery
As a developer with the sidebar open, I want annotation resolution and agent status updates to appear in real-time via WebSocket, so that I see changes as they happen without polling delay.

## Functional Requirements

### FR-1: Transport Client Proxy
- FR-1.1: Create `transport-client.js` with the same API surface as `transport.js` (`getInfo`, `getHealth`, `getCaptures`, `getResolved`, `getPendingRequests`, `getConfig`, `sendCapture`, `updateConfig`, `onEvent`, `offEvent`, `getServerUrl`)
- FR-1.2: All methods route through `chrome.runtime.sendMessage` to the service worker
- FR-1.3: All 8 content script consumer modules import from `transport-client.js` instead of `transport.js`
- FR-1.4: `onEvent`/`offEvent` use `chrome.storage.onChanged` listeners instead of WebSocket

### FR-2: Service Worker Discovery
- FR-2.1: Service worker owns server discovery (port scan 9876-9879)
- FR-2.2: Discovery result cached in `chrome.storage.local` with 15s TTL
- FR-2.3: Content script retrieves server URL via `chrome.runtime.sendMessage({ type: 'vg-get-server' })`
- FR-2.4: Remove duplicate `fetchServerInfo()` from background.js (replaced by shared discovery)
- FR-2.5: Discovery triggers on: service worker startup, alarm wake, sidebar open message

### FR-3: Service Worker Auth
- FR-3.1: Service worker owns HMAC handshake (`/handshake`, `/handshake/verify`)
- FR-3.2: Auth state (`sessionId`, `secret`, `authenticated`) stored in `chrome.storage.session`
- FR-3.3: Auth state survives sidebar close/reopen (only lost on browser restart or server restart)
- FR-3.4: Native messaging detection skips HMAC (unchanged behavior)
- FR-3.5: Content script never makes direct HTTP requests to the server

### FR-4: Service Worker HTTP Transport
- FR-4.1: Service worker handles `vg-transport-query` messages (GET-like operations)
- FR-4.2: Service worker handles `vg-transport-send` messages (POST/PUT-like operations)
- FR-4.3: All HTTP requests include HMAC signing headers when authenticated
- FR-4.4: Background.js `pushToServer()` uses the shared transport (not its own `fetch()`)
- FR-4.5: Timeout of 3s for queries, 5s for sends (matching current transport.js)

### FR-5: Service Worker WebSocket
- FR-5.1: Service worker maintains a single WebSocket connection to the server
- FR-5.2: WebSocket connects when sidebar opens (content script sends `vg-sidebar-opened`)
- FR-5.3: WebSocket disconnects when no sidebar is open across any tab
- FR-5.4: 20s keepalive ping to prevent service worker termination during active session
- FR-5.5: Incoming WS events written to `chrome.storage.local` key `vg-ws-events`
- FR-5.6: Content script reads events via `chrome.storage.onChanged` listener
- FR-5.7: Auto-reconnect on connection drop (exponential backoff: 1s, 2s, 4s, max 30s)

### FR-6: Alarm-Based Background Sync
- FR-6.1: Create `vg-sync` alarm with 30s period (unpacked) / 60s period (published)
- FR-6.2: On alarm: poll `/annotations/resolved` for current page URLs with open annotations
- FR-6.3: On alarm: poll `/requests/pending` for agent capture requests
- FR-6.4: Write resolved annotations to `chrome.storage.local` key `vg-resolved-{url}`
- FR-6.5: Write pending requests to `chrome.storage.local` key `vg-pending-requests`
- FR-6.6: Set badge text via `chrome.action.setBadgeText` when pending requests exist
- FR-6.7: Clear badge when all requests are fulfilled or expired
- FR-6.8: Alarm only active when server is reachable (skip poll if last discovery found no servers)

### FR-7: Content Script State Reads
- FR-7.1: Sidebar reads resolved annotation state from `chrome.storage.local` on open
- FR-7.2: Sidebar listens to `chrome.storage.onChanged` for real-time updates while open
- FR-7.3: Sidebar reads pending capture requests from `chrome.storage.local` on open
- FR-7.4: Remove `setInterval`-based polling from `sync.js`

## Non-Functional Requirements

### NFR-1: Performance
- Message passing overhead must be < 5ms per round-trip (chrome.runtime.sendMessage)
- Sidebar open time must not regress by more than 100ms compared to current
- Service worker cold start (from terminated) must complete in < 500ms

### NFR-2: Compatibility
- Chrome 116+ (WebSocket in service worker support)
- Firefox MV3 (alarms, storage, message passing)
- All existing extension tests must pass without modification after Phase 0

### NFR-3: Reliability
- Service worker termination must not lose any state (all state in chrome.storage)
- WebSocket reconnection must be automatic and transparent to the sidebar
- Alarm-based polling must survive service worker restart

### NFR-4: Security
- Content script must have zero direct HTTP/WebSocket connections to the server
- Auth credentials must never be stored in content script memory
- All server communication must go through the service worker's authenticated transport

### NFR-5: Bundle Size
- Content script bundle size must decrease (transport.js, auth.js removed from content script)
- Service worker bundle size increase must be < 15KB

## Out of Scope

- Server-side changes (the server HTTP/WS API is unchanged)
- Native messaging transport changes (already in service worker, unaffected)
- New MCP tools or server endpoints
- Cross-tab annotation sync (annotations remain per-tab in content script memory)
- Push notifications for capture requests (badge only)
- Offline queue for captures when server is down
