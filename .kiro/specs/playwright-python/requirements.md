# Playwright Python Fixture - Requirements

## Problem Statement

Python is the #1 growth language (+7pp in Stack Overflow 2025). FastAPI and Django teams commonly run Playwright Python for E2E testing. ViewGraph has `@viewgraph/playwright` for TypeScript/JavaScript, but Python teams have no equivalent. This forces Python-first teams to either skip structured DOM capture in tests or maintain a separate Node.js toolchain just for ViewGraph. Publishing `viewgraph-playwright` on PyPI completes the Python story alongside TracePulse Python support.

## User Stories

### US-1: Capture DOM during Python Playwright tests

As a Python developer running Playwright E2E tests, I want to capture structured DOM snapshots at any point in my test, so that my AI agent can analyze page state when tests fail.

**Acceptance Criteria:**
- Fixture provides `viewgraph.capture(page, label?)` that produces a `.viewgraph.json` file
- Capture format matches the TypeScript `@viewgraph/playwright` output exactly (v2.4.0+)
- Works with `pytest-playwright` fixture pattern (`page` fixture injection)
- Captures include: DOM tree, bounding boxes, computed styles, interactive elements, selectors

### US-2: Automatic capture on test failure

As a Python developer, I want ViewGraph to automatically capture DOM state when a Playwright test fails, so that I get context without adding explicit capture calls.

**Acceptance Criteria:**
- Fixture hooks into pytest's `pytest_runtest_makereport` to detect failures
- On failure, captures the current page state before teardown
- Capture metadata includes: test file, test function name, failure reason
- Configurable via pytest marker: `@pytest.mark.viewgraph(capture_on_fail=False)` to disable

### US-3: Annotate elements from tests

As a Python developer, I want to programmatically annotate elements during tests, so that my agent can see flagged issues with full DOM context.

**Acceptance Criteria:**
- Fixture provides `viewgraph.annotate(page, selector, comment, severity?)`
- Annotations appear in the capture's annotations section, identical to browser extension annotations
- Severity defaults to "major" if not specified
- Multiple annotations per capture are supported

### US-4: Agent consumes Python test captures

As an AI agent, I want captures from Python Playwright tests to be indistinguishable from TypeScript Playwright captures, so that all MCP tools work without modification.

**Acceptance Criteria:**
- Captures saved to `.viewgraph/captures/` (same directory as TS fixture)
- `list_captures` shows Python test captures with `source: "playwright-python"`
- All MCP tools (get_capture, audit_accessibility, compare_captures, etc.) work on these captures
- No server-side changes required

### US-5: Simple pytest integration

As a Python developer, I want to add ViewGraph capture with minimal setup, so that adoption is frictionless.

**Acceptance Criteria:**
- Install: `pip install viewgraph-playwright` (or `uv add viewgraph-playwright`)
- Usage: `import viewgraph_playwright` and use the `viewgraph` fixture in tests
- No configuration file required for defaults
- Optional `pyproject.toml` section for custom output directory and capture limits

## Non-Functional Requirements

- **Python version:** 3.9+ (matches Playwright Python minimum)
- **Dependencies:** Only `playwright` as a peer dependency, no heavy extras
- **Package size:** < 100KB installed
- **Performance:** Capture adds < 200ms per call (DOM serialization via page.evaluate)
- **Format parity:** Output must pass the same validation as TypeScript fixture captures
- **Publishing:** Published to PyPI as `viewgraph-playwright`
- **Type hints:** Full type annotations, py.typed marker included

## Out of Scope

- Python MCP server (ViewGraph server remains Node.js - captures are file-based)
- Playwright sync API support (async-first, sync can wrap if needed)
- Visual screenshot diffing (DOM structure capture only)
- Django/FastAPI test client integration (this is for browser E2E via Playwright only)
- Custom DOM traversal in Python (reuse the same JS traverser via page.evaluate)

## Research Citations

- Stack Overflow 2025: Python largest growth (+7pp), FastAPI +5pp
- Playwright Python bindings widely adopted for E2E testing
- Python is #1 language for AI-adjacent tooling - the exact teams using Kiro, Claude Code, Cursor
