# Extension Performance Pipeline - Requirements

Based on [extension-performance-testing-pipeline.md](../../../docs/references/extension-performance-testing-pipeline.md).

## User Stories

### US-1: Bundle size gate
As a developer, I want the build to fail if the content script exceeds 50KB or the sidebar exceeds 150KB, so that extension injection stays fast on every page.

**Acceptance criteria:**
- Content script bundle < 50KB gzipped
- Background script bundle < 30KB gzipped
- Build fails with clear message showing actual vs budget size
- Budgets defined in a config file, not hardcoded in scripts

### US-2: Unit performance benchmarks
As a developer, I want vitest bench tests for DOM traversal, serialization, and annotation rendering, so that I catch performance regressions before they ship.

**Acceptance criteria:**
- `vitest bench` runs traverser on 500-node mock DOM in < 200ms
- `vitest bench` runs serializer on 500-element capture in < 100ms
- `vitest bench` runs annotation findTargets on 200 annotations in < 50ms
- Results written to `perf-results.json`
- Comparison against committed `perf-baseline.json` with 15% regression threshold
- Fails build if any benchmark degrades beyond threshold

### US-3: Extension E2E performance tests
As a developer, I want Puppeteer tests that load the built extension in headless Chrome and measure sidebar open time, capture time, and annotation render time.

**Acceptance criteria:**
- Sidebar opens within 500ms of icon click
- DOM capture completes within 2000ms on a 500-element page
- Annotation overlay renders within 100ms per annotation
- Content script injection completes within 200ms
- Tests run in `--headless=new` mode (Chrome 112+)
- Extension ID discovered automatically from service worker target

### US-4: Performance budget gate script
As a developer, I want a single `node scripts/perf-gate.js` command that aggregates all perf results and returns pass/fail.

**Acceptance criteria:**
- Reads `perf-baseline.json` and `perf-results.json`
- Fails with specific metric names and percentages on regression
- Passes silently when all budgets met
- Exit code 0 = pass, 1 = fail

### US-5: GitHub Actions workflow
As a maintainer, I want a CI workflow that runs the full performance pipeline on every PR.

**Acceptance criteria:**
- Runs on `pull_request` events
- Steps: install, build, bundle size, unit bench, E2E perf, budget gate
- Uploads `perf-results.json` as artifact
- Uses `xvfb-run` as fallback for Chrome headless issues
- Total pipeline < 5 minutes

## Non-Functional Requirements

- No new runtime dependencies (Puppeteer is dev-only)
- Performance tests must not interfere with existing unit/integration tests
- Baseline file committed to repo and updated manually after intentional changes
- All budgets configurable via JSON config, not hardcoded

## Out of Scope

- Lighthouse CI for sidebar HTML (defer to later -- requires extension ID discovery)
- Firefox performance testing (Chrome-only for v1)
- Production telemetry / real-user monitoring
- Memory leak detection (covered by existing DevTools MCP workflow)
