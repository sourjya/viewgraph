# Service Worker Communication Migration - Tasks

## Overview

Migrate all extension-to-server communication from content script to service worker in 6 phases. Each phase is independently deployable and testable. TDD mandatory.

**Research:** [`docs/references/service-worker-migration-research.md`](../../../docs/references/service-worker-migration-research.md)

---

## Phase 0: Transport Client Proxy (Zero Behavior Change)

**Goal:** Create a clean seam between content script consumers and transport. No behavior change - existing tests must pass unchanged.

### Step 1: Transport Client Module

**RED:**
- [ ] 1.1 Write `extension/tests/unit/transport-client.test.js`
  - (+) `getInfo` sends `{ type: 'vg-transport', op: 'getInfo' }` via `chrome.runtime.sendMessage`
  - (+) `sendCapture` sends `{ type: 'vg-transport', op: 'sendCapture', args: { data, headers } }`
  - (+) Returns `result` from `{ ok: true, result }` response
  - (+) Throws on `{ ok: false, error }` response
  - (-) Handles `chrome.runtime.lastError` gracefully (service worker not ready)
  - _Requirements: FR-1.1, FR-1.2_

**GREEN:**
- [ ] 1.2 Implement `extension/lib/transport-client.js`
  - Same API surface as `transport.js`: `getInfo`, `getHealth`, `getCaptures`, `getResolved`, `getPendingRequests`, `getConfig`, `sendCapture`, `updateConfig`, `setBaseline`, `ackRequest`, `declineRequest`, `getServerUrl`, `onEvent`, `offEvent`
  - All methods route through `chrome.runtime.sendMessage({ type: 'vg-transport', op, args })`
  - `onEvent`/`offEvent` use `chrome.storage.onChanged` listener on `vg-ws-events` key
  - `getServerUrl` reads from `chrome.storage.local` key `vg-server-url`
  - _Requirements: FR-1.1, FR-1.2, FR-1.4_

### Step 2: Service Worker Transport Handler

**RED:**
- [ ] 2.1 Write `extension/tests/unit/sw/transport-handler.test.js`
  - (+) Routes `getInfo` to `transport.getInfo()`
  - (+) Routes `sendCapture` to `transport.sendCapture(data, headers)`
  - (+) Returns `{ ok: true, result }` on success
  - (+) Returns `{ ok: false, error }` on transport error
  - (-) Rejects unknown operations
  - _Requirements: FR-4.1, FR-4.2_

**GREEN:**
- [ ] 2.2 Implement `extension/lib/sw/transport-handler.js`
  - Operation whitelist map: op name -> transport function
  - `handleTransportMessage(message, sendResponse)` - async handler
  - _Requirements: FR-4.1, FR-4.2_

### Step 3: Wire Into Background.js

- [ ] 3.1 Add `vg-transport` message handler in `background.js` that delegates to `transport-handler.js`
  - Import transport.js and transport-handler.js in background.js
  - Initialize transport with server URL from existing discovery
  - _Requirements: FR-4.1, FR-4.2_

### Step 4: Switch Content Script Imports

- [ ] 4.1 Update `lib/constants.js` - import from `transport-client.js` instead of `transport.js`
- [ ] 4.2 Update `lib/sidebar/sync.js` - import from `transport-client.js`
- [ ] 4.3 Update `lib/sidebar/settings.js` - import from `transport-client.js`
- [ ] 4.4 Update `lib/sidebar/captures.js` - import from `transport-client.js`
- [ ] 4.5 Update `lib/sidebar/toggles.js` - import from `transport-client.js`
- [ ] 4.6 Update `lib/sidebar/trust-gate.js` - import from `transport-client.js`
- [ ] 4.7 Update `lib/annotation-sidebar.js` - import from `transport-client.js`
  - _Requirements: FR-1.3_

### Checkpoint Gate: Phase 0

- [ ] All existing extension tests pass (zero modifications to existing tests)
- [ ] `grep -r "from.*transport.js" extension/lib/` returns only `transport-client.js` and `sw/` modules
- [ ] Manual test: sidebar opens, discovers server, shows captures, send-to-agent works
- [ ] Build succeeds for Chrome and Firefox

---

## Phase 1: Discovery + Auth in Service Worker

**Goal:** Single discovery, persistent auth session.

### Step 5: Service Worker Discovery

**RED:**
- [ ] 5.1 Write `extension/tests/unit/sw/discovery-sw.test.js`
  - (+) Scans ports 9876-9879, returns server entries
  - (+) Caches registry in `chrome.storage.local` with TTL
  - (+) Restores registry from storage on cold start
  - (+) Returns null when no servers found
  - (-) Handles fetch timeout gracefully
  - _Requirements: FR-2.1, FR-2.2_

**GREEN:**
- [ ] 5.2 Implement `extension/lib/sw/discovery-sw.js`
  - `discover(pageUrl)` - scan ports, match URL, return server URL
  - `getAllServers()` - return full registry
  - `getServerUrl()` / `getAgentName()` - accessors
  - `persistRegistry()` / `restoreRegistry()` - chrome.storage.local
  - _Requirements: FR-2.1, FR-2.2, FR-2.5_

### Step 6: Service Worker Auth

**RED:**
- [ ] 6.1 Write `extension/tests/unit/sw/auth-sw.test.js`
  - (+) Handshake stores session in `chrome.storage.session`
  - (+) `signRequest` reads from `chrome.storage.session`
  - (+) Session survives simulated SW termination (storage persists)
  - (+) `isAuthenticated` returns true after successful handshake
  - (-) Handshake failure clears auth state
  - _Requirements: FR-3.1, FR-3.2, FR-3.3_

**GREEN:**
- [ ] 6.2 Implement auth in service worker context
  - Move handshake logic to SW (uses `fetch` directly - SW has network access)
  - Store `{ sessionId, secret, authenticated }` in `chrome.storage.session`
  - `signRequest` reads from storage, computes HMAC
  - _Requirements: FR-3.1, FR-3.2, FR-3.3, FR-3.4_

### Step 7: Wire Discovery + Auth Into Background.js

- [ ] 7.1 Replace `fetchServerInfo()` in background.js with `discovery-sw.discover()`
- [ ] 7.2 Add `vg-get-server` message handler returning `{ url, agentName, trust }`
- [ ] 7.3 Initialize transport with discovered URL on SW startup and alarm wake
- [ ] 7.4 Update `pushToServer()` to use shared transport instead of direct `fetch()`
  - _Requirements: FR-2.3, FR-2.4, FR-4.4_

### Step 8: Update Content Script Discovery Client

- [ ] 8.1 Update `lib/discovery.js` to be a thin client
  - `discoverServer(pageUrl)` sends `vg-get-server` message to SW
  - `getAllServers()` sends message to SW
  - Remove port scanning, registry, direct fetch from content script
  - _Requirements: FR-2.3, FR-3.5_

### Checkpoint Gate: Phase 1

- [ ] Single discovery: `grep -r "fetch.*:9876\|fetch.*:9877" extension/lib/` returns zero hits outside `sw/`
- [ ] Auth persists: open sidebar, close sidebar, reopen - no re-handshake (check server logs)
- [ ] Background.js `pushToServer` uses shared transport (no direct fetch)
- [ ] All tests pass. Manual test on Chrome and Firefox.

---

## Phase 2: HTTP Transport in Service Worker

**Goal:** All HTTP requests go through service worker. Content script has zero direct HTTP.

### Step 9: Migrate Remaining Direct Fetches

- [ ] 9.1 Audit: `grep -r "fetch(" extension/lib/ extension/entrypoints/content.js` - list all remaining direct fetches
- [ ] 9.2 Migrate any remaining direct `fetch()` calls in content script modules to use `transport-client.js`
- [ ] 9.3 Update background.js `pushSnapshot()` and `pushScreenshot()` to use shared transport
  - _Requirements: FR-3.5, FR-4.3, FR-4.4_

### Step 10: Verify Content Script Isolation

**RED:**
- [ ] 10.1 Write negative test: content script bundle does not contain `fetch(` calls to localhost
  - Grep the built content script bundle for direct fetch patterns
  - _Requirements: NFR-4_

**GREEN:**
- [ ] 10.2 Fix any remaining direct fetch calls found by the audit

### Checkpoint Gate: Phase 2

- [ ] `grep -r "fetch(" extension/lib/ --include="*.js" | grep -v "sw/" | grep -v "test"` returns zero server-bound fetches
- [ ] Content script bundle size decreased (transport.js, auth.js no longer bundled)
- [ ] All sidebar features work: captures list, config, trust gate, send-to-agent
- [ ] All tests pass. Manual test on Chrome and Firefox.

---

## Phase 3: WebSocket in Service Worker

**Goal:** Real-time events via service worker WebSocket.

### Step 11: WebSocket Manager

**RED:**
- [ ] 11.1 Write `extension/tests/unit/sw/ws-manager.test.js`
  - (+) `sidebarOpened()` connects WebSocket
  - (+) `sidebarClosed()` with count=0 disconnects WebSocket
  - (+) Multiple `sidebarOpened()` calls maintain single connection
  - (+) Incoming events written to `chrome.storage.local` `vg-ws-events`
  - (+) 20s keepalive ping sent while connected
  - (+) Auto-reconnect on close with exponential backoff
  - (-) Connect failure does not crash service worker
  - _Requirements: FR-5.1, FR-5.2, FR-5.3, FR-5.4, FR-5.5, FR-5.7_

**GREEN:**
- [ ] 11.2 Implement `extension/lib/sw/ws-manager.js`
  - `sidebarOpened()` / `sidebarClosed()` - reference counting
  - `connect()` / `disconnect()` - WebSocket lifecycle
  - `handleEvent(msg)` - write to circular buffer in chrome.storage.local
  - 20s keepalive via `setInterval` (alive while WS is connected)
  - Exponential backoff reconnect: 1s, 2s, 4s, 8s, 16s, 30s max
  - _Requirements: FR-5.1 through FR-5.7_

### Step 12: Wire WebSocket Into Background.js

- [ ] 12.1 Add `vg-sidebar-opened` / `vg-sidebar-closed` message handlers
- [ ] 12.2 Call `wsManager.sidebarOpened()` / `sidebarClosed()` from handlers
- [ ] 12.3 Initialize WS manager with server URL from discovery
  - _Requirements: FR-5.2, FR-5.3_

### Step 13: Update Content Script Event Consumption

- [ ] 13.1 Update `transport-client.js` `onEvent`/`offEvent` to read from `chrome.storage.onChanged`
  - Parse `vg-ws-events` changes, match event type, call registered callbacks
- [ ] 13.2 Update `annotation-sidebar.js` to send `vg-sidebar-opened` on create and `vg-sidebar-closed` on destroy
- [ ] 13.3 Remove `transport.onEvent` / `transport.offEvent` calls from `annotation-sidebar.js` (replaced by transport-client)
  - _Requirements: FR-1.4, FR-5.6, FR-7.2_

### Step 14: Storage-Based Sync in Sidebar

**RED:**
- [ ] 14.1 Write `extension/tests/unit/sidebar/sync-storage.test.js`
  - (+) `syncFromStorage()` reads `vg-resolved-{url}` and updates annotations
  - (+) `chrome.storage.onChanged` listener updates sidebar in real-time
  - (+) Pending requests read from `vg-pending-requests` on sidebar open
  - (-) Missing storage keys handled gracefully (empty arrays)
  - _Requirements: FR-7.1, FR-7.2, FR-7.3_

**GREEN:**
- [ ] 14.2 Update `lib/sidebar/sync.js`
  - Replace `startResolutionPolling` / `startRequestPolling` with storage reads
  - Add `chrome.storage.onChanged` listener for real-time updates
  - `syncFromStorage(onChanged)` - initial read + listener setup
  - `stopSync()` - remove listener
  - _Requirements: FR-7.1, FR-7.2, FR-7.3, FR-7.4_

### Checkpoint Gate: Phase 3

- [ ] WebSocket connection in service worker (verify via `chrome://serviceworker-internals`)
- [ ] Annotation resolution appears in sidebar in real-time (< 1s latency)
- [ ] WebSocket survives sidebar close/reopen (single connection maintained)
- [ ] All tests pass. Manual test on Chrome and Firefox.

---

## Phase 4: Alarm-Based Background Sync

**Goal:** Background sync when sidebar is closed. Badge for pending requests.

### Step 15: Sync Alarms

**RED:**
- [ ] 15.1 Write `extension/tests/unit/sw/sync-alarms.test.js`
  - (+) `startSync()` creates `vg-sync` alarm with 30s period
  - (+) `onAlarm` polls `/annotations/resolved` and writes to storage
  - (+) `onAlarm` polls `/requests/pending` and writes to storage
  - (+) Badge set to request count when pending > 0
  - (+) Badge cleared when pending = 0
  - (-) Poll skipped when no server is reachable
  - (-) `stopSync()` clears the alarm
  - _Requirements: FR-6.1 through FR-6.8_

**GREEN:**
- [ ] 15.2 Implement `extension/lib/sw/sync-alarms.js`
  - `startSync()` - create alarm
  - `stopSync()` - clear alarm
  - `onAlarm(alarm)` - poll resolved + pending, write to storage, update badge
  - `pollResolved()` - get URLs with annotations from storage, poll each
  - `pollRequests()` - poll pending, update badge
  - _Requirements: FR-6.1 through FR-6.8_

### Step 16: Wire Alarms Into Background.js

- [ ] 16.1 Call `syncAlarms.startSync()` on service worker startup
- [ ] 16.2 Add `chrome.alarms.onAlarm.addListener(syncAlarms.onAlarm)` in background.js
- [ ] 16.3 Start sync after successful discovery (skip if no servers)
  - _Requirements: FR-6.1, FR-6.8_

### Step 17: Integration Test - Full Cycle

- [ ] 17.1 Write integration test: close sidebar -> mock server resolves annotation -> alarm fires -> storage updated -> reopen sidebar -> annotation shows as resolved
- [ ] 17.2 Write integration test: agent requests capture -> alarm fires -> badge appears -> open sidebar -> request visible
  - _Requirements: US-1, US-2_

### Checkpoint Gate: Phase 4

- [ ] Close sidebar. Wait 30s. Check `chrome.storage.local` for `vg-resolved-*` keys (should be populated)
- [ ] Agent requests capture with sidebar closed. Badge appears on extension icon.
- [ ] Reopen sidebar - resolved annotations dimmed, pending requests shown
- [ ] All tests pass. Manual test on Chrome and Firefox.

---

## Phase 5: Cleanup and Documentation

**Goal:** Remove dead code, update docs, verify bundle size.

### Step 18: Remove Dead Code

- [ ] 18.1 Remove `transport.js` from content script imports (only imported by `sw/` modules now)
- [ ] 18.2 Remove `auth.js` content script exports (`clearAuth`, `authenticate` - now in SW)
- [ ] 18.3 Remove `setInterval`-based polling from `sync.js` (`startResolutionPolling`, `stopResolutionPolling`, `startRequestPolling`, `stopRequestPolling`)
- [ ] 18.4 Remove `transport.reset()` and `clearAuth()` from `annotation-sidebar.js` `destroy()`
- [ ] 18.5 Remove duplicate `fetchServerInfo()` from `background.js` (replaced by `discovery-sw.js`)
- [ ] 18.6 Verify content script bundle no longer includes `transport.js` or `auth.js`

### Step 19: Update Documentation

- [ ] 19.1 Update `docs/security/security-assessment.md` - add section on SW migration security improvements
- [ ] 19.2 Update `extension/README.md` - architecture section reflects new communication model
- [ ] 19.3 Update `.kiro/steering/project-conventions.md` - add async lifecycle guard note for SW modules
- [ ] 19.4 Update `docs/changelogs/CHANGELOG.md`

### Step 20: Final Verification

- [ ] 20.1 Full test suite: `npm test` in extension/ (all unit + integration)
- [ ] 20.2 Build Chrome extension: verify bundle sizes
- [ ] 20.3 Build Firefox extension: verify bundle sizes
- [ ] 20.4 Manual regression test on Chrome: sidebar open/close, send-to-agent, capture, resolve, badge
- [ ] 20.5 Manual regression test on Firefox: same as above
- [ ] 20.6 Security verification: `grep -r "fetch(" extension/lib/ --include="*.js" | grep -v "sw/" | grep -v "test" | grep -v "node_modules"` returns zero server-bound fetches

### Checkpoint Gate: Phase 5

- [ ] Content script bundle size decreased vs pre-migration
- [ ] Zero direct HTTP from content script (grep verification)
- [ ] All 1132+ extension tests pass
- [ ] Chrome and Firefox builds succeed
- [ ] Security assessment updated
- [ ] Changelog updated
