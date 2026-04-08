# Implementation Plan: [Feature Name]

## Overview

[Brief description of the feature and its purpose]

**Architecture References:**
- [List relevant ADRs]

**Key Principles:**
- [List key architectural principles for this feature]

**Development Approach - TDD MANDATORY:**
- **RED -> GREEN -> REFACTOR**: Write failing tests FIRST, then minimal implementation, then refactor
- NEVER write implementation code before its test
- Each phase below follows strict TDD ordering: tests before implementation
- See engineering-standards.md for complete TDD guidelines

**Testing Strategy:**
- Unit tests for specific examples and edge cases (write FIRST)
- Integration tests for cross-module interactions
- E2E tests for critical user workflows
- All tests use stable selectors/identifiers exclusively

## Tasks

### Phase 1: [Phase Name]

#### Step 1: [Component Name] - TDD Cycle

**RED Phase: Write Tests First**
- [ ] 1.1 Write unit tests for [component/utility]
  - Test [specific behavior 1]
  - Test [specific behavior 2]
  - Test [edge case 1]
  - Test [error handling]
  - File: `tests/unit/[component].test.js`
  - _Requirements: [requirement IDs]_

**GREEN Phase: Implement to Pass Tests**
- [ ] 1.2 Implement [component/utility]
  - Create [file path]
  - Implement [method 1] to satisfy tests
  - Implement [method 2] to satisfy tests
  - Add comprehensive documentation (module, class, function level)
  - Add inline comments for non-obvious decisions
  - _Requirements: [requirement IDs]_

**REFACTOR Phase: Clean Up**
- [ ] 1.3 Refactor [component] (if needed)
  - Extract common patterns
  - Improve naming
  - Optimize performance
  - Ensure all tests still pass

#### Step 2: API/Tool Handlers - TDD Cycle

**RED Phase: Write Handler Tests First**
- [ ] 2.1 Write unit tests for [handler] routes/tools
  - Test successful request/response
  - Test validation errors
  - Test error handling
  - File: `tests/unit/[handler].test.js`
  - _Requirements: [requirement IDs]_

**GREEN Phase: Implement Handlers**
- [ ] 2.2 Create [handler] implementation
  - Implement handler logic
  - Add route-level documentation
  - _Requirements: [requirement IDs]_

#### Checkpoint: Phase 1 Complete

- [ ] 3. Verify Phase 1 completion
  - All unit tests passing
  - No linting errors
  - Changelog updated
  - Changes committed and pushed

---

### Phase 2: [Next Phase Name]

[Repeat TDD cycle structure for next phase]

---

## TDD Reminders

**Before writing ANY implementation code, ask yourself:**
1. Have I written a test for this functionality?
2. Have I seen that test FAIL for the right reason?
3. Am I writing the MINIMAL code to make the test pass?

**If the answer to any of these is NO, STOP and write the test first.**

## Task Status Legend

- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed
