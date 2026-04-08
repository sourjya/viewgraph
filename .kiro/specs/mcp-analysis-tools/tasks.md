# MCP Analysis Tools - Tasks

## Overview

Build 7 analysis MCP tools with shared query/analysis modules.
TDD mandatory: write failing tests first, then implement.

## Tasks

### Phase 1: Shared Analysis Modules

#### Step 1: node-queries.js - TDD Cycle

**RED Phase:**
- [ ] 1.1 Write tests for `flattenNodes` - flattens high/med/low into single array
- [ ] 1.2 Write tests for `filterByRole` - filters by role mapping (button, link, input, heading, image, table, nav, form)
- [ ] 1.3 Write tests for `filterInteractive` - returns nodes with actions
- [ ] 1.4 Write tests for `getNodeDetails` - retrieves DETAILS by node id
  - File: `server/tests/unit/analysis/node-queries.test.js`
  - _Requirements: FR-1, FR-2_

**GREEN Phase:**
- [ ] 1.5 Implement `server/src/analysis/node-queries.js`

#### Step 2: a11y-rules.js - TDD Cycle

**RED Phase:**
- [ ] 2.1 Write tests for `missing-aria-label` rule
- [ ] 2.2 Write tests for `missing-alt` rule
- [ ] 2.3 Write tests for `button-no-name` rule
- [ ] 2.4 Write tests for `missing-form-label` rule
  - File: `server/tests/unit/analysis/a11y-rules.test.js`
  - _Requirements: FR-4_

**GREEN Phase:**
- [ ] 2.5 Implement `server/src/analysis/a11y-rules.js`

#### Step 3: capture-diff.js - TDD Cycle

**RED Phase:**
- [ ] 3.1 Write tests for element matching by selector
- [ ] 3.2 Write tests for detecting added/removed elements
- [ ] 3.3 Write tests for detecting layout changes (bbox diff)
- [ ] 3.4 Write tests for detecting testid changes
  - File: `server/tests/unit/analysis/capture-diff.test.js`
  - _Requirements: FR-5_

**GREEN Phase:**
- [ ] 3.5 Implement `server/src/analysis/capture-diff.js`

### Phase 2: MCP Tools

#### Step 4: get_elements_by_role - TDD Cycle

**RED Phase:**
- [ ] 4.1 Write integration tests via InMemoryTransport
  - Test: returns buttons from valid capture
  - Test: returns empty array for role with no matches
  - Test: returns error for missing file
  - File: `server/tests/unit/tools/get-elements-by-role.test.js`

**GREEN Phase:**
- [ ] 4.2 Implement `server/src/tools/get-elements-by-role.js`

#### Step 5: get_interactive_elements - TDD Cycle

**RED Phase:**
- [ ] 5.1 Write integration tests
  - Test: returns all interactive elements with actions
  - Test: includes testid and aria-label when present
  - File: `server/tests/unit/tools/get-interactive.test.js`

**GREEN Phase:**
- [ ] 5.2 Implement `server/src/tools/get-interactive.js`

#### Step 6: find_missing_testids - TDD Cycle

**RED Phase:**
- [ ] 6.1 Write integration tests
  - Test: identifies interactive elements without data-testid
  - Test: suggests testid based on tag + text
  - File: `server/tests/unit/tools/find-missing-testids.test.js`

**GREEN Phase:**
- [ ] 6.2 Implement `server/src/tools/find-missing-testids.js`

#### Step 7: audit_accessibility - TDD Cycle

**RED Phase:**
- [ ] 7.1 Write integration tests
  - Test: detects missing aria-label on interactive elements
  - Test: detects missing alt on images
  - Test: returns issues grouped by severity
  - File: `server/tests/unit/tools/audit-accessibility.test.js`

**GREEN Phase:**
- [ ] 7.2 Implement `server/src/tools/audit-accessibility.js`

#### Step 8: compare_captures - TDD Cycle

**RED Phase:**
- [ ] 8.1 Write integration tests
  - Test: detects added elements
  - Test: detects removed elements
  - Test: detects layout changes
  - File: `server/tests/unit/tools/compare-captures.test.js`

**GREEN Phase:**
- [ ] 8.2 Implement `server/src/tools/compare-captures.js`

#### Step 9: get_annotations + get_annotated_capture - TDD Cycle

**RED Phase:**
- [ ] 9.1 Write integration tests for get_annotations
  - Test: returns annotations from review capture
  - Test: returns empty array for non-review capture
  - File: `server/tests/unit/tools/get-annotations.test.js`
- [ ] 9.2 Write integration tests for get_annotated_capture
  - Test: returns filtered capture with annotation comments
  - Test: filters to single annotation by id
  - File: `server/tests/unit/tools/get-annotated-capture.test.js`

**GREEN Phase:**
- [ ] 9.3 Implement `server/src/tools/get-annotations.js`
- [ ] 9.4 Implement `server/src/tools/get-annotated-capture.js`

### Phase 3: Wire Up + Verify

#### Step 10: Register all tools in index.js
- [ ] 10.1 Import and register all 7 new tools in `server/index.js`

#### Step 11: End-to-End Verification
- [ ] 11.1 Verify all tests pass: `npm run test:server`
- [ ] 11.2 Update CHANGELOG.md
- [ ] 11.3 Commit and push

## Task Status Legend

- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed
