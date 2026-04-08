# MCP Request Bridge - Design

## Architecture

```
┌──────────────┐     MCP (stdio)     ┌──────────────────┐
│  Agent/IDE   │ ◄──────────────────► │  MCP Server      │
│  (Kiro, etc) │                      │                  │
└──────────────┘                      │  ┌────────────┐  │
                                      │  │ Request    │  │
                                      │  │ Queue      │  │
                                      │  └─────┬──────┘  │
                                      │        │         │
                                      │  ┌─────▼──────┐  │
                                      │  │ HTTP       │  │
                                      │  │ Receiver   │  │
                                      │  └─────┬──────┘  │
                                      └────────┼─────────┘
                                               │ HTTP (localhost)
                                      ┌────────▼─────────┐
                                      │  Browser         │
                                      │  Extension       │
                                      └──────────────────┘
```

## File Structure

```
server/src/
├── http-receiver.js     HTTP server (Node.js built-in http module)
├── request-queue.js     In-memory request queue with TTL
├── tools/
│   ├── request-capture.js   MCP tool: request_capture
│   └── get-request-status.js MCP tool: get_request_status
```

## Request Queue

Simple Map-based queue. No persistence needed - requests are ephemeral.

```javascript
// Queue entry shape
{
  id: "req-a1b2c3",       // crypto.randomUUID() short prefix
  url: "http://localhost:5173/jobs",
  status: "pending",       // pending | acknowledged | completed | expired
  createdAt: 1712567890000,
  expiresAt: 1712567950000, // createdAt + TTL
  captureFilename: null     // set when completed
}
```

### State transitions

```
pending ──► acknowledged ──► completed
   │              │
   └──► expired   └──► expired
```

Expiry is checked lazily on access (no timers). When any queue method
reads a request, it checks `Date.now() > expiresAt` and transitions
to `expired` if true.

## HTTP Receiver

Raw `http.createServer`. No Express, no dependencies.

### Endpoints

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/requests/pending` | - | `{ requests: [{ id, url, createdAt }] }` |
| POST | `/requests/:id/ack` | - | `{ id, status: "acknowledged" }` |
| POST | `/captures` | ViewGraph JSON body | `{ filename, requestId? }` |
| GET | `/health` | - | `{ status: "ok", pending: N }` |

### Capture submission flow

1. Extension POSTs capture JSON to `/captures`
2. Server validates JSON (must have `metadata` section)
3. Server generates filename from metadata (url + timestamp)
4. Server writes file to captures directory
5. Server checks if any pending/acknowledged request matches the URL
6. If match found: update request status to `completed`, set filename
7. Return `{ filename, requestId }` (requestId is null if unsolicited)

### URL matching for request completion

A capture completes a request if the capture's `metadata.url` matches
the request's `url` after normalizing:
- Strip trailing slashes
- Compare origin + pathname (ignore query string and hash)

## MCP Tool Registration

Both tools receive `(server, indexer, capturesDir, requestQueue)`.
The queue is created in `index.js` and passed to both the HTTP receiver
and the MCP tools.

## Startup Sequence

In `index.js`:

1. Create indexer (existing)
2. Create request queue (new)
3. Start HTTP receiver with queue reference (new)
4. Register all MCP tools including request_capture and get_request_status
5. Start file watcher (existing)
6. Connect MCP stdio transport (existing)

Shutdown: close HTTP server, then MCP server.
