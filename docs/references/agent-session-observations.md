# Cross-Product Agent Session Observations

Real-world agent debugging sessions captured for product improvement. Names deidentified.

## Date: 2026-05-02

### TracePulse Chokepoints (from canvas-app project sessions)

| CP | What happened | What TP could have done | Wishlist |
|---|---|---|---|
| CP-001 | Vitest alias resolution failure took multiple iterations to diagnose | Detect alias config errors faster via structured test output | W3 |
| CP-002 | 8 unused imports found one at a time across multiple tool calls | Return all errors in a file in one call | W2 |
| CP-004 | pptxgenjs type errors not correlated to the import statement | Diff-aware correlation linking type errors to recent changes | W4 |
| CP-006 | #src/* runtime resolution failure not caught at build time | File-scoped error aggregation | W2 |
| CP-007 | Test assertion mismatch after shape count change not flagged | Diff-aware correlation for test assertions | W4 |

### TracePulse Wishlist Items

| ID | Capability | Current State |
|---|---|---|
| W2 | File-scoped errors: all errors in one file, one call | Not built. `get_errors` returns by recency, not by file. |
| W3 | Structured test output: parsed vitest/jest results | Partially built (parsers exist). Gap: alias resolution errors not parsed. |
| W4 | Diff-aware correlation: link errors to recent code changes | `correlate_with_diff` exists but doesn't handle type errors or test assertion mismatches. |

### Chrome DevTools MCP Gap

| Issue | What happened | Suggested fix |
|---|---|---|
| file:// SVG preview | Agent spent 1+ hour trying to preview a local SVG. `new_page` with file:// showed blank. Tried spinning up Python HTTP server which hung (& not supported in shell). | Need a `preview_file` tool or data URI helper. Workaround: base64 encode SVG as `data:image/svg+xml;base64,...` URI. |

### ViewGraph Observations

- TracePulse `run_and_watch` + `get_error_context` successfully caught render pipeline crash in shape system (injectAria accessing undefined children)
- Agent went from error -> fingerprint -> source file -> root cause in 3 tool calls
- DevTools MCP `take_screenshot` used for visual verification after CLI render
