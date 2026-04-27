# ADR-017: Service Worker Communication Migration

- **Status**: Accepted
- **Date**: 2026-04-27

## Context

All extension-to-server communication (HTTP, WebSocket, auth, polling) currently lives in the content script. The content script is ephemeral - it's injected per-tab and destroyed when the sidebar closes. This creates five problems:

1. **No sync when sidebar is closed** - agent resolves annotations, user doesn't see it until they reopen the sidebar and a poll cycle completes
2. **No capture request delivery** - agent calls `request_capture`, nobody polls until sidebar opens
3. **Per-tab duplication** - 3 open sidebars = 3 WebSocket connections, 3 polling loops, 3 server discoveries
4. **Auth state is ephemeral** - HMAC session (ADR-015) lost on every sidebar destroy, re-handshake on every open
5. **Discovery runs twice** - background.js and content script both scan ports independently with separate registries

The root cause is an architectural inversion: the ephemeral content script owns the persistent communication layer. The service worker (background.js) - the only component that persists across tab switches and sidebar toggles - is reduced to a dumb relay for capture pushes.

## Decision

Move all server communication to the service worker. The content script becomes a pure UI layer that communicates with the service worker via `chrome.runtime.sendMessage`.

### Architecture Change

**Before:**
```
Content Script (ephemeral, per-tab)
  ├── discovery.js      Port scan, server registry
  ├── auth.js           HMAC handshake, session state
  ├── transport.js      HTTP + WebSocket
  └── sync.js           setInterval polling (5s/3s)

Service Worker (persistent)
  └── pushToServer()    Direct fetch (separate from transport)
```

**After:**
```
Service Worker (persistent, owns all communication)
  ├── discovery-sw.js   Single port scan, single registry
  ├── auth (storage)    HMAC session in chrome.storage.session
  ├── transport.js      HTTP + WebSocket (single connection)
  └── sync-alarms.js    chrome.alarms polling (30s/60s)

Content Script (ephemeral, pure UI)
  └── transport-client.js   Proxy via chrome.runtime.sendMessage
```

### Key Design Decisions

**WebSocket connects only when sidebar is open.** The service worker tracks open sidebar count via `vg-sidebar-opened`/`vg-sidebar-closed` messages. When count drops to zero, WebSocket disconnects and the service worker terminates naturally after 30s. Alarms handle background polling.

**Alarms for background sync, not WebSocket.** Keeping a WebSocket alive requires 20s keepalive pings which prevent service worker termination. This wastes resources when no UI is displaying events. Alarms (30s unpacked, 60s published) are sufficient for background sync - the latency tolerance is higher when no sidebar is open.

**Auth in chrome.storage.session.** Session storage is extension-only, cleared on browser restart, and survives service worker termination. More secure than module variables in content script memory.

**Badge for pending requests.** `chrome.action.setBadgeText` shows a count when the agent requests a capture with the sidebar closed. This is the only user-visible change when the sidebar is closed.

## Alternatives Considered

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Sync-on-open** (immediate full sync when sidebar opens) | Simplest, no architecture change | No badge, no background sync, still per-tab duplication | Rejected - doesn't fix the root cause |
| **Keep WebSocket always alive** in SW | Real-time even when sidebar closed | Prevents SW termination, wastes server resources, 20s keepalive overhead | Rejected - overkill for background sync |
| **Service worker owns all communication** (this ADR) | Fixes all 5 problems, aligns with MV3 best practices, security improvement | More complex, phased migration needed | **Accepted** |
| **Offscreen document** for persistent connection | Can hold WebSocket without SW lifecycle issues | Chrome-only, deprecated pattern, adds complexity | Rejected |

## Migration Strategy

6 phases, each independently deployable:

0. **Transport client proxy** - `transport-client.js` with same API, routes via `sendMessage`. Zero behavior change.
1. **Discovery + auth in SW** - single discovery, persistent auth session
2. **HTTP transport in SW** - all HTTP through service worker
3. **WebSocket in SW** - real-time events via service worker
4. **Alarm-based sync** - background polling, badge notifications
5. **Cleanup** - remove dead code, update docs

Each phase has a checkpoint gate. If Phase 3 has issues, Phases 0-2 still work with polling fallback.

## Security Impact

**Net positive.** See [research doc](../architecture/service-worker-migration-research.md#4-security-impact-analysis) for full analysis.

| Improvement | Detail |
|---|---|
| Content script isolation | Zero direct HTTP/WebSocket from content script to server |
| Auth credential protection | HMAC secrets in `chrome.storage.session`, not content script memory |
| Reduced attack surface | Single discovery instead of duplicate port scans |
| Fewer auth handshakes | Session persists across sidebar lifecycle |

| New consideration | Mitigation |
|---|---|
| Service worker as single point of failure | Chrome auto-restarts on any chrome.* event. Alarms ensure periodic restart. |
| Auth in chrome.storage.session | Extension-only storage, cleared on browser restart. More secure than module variables. |

## Consequences

- Content script bundle size decreases (transport.js, auth.js removed)
- Service worker gains ~10KB of transport/discovery/auth logic
- Sidebar open adds ~1ms latency (message passing vs direct call)
- Background sync enables badge notifications for capture requests
- Auth session persists across sidebar open/close (fewer handshakes)
- Single WebSocket connection instead of per-tab connections
- Alarms add 30s-60s latency for background sync (acceptable for sidebar-closed scenarios)

## References

- [Research Document](../architecture/service-worker-migration-research.md) - full codebase audit, pitfalls, testing strategy
- [Spec](../../.kiro/specs/sw-communication/) - requirements, design, tasks
- [ADR-015](ADR-015-hmac-signed-localhost.md) - HMAC auth (session now persists in SW)
- [ADR-016](ADR-016-native-messaging-default.md) - Native messaging (unaffected, already in SW)
- [Chrome WebSocket in Service Workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets) - Chrome 116+ support
