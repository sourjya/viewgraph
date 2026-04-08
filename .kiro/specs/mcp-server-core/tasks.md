# MCP Server Core Tools — Tasks

## Overview

Implement file watcher, indexer, ViewGraph v2 parser, and 4 core MCP tools.
TDD mandatory: write failing tests first, then implement.

## Tasks

### Phase 1: Test Fixtures + Parser

#### Step 1: Test Fixtures
- [x] 1.1 Create `server/tests/fixtures/valid-capture.json` — minimal valid ViewGraph v2 capture with all sections
- [x] 1.2 Create `server/tests/fixtures/annotated-capture.json` — capture with ANNOTATIONS section
- [x] 1.3 Create `server/tests/fixtures/malformed-capture.json` — invalid JSON for error handling tests
  - _Requirements: FR-3.2_

#### Step 2: ViewGraph v2 Parser — TDD Cycle

**RED Phase:**
- [x] 2.1 Write tests for `parseMetadata` — extracts metadata from valid capture, returns error for malformed
- [x] 2.2 Write tests for `parseCapture` — parses all sections, handles missing sections gracefully
- [x] 2.3 Write tests for `parseSummary` — extracts summary data for get_page_summary
  - File: `server/tests/unit/viewgraph-v2.test.js`
  - _Requirements: FR-3.1, FR-3.2, FR-3.3_

**GREEN Phase:**
- [x] 2.4 Implement `server/src/parsers/viewgraph-v2.js`
  - `parseMetadata(jsonString)` — fast metadata-only extraction
  - `parseCapture(jsonString)` — full parse of all sections
  - `parseSummary(jsonString)` — summary extraction
  - Never throws — returns `{ ok, data/error }`
  - _Requirements: FR-3.1, FR-3.2, FR-3.3_

### Phase 2: Indexer

#### Step 3: Indexer — TDD Cycle

**RED Phase:**
- [x] 3.1 Write tests for indexer: add, remove, get, list (with limit/filter/sort), getLatest, eviction
  - File: `server/tests/unit/indexer.test.js`
  - _Requirements: FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.5_

**GREEN Phase:**
- [x] 3.2 Implement `server/src/indexer.js`
  - `createIndexer({ maxCaptures })` factory
  - Methods: add, remove, get, list, getLatest
  - LRU eviction when exceeding maxCaptures
  - _Requirements: FR-2.1 through FR-2.5_

### Phase 3: File Watcher

#### Step 4: Watcher

- [x] 4.1 Implement `server/src/watcher.js`
  - `createWatcher(dir, callbacks)` using chokidar
  - Filter to `*.json`, use `awaitWriteFinish`
  - Return watcher instance for cleanup
  - _Requirements: FR-1.1, FR-1.2, FR-1.3, FR-1.4_

- [x] 4.2 Write integration test: watcher + indexer together
  - Create temp dir, write a capture file, verify indexer picks it up
  - File: `server/tests/unit/watcher.test.js`

### Phase 4: MCP Tools

#### Step 5: Path Validation Utility

- [x] 5.1 Implement `server/src/utils/validate-path.js` — shared path validation
  - _Requirements: NFR-2_

#### Step 6: list_captures — TDD Cycle

**RED Phase:**
- [x] 6.1 Write integration tests using InMemoryTransport
  - Test: returns captures sorted by timestamp
  - Test: respects limit parameter
  - Test: filters by URL substring
  - Test: returns empty array when no captures
  - File: `server/tests/unit/tools/list-captures.test.js`
  - _Requirements: FR-4.1 through FR-4.5_

**GREEN Phase:**
- [x] 6.2 Implement `server/src/tools/list-captures.js`
  - Register tool with Zod schema, LLM-optimized description
  - _Requirements: FR-4.1 through FR-4.5_

#### Step 7: get_capture — TDD Cycle

**RED Phase:**
- [x] 7.1 Write integration tests
  - Test: returns full JSON for valid filename
  - Test: rejects path traversal attempts
  - Test: returns error for missing file
  - File: `server/tests/unit/tools/get-capture.test.js`
  - _Requirements: FR-6.1 through FR-6.4_

**GREEN Phase:**
- [x] 7.2 Implement `server/src/tools/get-capture.js`
  - _Requirements: FR-6.1 through FR-6.4_

#### Step 8: get_latest_capture — TDD Cycle

**RED Phase:**
- [x] 8.1 Write integration tests
  - Test: returns most recent capture
  - Test: returns summary when capture > 100KB
  - Test: filters by URL
  - Test: returns error when no captures match
  - File: `server/tests/unit/tools/get-latest.test.js`
  - _Requirements: FR-5.1 through FR-5.4_

**GREEN Phase:**
- [x] 8.2 Implement `server/src/tools/get-latest.js`
  - _Requirements: FR-5.1 through FR-5.4_

#### Step 9: get_page_summary — TDD Cycle

**RED Phase:**
- [x] 9.1 Write integration tests
  - Test: returns summary with url, title, viewport, element counts, clusters
  - Test: returns error for missing file
  - File: `server/tests/unit/tools/get-page-summary.test.js`
  - _Requirements: FR-7.1 through FR-7.3_

**GREEN Phase:**
- [x] 9.2 Implement `server/src/tools/get-page-summary.js`
  - _Requirements: FR-7.1 through FR-7.3_

### Phase 5: Wire Up + Verify

#### Step 10: Wire Everything in index.js

- [x] 10.1 Update `server/index.js` to:
  - Read VIEWGRAPH_CAPTURES_DIR from env
  - Create indexer, start watcher, register all 4 tools
  - Log startup info to stderr
  - _Requirements: FR-1.1, FR-2.1, NFR-4_

#### Step 11: End-to-End Verification

- [ ] 11.1 Manual test: start server via Kiro, call each tool with real capture files
- [x] 11.2 Verify all unit + integration tests pass: `npm run test:server`
- [x] 11.3 Update CHANGELOG.md
- [x] 11.4 Commit and push

## Task Status Legend

- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed
