# MCP Request Bridge - Requirements

## Overview

Enable bidirectional communication between the MCP server and the browser
extension. Currently the flow is one-way: extension writes captures, server
reads them. M3 adds the reverse: the agent (via MCP) can request a fresh
capture from the extension.

The bridge uses HTTP. The MCP server runs a lightweight HTTP receiver. The
extension polls for pending requests and submits completed captures.

## Functional Requirements

### FR-1: HTTP Receiver
- FR-1.1: Start an HTTP server on a configurable port (default 9876)
- FR-1.2: Listen on 127.0.0.1 only (localhost, no external access)
- FR-1.3: `POST /captures` - extension submits a completed capture
- FR-1.4: `GET /requests/pending` - extension polls for pending capture requests
- FR-1.5: `POST /requests/:id/ack` - extension acknowledges it picked up a request
- FR-1.6: Server starts/stops with the MCP server lifecycle
- FR-1.7: Graceful shutdown - close HTTP server on SIGINT/SIGTERM

### FR-2: Request Queue
- FR-2.1: In-memory queue of capture requests
- FR-2.2: Request states: `pending` -> `acknowledged` -> `completed` | `expired`
- FR-2.3: TTL-based expiry (default 60 seconds) - pending requests expire if not acknowledged
- FR-2.4: Each request has: id, url, status, createdAt, expiresAt, captureFilename
- FR-2.5: Queue is bounded (max 10 pending requests, reject with 429 if full)

### FR-3: MCP Tool - request_capture
- FR-3.1: Accept `url` parameter (the page URL to capture)
- FR-3.2: Create a request in the queue with status `pending`
- FR-3.3: Return `{ requestId, status: "pending" }`
- FR-3.4: Return error if queue is full

### FR-4: MCP Tool - get_request_status
- FR-4.1: Accept `request_id` parameter
- FR-4.2: Return current status of the request
- FR-4.3: When status is `completed`, include the capture `filename`
- FR-4.4: Return error for unknown request IDs

### FR-5: Capture Submission
- FR-5.1: `POST /captures` accepts ViewGraph JSON in request body
- FR-5.2: Server writes the capture to the captures directory
- FR-5.3: If the capture was requested (matches a pending/acknowledged request),
  update the request status to `completed` with the filename
- FR-5.4: If the capture was not requested (manual push from extension),
  accept it anyway (write to disk, index it)

## Non-Functional Requirements

### NFR-1: No new dependencies
- Use Node.js built-in `http` module, not Express

### NFR-2: Performance
- HTTP endpoints must respond in <50ms
- Queue operations are O(1)

### NFR-3: Security
- Bind to 127.0.0.1 only
- Validate capture JSON before writing to disk
- Reject payloads >5MB
