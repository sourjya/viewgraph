---
inclusion: always
---

# Engineering Execution Standards

## Runtime and Environment

- **MCP Server**: Node.js 18+ (LTS) with `@modelcontextprotocol/sdk`
- **Firefox Extension**: Manifest V3, service worker background, WXT framework
- **Language**: JavaScript (ES modules) throughout -- no TypeScript initially, add later if needed
- **Package Manager**: npm
- **Linting**: ESLint with recommended config
- **Testing**: Vitest (server), WXT test utils (extension)

## Project Structure

```
├── extension/                 (Firefox extension -- WXT project)
│   ├── manifest.json
│   ├── background.js          (service worker)
│   ├── content.js             (content script: DOM traversal)
│   ├── popup.html/js          (mode switcher UI)
│   ├── lib/                   (core modules)
│   ├── ui/                    (overlay, panels, sidebar)
│   ├── options/               (settings page)
│   ├── package.json           (extension dependencies)
│   └── tests/                 (extension tests)
├── server/                    (MCP server -- Node.js)
│   ├── index.js               (entry point)
│   ├── src/
│   │   ├── watcher.js
│   │   ├── indexer.js
│   │   ├── http-receiver.js
│   │   ├── request-queue.js
│   │   ├── tools/             (MCP tool handlers)
│   │   └── parsers/           (capture format parsers)
│   ├── package.json           (server dependencies)
│   └── tests/                 (server tests)
├── docs/                      (all documentation)
│   ├── technical-design.md
│   ├── architecture/
│   ├── decisions/
│   ├── changelogs/
│   ├── bugs/
│   ├── roadmap/
│   └── artifacts/
├── scripts/                   (git scripts, build scripts, deploy scripts)
├── logs/                      (command output logs)
├── .kiro/                     (steering, hooks, prompts, specs)
├── .gitignore
├── README.md
└── package.json               (root -- workspace config, shared scripts)
```

## Code Organization

- Source code lives in clearly separated directories: `extension/` and `server/`
- Each component has its own `package.json` and dependency manifest
- Root `package.json` uses npm workspaces to manage both
- Shared utilities are extracted into common modules, not duplicated

### Folder Organization Principles — MANDATORY

These rules apply regardless of framework, language, or stack.

#### Server/Backend: Domain-Grouped Within Layers

Organize server code by **layer first, domain second**. Each layer directory contains subdirectories grouped by domain when the project has more than a handful of files per layer.

**Rules:**
- Group by domain when a layer has 5+ files. Below that, flat is fine.
- Each domain subdirectory gets an `index.js` or `index.ts` that re-exports its public API.
- Shared/common directories are for truly cross-cutting concerns (logging, middleware, error handling). Not a dumping ground.
- Constants directories hold all domain constants — never define them inline in handler or service files.
- Adapt layer names to your framework's conventions.

#### Extension/Frontend: Feature-Sliced Design

Organize extension/frontend code by **feature first**. Each feature is a self-contained module.

**Rules:**
- Features never import from each other's internals — only through public API exports.
- If feature A needs something from feature B, it goes through B's public export, or it belongs in shared/lib.
- Each feature's public export is the only entry point. Internal files are private to the feature.
- This pattern works for any component-based or module-based architecture.

#### Shared vs Feature-Scoped — Graduation Policy

Code starts in the feature where it was first needed and graduates to shared only when reuse is proven:

1. **First use**: lives inside the feature directory
2. **Second feature needs it**: move it to shared and update both imports
3. **Never preemptively put code in shared** — that creates a junk drawer
4. Shared items must be genuinely generic: no feature-specific logic, no domain assumptions, no hardcoded business rules
5. If a shared item accumulates feature-specific parameters or branches, it should be split back into feature-scoped copies

## Test File Locations -- STRICT

- NEVER create `__tests__/` folders or co-located test files unless the framework requires it
- Tests go in a dedicated `tests/` directory within each component
- Mirror the source directory structure in the test directory

## Task-First Discipline -- MANDATORY

No code may be written without a task list. This is non-negotiable.
- Full spec features: `.kiro/specs/{feature-name}/tasks.md`
- Bug fixes: `docs/bugs/BUG-###-description.md`
- Follow tasks in order, mark progress with `[-]` and `[x]`

## Test-Driven Development (TDD) -- MANDATORY

1. RED: Write a failing test first
2. GREEN: Write minimal code to make it pass
3. REFACTOR: Clean up while keeping tests green

- NEVER write implementation code before writing its test
- NEVER skip the RED phase

### Testing Requirements

- Unit tests for all business logic and utilities
- Integration tests for API endpoints and tool handlers
- E2E tests for critical user workflows
- Minimum 80% code coverage for new code
- Both positive AND negative test cases for every feature

## Documentation Requirements

- All modules, classes, and functions must have docstrings/JSDoc
- Comments explain intent, tradeoffs, and "why" -- not syntax or "what"
- Changelog updated before every meaningful commit

## Security Requirements

- No credentials in source control
- Use .env.example for configuration templates
- Use appropriate linters for the project's languages

## Commit Discipline

- Commit at meaningful milestones
- Descriptive commit messages stating what and why
- Verify tests pass before committing

## Changelog Rolling Policy

- `docs/changelogs/CHANGELOG.md` should stay under 500 lines
- When exceeded, roll over to `docs/changelogs/CHANGELOG.YYYY-MM-DD.md`
- Write consolidated changelog entries grouped by feature
