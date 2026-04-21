# ADR-016: Native Messaging as Default with HTTP Fallback

- **Status**: Accepted
- **Date**: 2026-04-21

## Context

ViewGraph has two communication paths between the extension and server:

1. **HTTP localhost** (current default) - extension sends to `http://127.0.0.1:9876`. Any local process can reach this. Unauthenticated (ADR-010). HMAC signing planned (ADR-015) but adds complexity.

2. **Native messaging** (implemented, secondary) - browser spawns server as native host, communicates via stdin/stdout. Only the registered extension can communicate. No ports, no network, no auth needed.

Native messaging is strictly more secure but requires a host manifest file installed on the user's machine. Currently it's behind a `--native-host` flag that nobody uses.

The question: why maintain two paths when one is clearly better?

## Decision

Make native messaging the **default** communication path. HTTP localhost becomes the **automatic fallback** when native messaging is unavailable. No user configuration, no settings toggle.

### Detection Flow

```
Extension sidebar opens
  │
  ├── Check: is native messaging host registered?
  │     │
  │     ├── YES → use native messaging (secure, zero-config)
  │     │         No ports. No auth. Browser-enforced identity.
  │     │
  │     └── NO → fall back to HTTP localhost
  │               Port scan 9876-9879. HMAC if available.
  │               Show "unsigned mode" indicator if no HMAC.
  │
  └── Settings shows active mode (read-only)
```

### How Users Get Native Messaging

**Path A: `viewgraph-init` (recommended)**
```bash
npm install -g @viewgraph/core
cd ~/my-project
viewgraph-init
```
`viewgraph-init` already exists. We add one step: register the native messaging host manifest. This is a one-time operation per machine (not per project).

**Path B: Zero-config (`npx` in MCP JSON)**
```json
{ "command": "npx", "args": ["-y", "@viewgraph/core"] }
```
No `viewgraph-init` run. Native messaging host not registered. Extension auto-detects and falls back to HTTP. Everything works, just less secure.

**Path C: Explicit install**
```bash
viewgraph-init --register-native-host
```
For users who want native messaging without the full init flow.

### Why Auto-Detection, Not a Toggle

| Approach | Pros | Cons |
|---|---|---|
| **Settings toggle** | User control | Choice paralysis, support burden, users pick wrong option |
| **Auto-detect** (this ADR) | Zero friction, always picks best available | Less user control |
| **Force native messaging** | Maximum security | Breaks zero-config path, high friction |

Auto-detection is the right choice because:
1. **Users don't care about transport** - they care about "does it work"
2. **The secure path should be the easy path** - running `viewgraph-init` gives you security for free
3. **No support burden** - no "which mode should I use?" questions
4. **Graceful degradation** - HTTP fallback means nothing breaks

### Native Messaging Host Manifest

Chrome and Firefox require a JSON manifest file at a platform-specific location:

**Chrome (Linux):** `~/.config/google-chrome/NativeMessagingHosts/com.viewgraph.host.json`
**Chrome (macOS):** `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.viewgraph.host.json`
**Chrome (Windows):** Registry key + JSON file
**Firefox:** `~/.mozilla/native-messaging-hosts/com.viewgraph.host.json`

Manifest content:
```json
{
  "name": "com.viewgraph.host",
  "description": "ViewGraph MCP Server",
  "path": "/usr/local/bin/viewgraph",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://EXTENSION_ID/"]
}
```

`viewgraph-init` detects the OS and browser, writes the manifest to the correct location, and sets the `path` to the installed `viewgraph` binary.

## Security Comparison

| Property | Native Messaging | HTTP + HMAC (ADR-015) | HTTP Unsigned (current) |
|---|---|---|---|
| Port exposure | None | 9876-9879 open | 9876-9879 open |
| Authentication | Browser-enforced extension ID | HMAC signature | None |
| Injection by other apps | Impossible | Requires file access | Any local process |
| Replay attacks | N/A (no network) | 30s timestamp window | Possible |
| Process discovery | Invisible | Port scan reveals | Port scan reveals |
| Setup required | `viewgraph-init` (one-time) | Automatic | None |
| Complexity | Low (browser handles everything) | Medium (crypto, handshake) | None |

Native messaging eliminates the entire threat class. HMAC mitigates it. Unsigned accepts the risk.

## Implementation Plan

### Phase 1: viewgraph-init registers native host
- Detect OS and browser(s) installed
- Write manifest to correct platform-specific location
- Set `path` to the `viewgraph` binary (from `npm install -g`)
- Verify registration with a test connection
- Add `--unregister-native-host` for cleanup

### Phase 2: Extension auto-detection
- On sidebar open: `chrome.runtime.sendNativeMessage('com.viewgraph.host', { type: 'ping' })`
- If response received: native messaging available, use it
- If error (host not found): fall back to HTTP discovery
- Cache the result for the session (don't re-detect on every operation)

### Phase 3: Transport abstraction
- `transport.js` gets a `mode` property: `'native'` or `'http'`
- All existing `_query()` and `_send()` calls route through the active transport
- No changes needed in any consumer (sidebar, collectors, etc.)
- Settings footer shows mode indicator: "Native" (green lock) or "HTTP" (gray)

### Phase 4: Migration path
- `viewgraph-init` prompts: "Register native messaging host? (recommended) [Y/n]"
- `viewgraph-doctor` checks if native host is registered, suggests fix if not
- Docs updated: native messaging is the recommended path
- HTTP remains fully supported (no deprecation)

## Consequences

- `viewgraph-init` gains native host registration (one-time per machine)
- Extension adds ~50ms detection check on sidebar open
- `transport.js` becomes transport-agnostic (native or HTTP)
- HTTP path remains fully functional (no breaking changes)
- HMAC auth (ADR-015) becomes HTTP-only concern (native messaging doesn't need it)
- Settings shows active mode as read-only indicator

## Relationship to Other ADRs

- **ADR-010** (remove HTTP auth): HTTP remains unauthenticated for zero-config path
- **ADR-015** (HMAC signing): Applies only to HTTP fallback, not native messaging
- **This ADR**: Makes native messaging default, HTTP becomes fallback
- Together: native messaging users get browser-enforced security, HTTP users get HMAC, zero-config users get unsigned with warning

## References

- [Chrome Native Messaging docs](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Firefox Native Messaging docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
- [ADR-010](ADR-010-remove-http-auth-beta.md) - HTTP auth removal rationale
- [ADR-015](ADR-015-hmac-signed-localhost.md) - HMAC signing for HTTP fallback
- [STRIDE Threat Model](../architecture/threat-model-stride.md) - Threats #1, #3
- F11 Phase 1-5 - Existing native messaging implementation
