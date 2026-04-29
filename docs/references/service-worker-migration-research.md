# Service Worker Communication Migration - Research Document

**Date:** 2026-04-27
**Status:** Research complete, pending spec
**Scope:** Move server communication from content script to service worker

---

## 1. Problem Statement

All extension-to-server communication (HTTP, WebSocket, auth, polling) currently lives in the content script. This means:

1. **No sync when sidebar is closed** - agent resolves annotations, user doesn't see it until they reopen the sidebar
2. **No capture request delivery** - agent calls `request_capture`, nobody polls until sidebar opens
3. **Per-tab duplication** - 3 open sidebars = 3 WebSocket connections, 3 polling loops, 3 server discoveries
4. **Auth state is ephemeral** - HMAC session lost on every sidebar destroy, re-handshake on every open
5. **Discovery runs twice** - background.js and content script both scan ports independently

The root cause is an architectural inversion: the ephemeral content script owns the persistent communication layer.

---

## 2. Current Architecture (As-Is)

### 2.1 Communication Ownership

```
Content Script (per-tab, ephemeral)
  ├── discovery.js      Port scan 9876-9879, build server registry
  ├── auth.js           HMAC handshake, session state (_sessionId, _secret)
  ├── transport.js      HTTP queries + sends, WebSocket events
  ├── sync.js           Poll getResolved() every 5s, getPendingRequests() every 3s
  └── annotation-sidebar.js   Orchestrates all of the above on create/destroy

Service Worker (background.js, persistent-ish)
  ├── fetchServerInfo()   Separate port scan, stores auto-mappings
  ├── pushToServer()      Direct fetch to server (no transport.js)
  ├── pushSnapshot()      Direct fetch
  ├── pushScreenshot()    Direct fetch
  └── Message handlers    capture, send-review, download-report, etc.
```

### 2.2 Transport Consumers (Content Script Side)

| Module | Transport functions used |
|---|---|
| `constants.js` | `getConfig`, `updateConfig` (via re-export) |
| `discovery.js` | `init`, `reset`, `isNative` |
| `sidebar/sync.js` | `getResolved`, `getPendingRequests` |
| `sidebar/settings.js` | `updateConfig` |
| `sidebar/captures.js` | `getHealth`, `getCaptures` |
| `sidebar/toggles.js` | `getConfig`, `updateConfig` |
| `sidebar/trust-gate.js` | `getConfig`, `updateConfig` |
| `annotation-sidebar.js` | `getInfo`, `onEvent`, `offEvent`, `getServerUrl`, `reset` |

### 2.3 Background.js Current Responsibilities

9 message handlers, all using direct `fetch()` (not transport.js):

1. `capture` - DOM capture + screenshot + push to server
2. `send-review` - annotated capture push
3. `download-report` - screenshot + zip
4. `fetch-info` - CSP bypass proxy for content scripts
5. `inspect-capture` - subtree capture push
6. `auto-capture` - HMR auto-capture push
7. `open-options` - opens options page
8. `panic-capture` - keyboard shortcut handler (Ctrl+Shift+V)
9. Icon click - toggle sidebar or show popup

### 2.4 Chrome Storage Map

| Area | Key | Purpose | Writer | Reader |
|---|---|---|---|---|
| local | `vg-auto-mapping` | Server mappings | background.js | background.js |
| local | `vg-blocked-reason` | Popup error | background.js | popup.js |
| local | `vg_project_config` | Config cache | constants.js | toggles, panel |
| local | `vg_auto_capture` | Auto-capture state | toggles.js | content.js |
| local | `vg_collapse_hint_shown` | UI hint | sidebar.js | sidebar.js |
| local | `vg_strip_top` | Strip position | strip.js | strip.js |
| local | `vg-annotations-{url}` | Annotations | annotate.js | annotate.js |
| sync | `vg-project-mappings` | Manual overrides | options.js | background.js |
| sync | `viewgraph-settings` | Capture options | options.js | content.js |
| sync | `vg-settings` | Options page | popup/options | popup/options |
| session | `vg_session` | Session recording | session-mgr | session-mgr |

### 2.5 WebSocket Events

| Direction | Event | Purpose |
|---|---|---|
| Server -> Extension | `annotation:resolved` | Agent resolved an annotation |
| Server -> Extension | `annotation:status` | Agent status update (queued, fixing) |
| Server -> Extension | `request:capture` | Agent requests a capture |
| Server -> Extension | `audit:results` | Post-capture audit results |
| Extension -> Server | `annotation:create` | User created annotation |
| Extension -> Server | `annotation:update` | User edited annotation |
| Extension -> Server | `annotation:delete` | User deleted annotation |
| Extension -> Server | `capture:complete` | Capture finished |
| Server keepalive | `ping` | 30s interval |

---

## 3. Proposed Architecture (To-Be)

### 3.1 Communication Ownership

```
Service Worker (background.js, owns all server communication)
  ├── discovery.js      Single port scan, single registry
  ├── auth.js           HMAC handshake, session persisted in chrome.storage.session
  ├── transport.js      HTTP queries + sends, WebSocket events
  ├── sync.js           Poll via chrome.alarms (not setInterval)
  ├── WebSocket         Single connection, auto-reconnect
  └── State writes      chrome.storage.local for resolved state, pending requests

Content Script (per-tab, pure UI)
  ├── Reads from        chrome.storage.local (resolved state, pending requests)
  ├── Listens to        chrome.storage.onChanged for real-time UI updates
  ├── Sends via         chrome.runtime.sendMessage -> service worker -> server
  └── DOM operations    Capture, annotate, render sidebar (unchanged)
```

### 3.2 Message Flow

**Agent resolves annotation (sidebar closed):**
```
Agent -> MCP server -> resolve_annotation tool -> writes to .viewgraph/ file
  -> server broadcasts WS annotation:resolved
  -> service worker receives via WebSocket
  -> service worker writes to chrome.storage.local
  -> (later) sidebar opens, reads resolved state, dims markers
```

**Agent resolves annotation (sidebar open):**
```
Same as above, but:
  -> chrome.storage.onChanged fires in content script
  -> sidebar updates in real-time (no polling needed)
```

**Agent requests capture (sidebar closed):**
```
Agent -> MCP server -> request_capture tool -> queues request
  -> service worker polls via alarm, finds pending request
  -> service worker writes to chrome.storage.local
  -> service worker sets badge: chrome.action.setBadgeText({ text: '1' })
  -> user sees badge, clicks icon, sidebar opens with request pre-loaded
```

### 3.3 Service Worker Lifecycle Strategy

| State | WebSocket | Polling | Keepalive |
|---|---|---|---|
| Sidebar open (active session) | Connected | Not needed (WS delivers events) | 20s client ping |
| Sidebar closed, server running | Disconnected | chrome.alarms every 30s (unpacked) / 60s (published) | N/A |
| No server running | Disconnected | No polling | N/A |

**Why disconnect WebSocket when sidebar closes:**
- No UI to display events = no reason to keep connection alive
- Saves server resources (max 10 WS connections)
- Service worker terminates naturally after 30s idle
- Alarms wake it for periodic polling (pending requests, resolved annotations)

**Why not keep WebSocket always alive:**
- Requires 20s keepalive pings to prevent service worker termination
- Wastes resources when no sidebar is open to display events
- Server already persists all state - nothing is lost by disconnecting

---

## 4. Security Impact Analysis

### 4.1 Improvements

| Current Gap | How Migration Fixes It |
|---|---|
| **Auth state lost on sidebar destroy** | Service worker persists HMAC session in `chrome.storage.session`. Session survives sidebar close/reopen. Re-handshake only needed on server restart. |
| **Duplicate discovery = duplicate attack surface** | Single discovery in service worker. Content script never makes direct HTTP requests to server. |
| **Content script makes HTTP requests** | All HTTP goes through service worker. Content script communicates only via `chrome.runtime.sendMessage` (browser-enforced, no network exposure). |
| **WebSocket in content script** | WebSocket moves to service worker. Content script has zero network access to server. |
| **Per-tab auth sessions** | Single auth session in service worker, shared across all tabs. Reduces handshake frequency. |

### 4.2 New Considerations

| Concern | Assessment | Mitigation |
|---|---|---|
| **Auth in chrome.storage.session** | Session storage is extension-only, cleared on browser restart. More secure than module variables (which are in content script memory, accessible to page via prototype pollution). | `chrome.storage.session` is the recommended MV3 pattern for sensitive ephemeral state. |
| **Service worker as single point of failure** | If service worker crashes, all communication stops. | Chrome auto-restarts service workers on any chrome.* event. Alarms ensure periodic restart. |
| **Message passing attack surface** | Content script sends messages to service worker. A compromised page could try to send messages via the content script. | `chrome.runtime.sendMessage` is extension-internal. Page scripts cannot call it. Content script validates message types before forwarding. |
| **Badge as information leak** | Badge shows pending request count. | Minimal information (just a number). No sensitive data exposed. |

### 4.3 Threat Model Updates

**Threat #1 (Unauthorized localhost POST):** Improved. Content script no longer makes HTTP requests. All server communication goes through the service worker, which is not accessible from page scripts.

**Threat #3 (Page JS reads /info):** Improved. Content script no longer calls `/info` directly. Discovery runs in service worker only.

**HMAC auth (ADR-015):** Improved. Session persists across sidebar lifecycle. Fewer handshakes = smaller attack window for handshake interception.

**Native messaging (ADR-016):** Unchanged. Service worker already supports `chrome.runtime.sendNativeMessage`. The migration aligns HTTP transport with the same pattern native messaging already uses.

### 4.4 Security Recommendation

The migration is a net security improvement. Moving all network I/O out of the content script reduces the attack surface significantly. The content script - which runs in the context of potentially hostile web pages - should have minimal capabilities. The service worker - which runs in an isolated extension context - is the correct place for authenticated network communication.

---

## 5. Migration Path

### Phase 0: Preparation (no behavior change)

**Goal:** Decouple transport consumers from direct transport imports.

1. Create `extension/lib/transport-client.js` - a thin wrapper that routes calls through `chrome.runtime.sendMessage` to the service worker
2. Same API surface as `transport.js` (`getInfo`, `getHealth`, `getCaptures`, etc.)
3. Content script modules import from `transport-client.js` instead of `transport.js`
4. Service worker imports `transport.js` directly
5. **Test:** All existing tests pass. Sidebar behavior identical.

**Why this phase matters:** It creates a clean seam. After this phase, swapping the transport backend is invisible to all 8 consumer modules.

### Phase 1: Discovery + Auth in Service Worker

**Goal:** Single discovery, persistent auth.

1. Move `discovery.js` logic into service worker
2. Move `auth.js` logic into service worker
3. Service worker stores auth state in `chrome.storage.session`
4. Content script gets server URL via `chrome.runtime.sendMessage({ type: 'get-server-url' })`
5. Remove duplicate `fetchServerInfo()` from background.js (now redundant)
6. **Test:** Discovery works. Auth persists across sidebar close/reopen. No re-handshake on sidebar toggle.

### Phase 2: HTTP Transport in Service Worker

**Goal:** All HTTP requests go through service worker.

1. Service worker handles `transport-query` and `transport-send` messages
2. `transport-client.js` sends these messages, receives responses
3. Remove direct `fetch()` calls from content script modules
4. Background.js `pushToServer()` now uses the shared transport (not its own fetch)
5. **Test:** All sidebar features work (captures list, config, trust gate). No direct HTTP from content script.

### Phase 3: WebSocket in Service Worker

**Goal:** Real-time events via service worker.

1. Move `_ensureEventConnection()` to service worker
2. Service worker writes WS events to `chrome.storage.local` (e.g., `vg-ws-events`)
3. Content script listens via `chrome.storage.onChanged`
4. `transport-client.js` provides `onEvent`/`offEvent` that use storage listeners
5. Add 20s keepalive ping in service worker when WebSocket is active
6. **Test:** Annotation resolution appears in sidebar in real-time. WS events survive sidebar close/reopen.

### Phase 4: Polling via Alarms

**Goal:** Background sync when sidebar is closed.

1. Create `vg-sync` alarm (30s for unpacked, 60s for published)
2. On alarm: poll `/requests/pending` and `/annotations/resolved`
3. Write results to `chrome.storage.local`
4. Set badge text when pending requests exist
5. Remove `setInterval`-based polling from `sync.js`
6. **Test:** Close sidebar. Agent resolves annotation. Reopen sidebar - annotation shows as resolved. Agent requests capture - badge appears.

### Phase 5: Cleanup

**Goal:** Remove dead code, update docs.

1. Remove `transport.js` from content script bundle (only service worker imports it)
2. Remove `sync.js` polling functions (replaced by alarms)
3. Remove `auth.js` from content script (only service worker imports it)
4. Update `annotation-sidebar.js` destroy() - no more `transport.reset()`, `clearAuth()`
5. Update security assessment and ADRs
6. **Test:** Full regression. Extension size reduced (fewer modules in content script bundle).

---

## 6. Pitfalls to Avoid

### 6.1 Service Worker Termination During Operations

**Problem:** Service worker can terminate mid-fetch if no keepalive is active.

**Mitigation:** Use `chrome.runtime.getContexts()` (Chrome 116+) to check if service worker is alive before sending messages. Wrap all service worker fetch operations with proper error handling in the content script client.

### 6.2 chrome.storage.onChanged Race Conditions

**Problem:** Multiple tabs listening to `onChanged` could process the same event multiple times.

**Mitigation:** Events are idempotent. Resolving an already-resolved annotation is a no-op. Pending requests are displayed per-tab based on URL match, not consumed.

### 6.3 Alarm Minimum Interval

**Problem:** Published extensions have a 1-minute minimum alarm interval. Unpacked have 30s.

**Mitigation:** 1-minute polling is acceptable for background sync. When sidebar is open, WebSocket provides real-time updates. The alarm is only for "sidebar closed" scenarios where latency tolerance is higher.

### 6.4 Service Worker Cold Start Latency

**Problem:** First message to a terminated service worker takes ~100-300ms to wake it up.

**Mitigation:** Sidebar open already takes ~200ms for discovery. The cold start is masked by existing latency. For captures (triggered by user click), the service worker is already warm from the icon click handler.

### 6.5 Firefox MV3 Compatibility

**Problem:** Firefox MV3 has slightly different service worker behavior.

**Mitigation:** We already build for Firefox MV3. `chrome.alarms` works the same. WebSocket in service worker is supported. Test on both browsers in each phase.

### 6.6 Module State in Service Worker

**Problem:** Module-level variables in service worker are lost on termination. `_serverRegistry`, `_ws`, `_sessionId` all reset.

**Mitigation:** 
- Server registry: re-discover on wake (cached in `chrome.storage.local` with TTL)
- WebSocket: reconnect on wake if sidebar is open (content script sends `sidebar-opened` message)
- Auth session: stored in `chrome.storage.session` (survives termination, cleared on browser restart)

### 6.7 Content Script Injection Timing

**Problem:** Content script may send a message before service worker is ready.

**Mitigation:** `chrome.runtime.sendMessage` queues messages if service worker is starting up. Chrome handles this automatically. Add retry with backoff for robustness.

### 6.8 Breaking the Existing Test Suite

**Problem:** 69+ test files in `extension/tests/` mock `transport.js` directly.

**Mitigation:** Phase 0 creates `transport-client.js` with the same API. Tests that mock transport continue to work because the client has the same interface. Service worker tests are new tests, not modifications of existing ones.

---

## 7. Testing Strategy

### Per-Phase Testing

| Phase | Test Type | What to Verify |
|---|---|---|
| Phase 0 | Unit | `transport-client.js` sends correct messages, receives correct responses |
| Phase 0 | Integration | All 8 consumer modules work with `transport-client.js` |
| Phase 0 | Regression | Full existing test suite passes unchanged |
| Phase 1 | Unit | Discovery in service worker finds servers, caches results |
| Phase 1 | Unit | Auth session persists in `chrome.storage.session` |
| Phase 1 | Integration | Sidebar opens, discovers server, shows auth status |
| Phase 2 | Unit | Service worker handles `transport-query`/`transport-send` messages |
| Phase 2 | Integration | Captures list, config, trust gate all work via message passing |
| Phase 2 | Negative | Content script has zero direct HTTP calls (grep verification) |
| Phase 3 | Unit | WebSocket connect/disconnect/reconnect in service worker |
| Phase 3 | Unit | WS events written to `chrome.storage.local` correctly |
| Phase 3 | Integration | Annotation resolution appears in sidebar via storage listener |
| Phase 4 | Unit | Alarm fires, polls server, writes results to storage |
| Phase 4 | Integration | Close sidebar, resolve annotation, reopen - shows resolved |
| Phase 4 | Integration | Badge appears when agent requests capture |
| Phase 5 | Regression | Full test suite. Extension bundle size check. |

### Cross-Browser Testing

Every phase must be tested on:
- Chrome (primary)
- Firefox MV3 (secondary)

### Isolation Principle

Each phase is independently deployable. If Phase 3 (WebSocket) has issues, Phases 0-2 still work correctly with polling fallback. This is critical for safe incremental migration.

---

## 8. Modules Affected

### Modified

| File | Phase | Change |
|---|---|---|
| `entrypoints/background.js` | 1-4 | Major: gains transport, discovery, auth, WS, alarms |
| `lib/transport.js` | 0 | Minor: no API change, just moves to service worker context |
| `lib/discovery.js` | 1 | Major: logic moves to service worker, content script gets thin client |
| `lib/auth.js` | 1 | Major: logic moves to service worker, state in chrome.storage.session |
| `lib/annotation-sidebar.js` | 0-4 | Moderate: uses transport-client instead of transport, removes teardown |
| `lib/sidebar/sync.js` | 4 | Major: polling replaced by alarm-driven storage reads |
| `lib/sidebar/captures.js` | 0 | Minor: import change (transport -> transport-client) |
| `lib/sidebar/settings.js` | 0 | Minor: import change |
| `lib/sidebar/toggles.js` | 0 | Minor: import change |
| `lib/sidebar/trust-gate.js` | 0 | Minor: import change |
| `lib/constants.js` | 0-1 | Moderate: transport accessor and discovery re-exports updated |

### New

| File | Phase | Purpose |
|---|---|---|
| `lib/transport-client.js` | 0 | Content script transport proxy via chrome.runtime.sendMessage |
| `lib/sw/transport-handler.js` | 2 | Service worker message handler for transport operations |
| `lib/sw/ws-manager.js` | 3 | Service worker WebSocket lifecycle management |
| `lib/sw/sync-alarms.js` | 4 | Alarm-based polling for resolved annotations and pending requests |

### Removed (Phase 5)

- Content script no longer bundles: `transport.js`, `auth.js` (moved to service worker)
- `sync.js` polling functions replaced by alarm-driven reads

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Service worker termination drops events | Medium | Low | Events are persisted server-side. Alarm-based polling catches up. |
| Firefox MV3 behavior differences | Low | Medium | Test each phase on Firefox. Alarms and WS work the same. |
| Test suite breakage | Medium | Medium | Phase 0 creates clean seam. Existing mocks continue to work. |
| Performance regression (message passing overhead) | Low | Low | `chrome.runtime.sendMessage` adds ~1ms. Invisible to user. |
| Increased complexity in background.js | High | Medium | Decompose into `lib/sw/` modules. Background.js orchestrates, doesn't implement. |

---

## 10. Decision: Proceed?

**Recommendation: Yes.** The migration:

1. Solves the immediate problem (sync when sidebar closed)
2. Fixes the architectural inversion (ephemeral component owning persistent communication)
3. Improves security (all network I/O moves out of content script)
4. Reduces per-tab resource usage (single connection instead of per-tab)
5. Aligns with MV3 best practices (service worker as communication hub)
6. Enables future features (badge notifications, background auto-capture, cross-tab sync)

The phased approach ensures each step is independently testable and deployable, with rollback possible at any phase boundary.

---

## References

- [Chrome WebSocket in Service Workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets) - Official docs, Chrome 116+
- [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms) - Minimum intervals, limits
- [ADR-015](../decisions/ADR-015-hmac-signed-localhost.md) - HMAC auth design
- [ADR-016](../decisions/ADR-016-native-messaging-default.md) - Native messaging as default transport
- [Security Assessment](security-assessment.md) - Current threat model
