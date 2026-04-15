# Contributing to ViewGraph

Thanks for your interest in contributing to ViewGraph! This guide covers how to set up the development environment, run tests, and submit changes.

## Prerequisites

- Node.js 18+ (LTS)
- npm 9+
- Chrome 116+ (for extension development)
- Git

## Setup

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
```

This installs dependencies for both the server and extension via npm workspaces.

## Development

```bash
npm run dev:server     # MCP server with file watcher
npm run dev:ext        # Extension dev server (Chrome HMR)
npm run dev:ext:ff     # Extension dev server (Firefox HMR)
```

Load the extension in Chrome:
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click Load unpacked
4. Select `extension/.output/chrome-mv3`

## Testing

```bash
npm test               # All tests
npm run test:server    # Server only (331 tests)
npm run test:ext       # Extension only
npm run lint           # ESLint
```

All tests must pass before submitting a PR. Both positive and negative test cases are required for new features.

## Project Structure

```
server/          MCP server (Node.js, ES modules)
  src/tools/     36 MCP tool handlers
  src/analysis/  Analysis modules (a11y, layout, diff, etc.)
  tests/         Server tests (Vitest)
extension/       Browser extension (WXT, Manifest V3)
  lib/           Core modules
  entrypoints/   background, content, popup, options
  tests/         Extension tests (Vitest + jsdom)
packages/
  playwright/    Playwright fixture
power/           Kiro Power assets (hooks, prompts, steering)
docs/            Documentation
scripts/         Build and utility scripts
```

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/description` | `feat/playwright-bridge` |
| Bug fix | `fix/bug-NNN-description` | `fix/bug-009-multi-project-routing` |
| Tests | `test/description` | `test/routing-edge-cases` |
| Docs | `docs/description` | `docs/multi-project-guide` |

## Commit Messages

Conventional Commits format:

```
feat(server): add list_captures MCP tool
fix(extension): handle empty captures directory
test: 28 tests for multi-project routing
docs: update README with accuracy section
```

## Submitting Changes

1. Create a branch from `main`
2. Make your changes
3. Ensure all tests pass (`npm test`)
4. Ensure lint passes (`npm run lint`)
5. Commit with a descriptive message
6. Push and open a PR

## Code Style

- ES modules (`import`/`export`) throughout - no CommonJS
- JSDoc comments on all public functions
- Comments explain "why", not "what"
- MCP server: all logging to `stderr`, never `stdout`

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.

## Resources

- [Documentation](https://chaoslabz.gitbook.io/viewgraph)
- [Issue Tracker](https://github.com/sourjya/viewgraph/issues)
- [Quick Start](https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start)
