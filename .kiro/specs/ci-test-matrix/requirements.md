# CI Test Matrix - Requirements

## Overview

Automated CI pipeline that runs the full test suite across multiple Node.js versions and browsers, builds the extension for Chrome and Firefox, and gates merges on passing tests.

## Functional Requirements

### FR-1: Test Matrix

- FR-1.1: Run server tests on Node.js 18, 20, and 22 (LTS versions)
- FR-1.2: Run extension tests on Node.js 18 and 22
- FR-1.3: Build Chrome extension and verify output exists
- FR-1.4: Build Firefox extension and verify output exists
- FR-1.5: Run ESLint across entire codebase (0 errors required, 0 warnings required)
- FR-1.6: Matrix runs on every push to main and every PR

### FR-2: Pipeline Stages

- FR-2.1: Stage 1 (parallel): lint + server tests + extension tests
- FR-2.2: Stage 2 (after tests pass): build Chrome extension + build Firefox extension
- FR-2.3: Stage 3 (optional, on tag): package Firefox extension for AMO submission
- FR-2.4: Total pipeline time target: under 5 minutes

### FR-3: Artifacts

- FR-3.1: Upload Chrome extension build as artifact on success
- FR-3.2: Upload Firefox extension build as artifact on success
- FR-3.3: Upload test coverage reports as artifacts
- FR-3.4: Artifacts retained for 30 days

### FR-4: Branch Protection

- FR-4.1: Require CI pass before merge to main
- FR-4.2: Require at least lint + tests to pass (builds can be advisory)

### FR-5: Caching

- FR-5.1: Cache npm dependencies between runs (keyed by package-lock.json hash)
- FR-5.2: Cache WXT build cache between runs
