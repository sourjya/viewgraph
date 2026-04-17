# F11: Native Messaging Transport - Design

## Architecture

```
Browser Extension
    |
    v
transport.js (abstraction layer)
    |
    +--> chrome.runtime.sendNativeMessage (primary)
    |        |
    |        v
    |    native-host.js (stdin/stdout, length-prefixed JSON)
    |        |
    |        v
    |    MCP Server process (same process or IPC)
    |
    +--> fetch('http://127.0.0.1:9876/...') (fallback)
             |
             v
         HTTP Receiver (existing)
```

## Native Messaging Host

### Host Script: `server/native-host.js`

Reads length-prefixed JSON from stdin, processes messages, writes responses to stdout.

```js
// Chrome native messaging protocol:
// - Read 4-byte little-endian length prefix
// - Read that many bytes of JSON
// - Process message
// - Write 4-byte length prefix + JSON response
```

### Message Protocol

Request from extension:
```json
{
  "type": "capture",
  "payload": { "metadata": {...}, "nodes": [...] }
}
```

Response to extension:
```json
{
  "type": "capture:ok",
  "filename": "viewgraph-localhost-2026-04-17.json"
}
```

### Supported Message Types

| Type | Direction | Maps to HTTP |
|---|---|---|
| `info` | ext -> host -> ext | GET /info |
| `health` | ext -> host -> ext | GET /health |
| `capture` | ext -> host -> ext | POST /captures |
| `captures:list` | ext -> host -> ext | GET /captures |
| `annotations:resolved` | host -> ext | WS broadcast |
| `audit:results` | host -> ext | WS broadcast |
| `request:pending` | ext -> host -> ext | GET /requests/pending |
| `request:ack` | ext -> host -> ext | POST /requests/:id/ack |
| `request:decline` | ext -> host -> ext | POST /requests/:id/decline |
| `config:get` | ext -> host -> ext | GET /config |
| `config:put` | ext -> host -> ext | PUT /config |

### Chunking for Large Captures

Chrome limits native messages to 1MB. Captures can be 200KB+ (rarely over 1MB, but possible).

Strategy: if payload > 900KB, split into chunks:
```json
{ "type": "capture:chunk", "id": "abc", "index": 0, "total": 3, "data": "..." }
{ "type": "capture:chunk", "id": "abc", "index": 1, "total": 3, "data": "..." }
{ "type": "capture:chunk", "id": "abc", "index": 2, "total": 3, "data": "..." }
```

Host reassembles chunks before processing.

## Host Registration

### Chrome Manifest: `com.viewgraph.host.json`
```json
{
  "name": "com.viewgraph.host",
  "description": "ViewGraph native messaging host",
  "path": "/path/to/native-host.js",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://EXTENSION_ID/"]
}
```

Location: `~/.config/google-chrome/NativeMessagingHosts/com.viewgraph.host.json` (Linux)

### Firefox Manifest
Same format but location: `~/.mozilla/native-messaging-hosts/com.viewgraph.host.json`

### viewgraph-init Registration
`viewgraph-init` writes the manifest with the correct path and extension ID.

## Extension Transport Abstraction

### `extension/lib/transport.js`

```js
let useNative = null; // null = not tested, true/false = cached result

async function isNativeAvailable() {
  if (useNative !== null) return useNative;
  try {
    const res = await chrome.runtime.sendNativeMessage('com.viewgraph.host', { type: 'health' });
    useNative = res?.status === 'ok';
  } catch {
    useNative = false;
  }
  return useNative;
}

export async function sendCapture(data) {
  if (await isNativeAvailable()) {
    return nativeSend({ type: 'capture', payload: data });
  }
  return httpSend(data);
}
```

### Migration Path

Phase 1: Add transport.js, native-host.js, registration. Extension still uses HTTP.
Phase 2: Migrate extension calls to transport.js one by one.
Phase 3: Default to native messaging, HTTP as fallback.

## Testing Strategy

- Unit tests for native-host.js message parsing (length-prefix read/write)
- Unit tests for transport.js feature detection and fallback
- Unit tests for chunking logic
- Integration test: extension -> native host -> server -> response
- Backward compat test: extension with no native host falls back to HTTP
