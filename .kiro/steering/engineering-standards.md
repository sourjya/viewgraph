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

### Folder Organization Principles - MANDATORY

These rules apply regardless of framework, language, or stack.

#### Server/Backend: Domain-Grouped Within Layers

Organize server code by **layer first, domain second**. Each layer directory contains subdirectories grouped by domain when the project has more than a handful of files per layer.

**Rules:**
- Group by domain when a layer has 5+ files. Below that, flat is fine.
- Each domain subdirectory gets an `index.js` or `index.ts` that re-exports its public API.
- Shared/common directories are for truly cross-cutting concerns (logging, middleware, error handling). Not a dumping ground.
- Constants directories hold all domain constants - never define them inline in handler or service files.
- Adapt layer names to your framework's conventions.

#### Extension/Frontend: Feature-Sliced Design

Organize extension/frontend code by **feature first**. Each feature is a self-contained module.

**Rules:**
- Features never import from each other's internals - only through public API exports.
- If feature A needs something from feature B, it goes through B's public export, or it belongs in shared/lib.
- Each feature's public export is the only entry point. Internal files are private to the feature.
- This pattern works for any component-based or module-based architecture.

#### Shared vs Feature-Scoped - Graduation Policy

Code starts in the feature where it was first needed and graduates to shared only when reuse is proven:

1. **First use**: lives inside the feature directory
2. **Second feature needs it**: move it to shared and update both imports
3. **Never preemptively put code in shared** - that creates a junk drawer
4. Shared items must be genuinely generic: no feature-specific logic, no domain assumptions, no hardcoded business rules
5. If a shared item accumulates feature-specific parameters or branches, it should be split back into feature-scoped copies

## Reusable Component Architecture -- MANDATORY

Before building any new service, module, component, or helper, think reuse-first.

### Design-Time Mindset

1. **Search before building** -- scan the codebase for existing implementations. Duplication is a bug.
2. **Identify the generic core** -- extract the generic core as a standalone unit with clean inputs/outputs.
3. **Design for reuse, place locally** -- architect with clean interfaces but place in the feature where first needed.
4. **Pure functions by default** -- helpers should be pure functions wherever possible.
5. **Parameterize, don't specialize** -- accept variations as parameters rather than forking.

### When NOT to Make Something Reusable

- If it requires more than 3 domain-specific parameters to generalize, keep it feature-scoped
- If the generic version would be more complex than two specialized copies, don't abstract
- If only one consumer exists and no second is foreseeable, don't over-engineer

### Review Checkpoint

When designing any new module, answer these before writing code:
- Does something similar already exist in the codebase?
- What is the generic core vs. the domain-specific wrapper?
- Could another feature, service, or project use this with zero modification?
- Am I hardcoding anything that should be a parameter?

## Infrastructure Abstraction -- MANDATORY

**Every external dependency gets an interface.** Storage, email, payments, auth providers, AI models, notification channels - all must be accessed through an abstract interface with swappable backend implementations. No service should be hardwired to a specific vendor or infrastructure.

### Adapter Pattern for External Services

Define an abstract interface for each infrastructure concern. Implement one adapter per backend. Application code depends only on the interface, never on a concrete implementation.

This applies to:
- **File storage** (local filesystem ↔ S3 ↔ GCS)
- **Configuration persistence** (file ↔ localStorage ↔ IndexedDB)
- **Email/SMS** (console logger ↔ SES ↔ SendGrid)
- **Notifications** (log ↔ SNS ↔ WebSocket)
- **AI/ML providers** (local model ↔ OpenAI ↔ Bedrock)
- **Payment processing**, **auth providers**, and any other external service

### Factory + Config-Driven Instantiation

Backends are selected via configuration, never hardcoded. A factory function reads the config and returns the correct adapter:

```python
storage = create_storage_backend(settings.STORAGE_BACKEND)  # "local" | "s3"
email = create_email_backend(settings.EMAIL_BACKEND)         # "console" | "ses"
```

- The factory is the only place that knows about concrete implementations
- Application code receives the interface - it never imports a specific backend directly
- Switching providers is a config change, not a code change

### Secure Defaults

All infrastructure adapters must enforce security at the interface level:

1. **Content-type validation** - never trust client-provided MIME types on upload. Validate server-side.
2. **Size limits at the interface** - enforce max file size in the abstract interface, not just the implementation. Every backend inherits the same limits.
3. **Path traversal prevention** - sanitize all keys and paths. Reject `../`, absolute paths, and null bytes.
4. **Signed/expiring URLs** - never expose raw storage paths (S3 keys, file paths). All download URLs must be signed with expiration.
5. **Least privilege** - each adapter uses credentials scoped to its specific function. Storage adapters don't get database credentials.

### Idempotency

- **Uploads** are idempotent - uploading the same key with the same content is a no-op
- **Deletes** are idempotent - deleting a non-existent object succeeds silently
- **Config writes** are idempotent - writing the same value is a no-op
- Design all infrastructure operations so they can be safely retried without side effects

### Observability

Every infrastructure adapter must emit structured logs for every operation:
- **What**: operation type (upload, download, delete, send)
- **Target**: key, recipient, resource identifier
- **Size**: bytes transferred (where applicable)
- **Duration**: wall-clock time of the operation
- **Outcome**: success or failure with error category
- The abstract interface defines the logging contract - implementations inherit it, not duplicate it

## Centralized Configuration & Constants -- MANDATORY

**ZERO embedded literals.** All configuration values, magic numbers, string constants, and environment-dependent settings must live in dedicated, centralized locations.

### Rules

1. **No string literals in business logic** -- all go in constants files or config.
2. **No magic numbers** -- every numeric value with business meaning gets a named constant.
3. **Config reads from environment** -- all environment-dependent values go through a single config module.
4. **Constants are grouped by domain** -- not one giant constants file.
5. **Feature-scoped constants stay in the feature** -- graduates to shared when a second consumer appears.
6. **Enums/const objects over string literals** -- use `as const` or similar for fixed option sets.
7. **Single source of truth** -- never duplicate constants across server and extension.

## Test Folder Organization -- STRICT

- NEVER create `__tests__/` folders or co-located test files unless the framework requires it
- Tests go in a dedicated `tests/` directory within each component
- Mirror the source directory structure in the test directory
- **Unit test subdirectories mirror source domains**
- **One test file per source file**
- **Shared fixtures/setup in a central setup file**
- **Integration tests are separate from unit tests**
- **Create subdirectories as domains emerge** -- don't pre-create empty test directories

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

## Themed Dialogs -- MANDATORY

**All confirmation dialogs, alerts, and informational popups must use the application's themed dialog components. No exceptions.**

### Rules

1. **Never use native browser dialogs** -- `window.alert()`, `window.confirm()`, and `window.prompt()` are forbidden. They cannot be styled, break the visual experience, and behave inconsistently across browsers.
2. **Use the application's dialog/modal system** -- every dialog must render through the project's themed component (e.g., `ConfirmDialog`, `AlertDialog`, `Modal`) so it inherits the design system's colors, typography, spacing, and animations.
3. **Consistent UX across all interactions** -- destructive actions get a themed confirmation dialog with clear action labels (not "OK/Cancel"). Informational messages use themed toast/snackbar notifications. Error messages use themed error dialogs with context.
4. **Accessible by default** -- themed dialogs must trap focus, support Escape to close, and include proper ARIA roles (`role="dialog"`, `aria-modal="true"`).

## Error Handling Standards -- MANDATORY

**Errors must be explicit, contextual, and never silently swallowed.**

### Rules

1. **Never silently ignore errors** -- every error must be raised, logged, or explicitly handled. Empty `except:` / `catch {}` blocks are forbidden.
2. **Use specific error types** -- not catch-all handlers. Each error type should clearly indicate what went wrong and where.
3. **Error messages must include context** -- request parameters, status codes, what operation was being attempted, and what input caused the failure. No generic "something went wrong."
4. **No automatic fallbacks** -- code should either succeed or fail clearly. Fallbacks are only allowed when explicitly designed and documented. Silent fallbacks hide real problems.
5. **Fix root causes, not symptoms** -- if an error keeps occurring, fix the underlying issue rather than adding retry/fallback logic around it.
6. **External service calls: retry with backoff** -- use exponential backoff for transient failures. Raise the last error if all attempts fail. Log each retry attempt.
7. **API endpoints return proper HTTP status codes** -- never return 200 for errors. Use 4xx for client errors, 5xx for server errors, with structured error response bodies.
8. **Frontend errors: catch at boundaries** -- use error boundaries or equivalent. Show user-friendly messages, log the full error for debugging.

## Performance Guidelines -- MANDATORY

**Design for efficiency from the start. Performance is not an afterthought.**

### Rules

1. **Cache expensive operations** -- database queries, API calls, computed values. Use appropriate cache invalidation strategies.
2. **Pagination for all list endpoints** -- never return unbounded result sets. Default page size must be a named constant.
3. **No N+1 queries** -- use eager loading, joins, or batch queries. Review ORM-generated SQL for new endpoints.
4. **Lazy load heavy resources** -- large images, optional modules, below-the-fold content. Load on demand, not upfront.
5. **Database indexes** -- every column used in WHERE, JOIN, or ORDER BY clauses in frequent queries must have an index. Document index decisions.
6. **Bundle size awareness (frontend)** -- monitor bundle size. Use code splitting and tree shaking. Avoid importing entire libraries when only one function is needed.
7. **Timeouts on all external calls** -- every HTTP request, database query, and external service call must have an explicit timeout. No indefinite waits.

## Permission Boundaries -- MANDATORY

**Explicit rules for what may be changed, what requires approval, and what must never be touched.**

### ✅ Always Allowed
- Read any file in the repository
- Run linting, type checking, and tests
- Edit source files within the scope of the current task
- Update documentation and changelog

### ⚠️ Ask First
- Adding or removing dependencies
- Database schema changes or new migrations
- Deleting files or directories
- Changing CI/CD configuration
- Modifying shared infrastructure code used by multiple services

### 🚫 Never
- Commit secrets, `.env` files, or credentials
- Force push to `main` or protected branches
- Modify generated files (`dist/`, `build/`, lock files unless updating deps)
- Modify already-applied database migrations
- Remove or weaken existing tests (unless explicitly asked)
- Change code outside the scope of the current task

## Consistency -- Match Existing Patterns -- MANDATORY

**When touching existing code, matching the existing style is more important than "ideal" style.**

### Rules

1. **New code must look like it was written by the same author** -- match naming conventions, formatting, patterns, and idioms already present in the file/module.
2. **Follow existing patterns from similar components** -- before creating a new service, route, or component, find an existing one that does something similar and follow its structure.
3. **Don't refactor while implementing** -- if you notice code that could be improved but it's outside the current task, note it for later. Don't mix refactoring with feature work.
4. **When in doubt, be consistent** -- if the codebase uses one pattern and the style guide says another, follow the codebase. Consistency within a project trumps external standards.

## Change Scope Discipline -- MANDATORY

**Change only what was asked for. No drive-by refactors, no unsolicited improvements.**

### Rules

1. **Minimal changes** -- modify as few lines as possible while correctly solving the problem. Every changed line must be justified by the task.
2. **No extra improvements** -- do not refactor, optimize, or "clean up" code that is not part of the current task, even if it looks wrong.
3. **No unsolicited dependency updates** -- don't upgrade packages, change configs, or modify tooling unless the task requires it.
4. **Scope creep is a bug** -- if implementation reveals a needed change outside the current scope, document it as a separate task. Don't silently expand the change.
5. **Review your diff before committing** -- every line in the diff should relate to the task. If something doesn't, revert it.

## Commit Discipline

- Commit at meaningful milestones
- Descriptive commit messages stating what and why
- Verify tests pass before committing

## Changelog Rolling Policy

- `docs/changelogs/CHANGELOG.md` should stay under 500 lines
- When exceeded, roll over to `docs/changelogs/CHANGELOG.YYYY-MM-DD.md`
- Write consolidated changelog entries grouped by feature
