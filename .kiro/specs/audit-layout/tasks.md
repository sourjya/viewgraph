# audit_layout - Tasks

## Phase 1: Layout Analysis Module (TDD)

- [x] 1.1 Write tests for `buildNodeMap` and `buildChildrenMap` helpers
- [x] 1.2 Implement `buildNodeMap` and `buildChildrenMap`
- [x] 1.3 Write tests for `detectOverflows` (positive + negative cases)
- [x] 1.4 Implement `detectOverflows`
- [x] 1.5 Write tests for `detectOverlaps` (positive + negative, tolerance)
- [x] 1.6 Implement `detectOverlaps`
- [x] 1.7 Write tests for `detectViewportOverflows`
- [x] 1.8 Implement `detectViewportOverflows`
- [x] 1.9 Write tests for `analyzeLayout` (integration of all detections)
- [x] 1.10 Implement `analyzeLayout`

## Phase 2: MCP Tool (TDD)

- [x] 2.1 Write integration test for audit-layout tool (valid capture, no issues)
- [x] 2.2 Write integration test for audit-layout tool (capture with layout issues)
- [x] 2.3 Write negative tests (invalid filename, missing file)
- [x] 2.4 Implement audit-layout.js tool handler
- [x] 2.5 Register tool in index.js

## Phase 3: Finalize

- [ ] 3.1 Run full test suite, verify no regressions
- [ ] 3.2 Build extension (verify no breakage)
- [ ] 3.3 Commit, merge to main
