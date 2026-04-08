# MCP Request Bridge - Tasks

## Tasks

### Phase 1: Request Queue

#### Step 1: request-queue.js - TDD

**RED:**
- [x] 1.1 Test: create request returns { id, url, status: "pending", expiresAt }
- [x] 1.2 Test: get request by id returns the request
- [x] 1.3 Test: acknowledge transitions pending -> acknowledged
- [x] 1.4 Test: complete sets status and captureFilename
- [x] 1.5 Test: expired requests return status "expired"
- [x] 1.6 Test: getPending returns only pending requests
- [x] 1.7 Test: queue rejects when full (max 10)
- [x] 1.8 Test: findByUrl matches normalized URLs
  - File: `server/tests/unit/request-queue.test.js`

**GREEN:**
- [x] 1.9 Implement `server/src/request-queue.js`

### Phase 2: HTTP Receiver

#### Step 2: http-receiver.js - TDD

**RED:**
- [x] 2.1 Test: GET /health returns { status: "ok" }
- [x] 2.2 Test: GET /requests/pending returns pending requests
- [x] 2.3 Test: POST /requests/:id/ack acknowledges a request
- [x] 2.4 Test: POST /captures writes file and returns filename
- [x] 2.5 Test: POST /captures completes matching request
- [x] 2.6 Test: POST /captures rejects invalid JSON
- [x] 2.7 Test: POST /captures rejects payload >5MB
  - File: `server/tests/unit/http-receiver.test.js`

**GREEN:**
- [x] 2.8 Implement `server/src/http-receiver.js`

### Phase 3: MCP Tools

#### Step 3: request_capture tool - TDD

**RED:**
- [x] 3.1 Test: creates request and returns { requestId, status }
- [x] 3.2 Test: returns error when queue is full
  - File: `server/tests/unit/tools/request-capture.test.js`

**GREEN:**
- [x] 3.3 Implement `server/src/tools/request-capture.js`

#### Step 4: get_request_status tool - TDD

**RED:**
- [x] 4.1 Test: returns status for valid request id
- [x] 4.2 Test: returns filename when completed
- [x] 4.3 Test: returns error for unknown request id
  - File: `server/tests/unit/tools/get-request-status.test.js`

**GREEN:**
- [x] 4.4 Implement `server/src/tools/get-request-status.js`

### Phase 4: Wire Up

#### Step 5: Integration
- [x] 5.1 Wire queue + HTTP receiver + tools in index.js
- [x] 5.2 Integration test: full lifecycle (request -> poll -> ack -> submit -> status)
- [x] 5.3 Verify all tests pass
- [ ] 5.4 Update changelog, commit, push

## Task Status Legend

- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed
