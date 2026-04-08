# SingleFile Fidelity Measurement - Tasks

## Tasks

### Phase 1: HTML Snapshot (Extension)

- [ ] 1.1 Build `extension/lib/html-snapshot.js` - lightweight DOM serializer
- [ ] 1.2 Add snapshot toggle to popup UI
- [ ] 1.3 Wire snapshot capture into content script message handler
- [ ] 1.4 Update background script to POST HTML to /snapshots
- [ ] 1.5 Build and test extension

### Phase 2: Snapshot Receiver (Server)

#### Step 2: snapshot endpoint - TDD

**RED:**
- [ ] 2.1 Test: POST /snapshots writes HTML file to snapshots/ dir
- [ ] 2.2 Test: POST /snapshots derives filename from header
- [ ] 2.3 Test: POST /snapshots rejects missing header
- [ ] 2.4 Test: POST /snapshots rejects payload >10MB
  - File: `server/tests/unit/snapshot-receiver.test.js`

**GREEN:**
- [ ] 2.5 Add snapshot endpoints to http-receiver.js
- [ ] 2.6 Create snapshots/ and reports/ dirs on server startup

### Phase 3: Fidelity Comparator (Server)

#### Step 3: fidelity comparison - TDD

**RED:**
- [ ] 3.1 Test: parse HTML snapshot extracts elements with tags and testids
- [ ] 3.2 Test: compare returns element coverage metrics
- [ ] 3.3 Test: compare returns testid coverage metrics
- [ ] 3.4 Test: compare returns interactive coverage metrics
- [ ] 3.5 Test: compare identifies missing elements with reasons
- [ ] 3.6 Test: overall score is weighted average
  - File: `server/tests/unit/analysis/fidelity.test.js`

**GREEN:**
- [ ] 3.7 Implement `server/src/analysis/fidelity.js`

### Phase 4: MCP Tool + Auto-Report

#### Step 4: get_fidelity_report tool - TDD

**RED:**
- [ ] 4.1 Test: returns fidelity report for paired capture+snapshot
- [ ] 4.2 Test: returns error when no snapshot exists for capture
  - File: `server/tests/unit/tools/get-fidelity-report.test.js`

**GREEN:**
- [ ] 4.3 Implement `server/src/tools/get-fidelity-report.js`
- [ ] 4.4 Auto-generate report when snapshot is received (matching capture exists)
- [ ] 4.5 Update fidelity-summary.json on each new report

### Phase 5: Wire Up + Ship

- [ ] 5.1 Register new tool and endpoints in index.js
- [ ] 5.2 Integration test: full flow (capture + snapshot + report)
- [ ] 5.3 Test with manual SingleFile HTML dropped into snapshots/
- [ ] 5.4 Update changelog, docs, merge to main

## Task Status Legend

- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed
