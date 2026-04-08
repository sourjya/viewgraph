# MCP Request Bridge - Tasks

## Tasks

### Phase 1: Request Queue

#### Step 1: request-queue.js - TDD

**RED:**
- [ ] 1.1 Test: create request returns { id, url, status: "pending", expiresAt }
- [ ] 1.2 Test: get request by id returns the request
- [ ] 1.3 Test: acknowledge transitions pending -> acknowledged
- [ ] 1.4 Test: complete sets status and captureFilename
- [ ] 1.5 Test: expired requests return status "expired"
- [ ] 1.6 Test: getPending returns only pending requests
- [ ] 1.7 Test: queue rejects when full (max 10)
- [ ] 1.8 Test: findByUrl matches normalized URLs
  - File: `server/tests/unit/request-queue.test.js`

**GREEN:**
- [ ] 1.9 Implement `server/src/request-queue.js`

### Phase 2: HTTP Receiver

#### Step 2: http-receiver.js - TDD

**RED:**
- [ ] 2.1 Test: GET /health returns { status: "ok" }
- [ ] 2.2 Test: GET /requests/pending returns pending requests
- [ ] 2.3 Test: POST /requests/:id/ack acknowledges a request
- [ ] 2.4 Test: POST /captures writes file and returns filename
- [ ] 2.5 Test: POST /captures completes matching request
- [ ] 2.6 Test: POST /captures rejects invalid JSON
- [ ] 2.7 Test: POST /captures rejects payload >5MB
  - File: `server/tests/unit/http-receiver.test.js`

**GREEN:**
- [ ] 2.8 Implement `server/src/http-receiver.js`

### Phase 3: MCP Tools

#### Step 3: request_capture tool - TDD

**RED:**
- [ ] 3.1 Test: creates request and returns { requestId, status }
- [ ] 3.2 Test: returns error when queue is full
  - File: `server/tests/unit/tools/request-capture.test.js`

**GREEN:**
- [ ] 3.3 Implement `server/src/tools/request-capture.js`

#### Step 4: get_request_status tool - TDD

**RED:**
- [ ] 4.1 Test: returns status for valid request id
- [ ] 4.2 Test: returns filename when completed
- [ ] 4.3 Test: returns error for unknown request id
  - File: `server/tests/unit/tools/get-request-status.test.js`

**GREEN:**
- [ ] 4.4 Implement `server/src/tools/get-request-status.js`

### Phase 4: Wire Up

#### Step 5: Integration
- [ ] 5.1 Wire queue + HTTP receiver + tools in index.js
- [ ] 5.2 Integration test: full lifecycle (request -> poll -> ack -> submit -> status)
- [ ] 5.3 Verify all tests pass
- [ ] 5.4 Update changelog, commit, push

## Task Status Legend

- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed
