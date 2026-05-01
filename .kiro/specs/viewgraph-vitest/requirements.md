# @viewgraph/vitest - Requirements

## Problem Statement

When a Vitest unit or component test fails, developers see assertion diffs but not what the UI actually looked like at the point of failure. ViewGraph has `@viewgraph/playwright` for E2E captures, but the unit/component test layer - where most test failures occur - has no equivalent. Vitest is 2-4x faster than Jest and is now the default for new Vite projects (Stack Overflow 2025, JetBrains 2025). A Vitest plugin that captures component state at assertion boundaries closes the gap between "test failed" and "here's what the UI looked like."

## User Stories

### US-1: Capture on test failure

As a developer running Vitest component tests, I want a ViewGraph capture automatically generated when a test fails, so that my AI agent can see the DOM state at the point of failure.

**Acceptance Criteria:**
- Plugin hooks into Vitest's `onTestFailed` lifecycle event
- Capture includes the rendered DOM tree from the test's container element
- Capture is saved as a standard `.viewgraph.json` file in `.viewgraph/captures/`
- Capture metadata includes: test file path, test name, assertion that failed
- Works with `@testing-library/react`, `@testing-library/vue`, and raw `render()` calls

### US-2: Explicit capture at assertion boundaries

As a developer writing component tests, I want to capture DOM state at specific points in my test, so that I can debug complex multi-step interactions.

**Acceptance Criteria:**
- Plugin exports a `capture(label?)` function usable inside test bodies
- Each call produces a timestamped capture with the optional label
- Multiple captures in one test are numbered sequentially (step-1, step-2, etc.)
- Captures include the current DOM state of the test's render container

### US-3: Agent consumes test captures

As an AI agent, I want test failure captures available through standard ViewGraph MCP tools, so that I can correlate test failures with DOM state without special handling.

**Acceptance Criteria:**
- Test captures appear in `list_captures` with a `source: "vitest"` indicator
- `get_page_summary` and `get_capture` work identically on test captures
- `get_annotations` returns empty (no human annotations on test captures)
- Test metadata (file, test name, assertion) is available in capture metadata

### US-4: Zero-config setup

As a developer, I want to add ViewGraph capture to my Vitest config with one line, so that setup is trivial.

**Acceptance Criteria:**
- Install: `npm install -D @viewgraph/vitest`
- Config: add `plugins: [viewgraph()]` to `vitest.config.ts`
- No additional configuration required for basic capture-on-failure behavior
- Optional config: `captureOnPass: boolean`, `outputDir: string`, `maxCaptures: number`

### US-5: Performance-safe defaults

As a developer running hundreds of tests, I want captures to not slow down my test suite significantly, so that I keep using the plugin.

**Acceptance Criteria:**
- Capture-on-failure only (default) - zero overhead on passing tests
- Each capture completes in < 50ms for a typical component (< 200 nodes)
- Plugin respects `maxCaptures` limit (default: 20) to prevent disk bloat on mass failures
- Plugin is automatically disabled in CI unless `VIEWGRAPH_CI=true` is set

## Non-Functional Requirements

- **Compatibility:** Vitest 1.0+ and 2.0+, Node.js 18+
- **Package size:** < 50KB installed (no heavy dependencies)
- **Format:** Output captures use the same v2.4.0+ format as browser extension captures
- **Isolation:** Plugin must not interfere with test execution, mocking, or other Vitest plugins
- **TypeScript:** Full type definitions included, strict-mode compatible

## Out of Scope

- Jest support (different plugin architecture - separate package if needed)
- Visual screenshot capture (DOM structure only, no pixel rendering)
- Automatic test generation from captures (that's `@vg-tests` prompt territory)
- Integration with Vitest UI reporter (future enhancement)
- Capturing component props/state beyond what's in the DOM
- Browser-mode Vitest (use `@viewgraph/playwright` for real browser tests)

## Research Citations

- Stack Overflow 2025 testing landscape: Vitest replacing Jest as default for new projects
- JetBrains Developer Ecosystem 2025: Vitest adoption accelerating
- Vitest is 2-4x faster than Jest across benchmarks
- Vitest is the default test runner for new Vite projects
