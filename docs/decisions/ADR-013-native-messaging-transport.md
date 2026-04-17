# ADR-013: Native Messaging as Primary Transport with HTTP/WS Fallback

**Date:** 2026-04-17
**Status:** Proposed
**Deciders:** Sourjya S. Sen

## Context

ViewGraph's extension communicates with the MCP server via localhost HTTP (POST /captures, GET /info, etc.) and WebSocket (real-time annotation sync, audit results). This works but exposes the server to any process on localhost - the #1 attack surface identified in our STRIDE threat model (threats #1, #3, #4, #7).

Chrome's native messaging API provides cryptographic caller identity: only the registered extension (verified by extension ID) can communicate with the native messaging host. This eliminates the entire class of "malicious page talks to localhost" attacks.

## Decision

Adopt a layered transport architecture:

### Primary: Native Messaging (Extension ↔ Server)
- Chrome/Firefox native messaging for all extension-to-server communication
- Server runs as a native messaging host spawned by the browser
- Cryptographic caller identity - only the registered ViewGraph extension can connect
- No HTTP port needed for extension communication

### Secondary: HTTP/WS on Localhost (Fallback + Tooling)
- Retained for: Playwright fixture, CLI debugging (`curl`), backward compatibility
- Binds to `127.0.0.1` only (unchanged)
- No authentication in beta (unchanged, per ADR-010)
- Extension falls back to HTTP if native messaging is unavailable (e.g., extension loaded unpacked without native host installed)

### Future: HTTP/WS with Authentication (Remote Mode)
- For F11 Phase 2: remote MCP server mode
- API key authentication required
- Can bind to `0.0.0.0` for network access
- Not part of this ADR - will be a separate decision

## Transport Selection Logic (Extension)

```
Extension starts
    |
    v
Is native messaging host installed?
    |
    +--> Yes --> Use native messaging (primary)
    |            WS still connects for real-time events
    |
    +--> No  --> Fall back to HTTP/WS on localhost (secondary)
                 Log warning: "Native messaging not available, using HTTP fallback"
```

## What Changes

| Concern | Before | After |
|---|---|---|
| Extension → Server captures | HTTP POST localhost:9876 | Native messaging (primary), HTTP fallback |
| Extension → Server queries | HTTP GET localhost:9876 | Native messaging (primary), HTTP fallback |
| Real-time sync | WebSocket localhost:9876 | Native messaging events (primary), WS fallback |
| Playwright → Server | HTTP POST | HTTP POST (unchanged) |
| CLI debugging | curl localhost:9876 | curl localhost:9876 (unchanged) |
| Agent → Server | stdio JSON-RPC (MCP) | stdio JSON-RPC (unchanged) |

## What Does NOT Change

- MCP protocol (stdio) between agent and server - unaffected
- Playwright fixture - continues using HTTP
- Capture file format - unaffected
- Server tool implementations - unaffected
- `viewgraph-init` workflow - adds native messaging host registration

## STRIDE Threat Impact

| # | Threat | Before | After |
|---|---|---|---|
| 1 | Spoofing (fake captures) | Open via HTTP | Eliminated via native messaging |
| 3 | Info disclosure (page reads /info) | Open via HTTP | Eliminated - no HTTP needed for extension |
| 4 | DoS (flood captures) | Mitigated (payload limits) | Eliminated - only extension can send |
| 7 | Repudiation (no audit trail) | Open | Eliminated - cryptographic caller identity |
| 2 | Prompt injection | Partially mitigated (F19) | Same - transport doesn't affect DOM content |
| 5 | Path traversal | Mitigated (validate-path) | Same - still need validation |
| 6 | Supply chain | Mitigated (2FA) | Same |
| 8 | Sensitive data | Mitigated (.gitignore) | Same |

**Result:** 4 threats eliminated, 1 reduced. HTTP fallback means the old attack surface exists when native messaging is unavailable, but the default secure path is native messaging.

## Implementation Requirements

### Native Messaging Host
- A small Node.js script registered with Chrome/Firefox as a native messaging host
- Reads/writes length-prefixed JSON messages on stdin/stdout
- Forwards messages to the MCP server process (or is the MCP server process)
- Registration: `com.viewgraph.host.json` manifest in browser's native messaging directory

### Extension Changes
- New `native-messaging.js` module that wraps `chrome.runtime.sendNativeMessage`
- Transport abstraction: `sendCapture(data)` uses native messaging or HTTP based on availability
- Feature detection: try native messaging first, fall back to HTTP on error

### Server Changes
- New native messaging stdin/stdout handler alongside existing HTTP receiver
- Both transports feed into the same capture pipeline
- Server can run in native-messaging-only mode or dual mode

## Alternatives Considered

### 1. Replace HTTP entirely with native messaging
**Rejected because:** Playwright fixture needs HTTP. CLI debugging needs HTTP. Backward compat needs HTTP.

### 2. Keep HTTP only, add authentication
**Rejected because:** Localhost auth tokens can be stolen by any process that reads the token file. Native messaging provides stronger guarantees (cryptographic extension ID verification).

### 3. Use WebExtension native messaging for everything including MCP
**Rejected because:** MCP protocol uses stdio between agent and server. Native messaging is between extension and server. These are different communication channels with different requirements.

## Risks

- **Installation complexity:** Native messaging requires registering a host manifest in a browser-specific directory. `viewgraph-init` must handle this.
- **Cross-browser differences:** Chrome and Firefox have different native messaging manifest formats and registration paths.
- **Debugging difficulty:** Native messaging is harder to inspect than HTTP. Mitigated by keeping HTTP as fallback.
- **Message size limits:** Chrome native messaging has a 1MB message limit. Captures can exceed this. Mitigated by chunking or streaming.

## Consequences

- New native messaging host script and manifest
- Extension transport abstraction layer
- Server dual-transport support (native messaging + HTTP)
- `viewgraph-init` registers native messaging host
- HTTP receiver remains for Playwright, debugging, and fallback
- Spec: `.kiro/specs/native-messaging/` (to be created)
