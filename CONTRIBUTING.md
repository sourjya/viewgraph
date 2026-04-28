# Contributing to ViewGraph

Thanks for your interest in contributing! ViewGraph is open source under AGPL-3.0.

## Project Structure

```
viewgraph/
  extension/          # Chrome/Firefox extension (WXT + vanilla JS)
  server/             # MCP server (Node.js, 41 tools)
  packages/playwright/ # Playwright fixture
  power/              # Kiro Power assets (prompts, steering, hooks)
  scripts/            # CLI tools (init, uninstall, release, experiments)
  docs/               # Architecture docs, ideas, roadmap
  gitbook/            # User-facing documentation
```

## Setup

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
cd extension && npm install && cd ..
cd server && npm install && cd ..
```

## Running Tests

```bash
# Extension (1244 tests)
cd extension && npx vitest run

# Server unit tests (525 tests)
cd server && npx vitest run tests/unit

# MCP smoke test (verifies all 41 tools register)
cd server && npx vitest run tests/integration/mcp-smoke.test.js

# All tests
cd extension && npx vitest run && cd ../server && npx vitest run tests/unit
```

## Building the Extension

```bash
# Chrome
cd extension && npx wxt build

# Firefox
cd extension && npx wxt build --browser firefox

# Both + ZIP
bash scripts/build-extension.sh
```

## Linting

```bash
npx eslint .
# Must be 0 errors, 0 warnings before committing
```

## Development Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make changes, write tests
3. Run tests + lint
4. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
5. Merge to main when done

## Adding a New MCP Tool

1. Create `server/src/tools/your-tool.js` with a `register(server, indexer, capturesDir)` export
2. Use Zod schemas for parameters (not plain objects - the MCP SDK requires Zod)
3. Register in `server/index.js` (import + call in the registration block)
4. Update `EXPECTED_TOOL_COUNT` in `server/tests/integration/mcp-smoke.test.js`
5. Add to `autoApprove` in `scripts/viewgraph-init.js`
6. Update tool count in: README.md, server/README.md, gitbook/SUMMARY.md, gitbook/features/mcp-tools.md, power/prompts/vg-help.md, .kiro/prompts/vg-help.md

## Adding a New Enrichment Collector

1. Create `extension/lib/collectors/your-collector.js`
2. Wrap in `safeCollect()` in `extension/lib/enrichment.js` (both sync and async functions)
3. Add the key to `ENRICHMENT_KEYS` in both `extension/lib/capture/serializer.js` and `server/src/parsers/viewgraph-v2.js`
4. Update collector count in: README.md, gitbook/features/extension.md

## Adding a New Prompt

1. Create `power/prompts/vg-yourprompt.md` with frontmatter
2. Copy to `.kiro/prompts/vg-yourprompt.md`
3. Update prompt count in: README.md, server/README.md, npm-readme.md, power/prompts/vg-help.md
4. Update `EXPECTED_PROMPT_COUNT` in `server/tests/unit/prompts.test.js`

## Release Process

```bash
bash scripts/release.sh "X.Y.Z" "Description"
npm publish
cd packages/playwright && npm publish
```

The release script runs tests, bumps versions, builds extension ZIPs, commits, tags, pushes, and creates a GitHub release with ZIPs attached.

## Experiment-First Features

New format changes or optimizations require experiments before implementation. See `docs/ideas/` for the pattern:
1. Write an idea doc with design options and token impact analysis
2. Define gate experiments with success criteria
3. Run experiments on the 175-capture corpus (`scripts/experiments/`)
4. Only implement if the gate passes

## Code Style

- ESLint with zero tolerance (0 errors, 0 warnings)
- JSDoc on all exports
- Conventional commits
- No em dashes in user-facing docs (use hyphens)
