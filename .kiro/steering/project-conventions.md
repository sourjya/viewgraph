---
inclusion: always
---

# Project Conventions

Rules specific to this project's codebase, tools, and architecture.

## Git and Terminal Workflow

Terminal output capture can be unreliable in some environments (TTY issues). Always use the standard git scripts in `scripts/` which pipe output through `tee` to `logs/`. Never use raw git commands directly.

### Standard git scripts

| Script | Purpose |
|---|---|
| `./scripts/git-status.sh` | Working tree status → `logs/git_status.log` |
| `./scripts/git-stage.sh` | Stage all changes → `logs/git_stage.log` |
| `./scripts/git-commit.sh "message"` | Commit with message → `logs/git_commit.log` |
| `./scripts/git-push.sh` | Push current branch → `logs/git_push.log` |
| `./scripts/git-branch.sh feat/name` | New branch from main → `logs/git_branch.log` |

## Domain Constants Strategy

**Rule: All domain constants live in a dedicated constants file or directory -- never inline in model files.**

## Testing Execution

- Always stream test output with verbose flags.
- Both positive AND negative test cases are required for every feature.

## Code Style

- ES modules (`import`/`export`) throughout -- no CommonJS `require()`
- Use parameterized queries for all database operations -- never string interpolation
- Separation of concerns: keep services as separate modules/classes
- Use interfaces/abstractions for shared behavior, then extend
- MCP server: ALL logging to `stderr`, NEVER `stdout` (stdout is JSON-RPC)
- Extension: use `chrome.storage` for state, never global variables (service worker lifecycle)
- Use `chrome.alarms` for periodic tasks, never `setInterval` (service worker terminates)

## Extension Development

- Develop and test primarily in Chrome (Firefox lacks localhost access for hot-reload)
- Build and validate in Firefox before every release
- Use WXT framework for cross-browser builds and HMR
- Content scripts must handle website CSP restrictions (Firefox-specific)
- All extensions must be signed via AMO for Firefox distribution
- Minimal permissions: `activeTab` + `storage` upfront, optional permissions for extras

## MCP Server Development

- Use `@modelcontextprotocol/sdk` -- the official TypeScript/JS SDK
- Use Zod for all input validation schemas
- Tool descriptions are prompts for the LLM, not documentation for humans
- Cap tool response sizes at ~100KB -- include metadata for truncated results
- Validate all file paths against `SIFR_CAPTURES_DIR` root -- no path traversal
- Use `InMemoryTransport` for integration tests
- Implement graceful shutdown on SIGINT/SIGTERM

## Architecture Decisions

- ADRs are required before major implementations -- store them in `docs/decisions/`.

## Command Output Logging -- MANDATORY

ALL commands that produce output you need to analyze MUST be logged to files using `tee`.
