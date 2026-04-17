---
inclusion: always
---

# Change Discipline

Rules governing what you can change, how changes must be scoped, dependency management, and commit hygiene.

## Permission Boundaries - MANDATORY

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

## Consistency - Match Existing Patterns - MANDATORY

**When touching existing code, matching the existing style is more important than "ideal" style.**

### Rules

1. **New code must look like it was written by the same author** - match naming conventions, formatting, patterns, and idioms already present in the file/module.
2. **Follow existing patterns from similar components** - before creating a new service, route, or component, find an existing one that does something similar and follow its structure.
3. **Don't refactor while implementing** - if you notice code that could be improved but it's outside the current task, note it for later. Don't mix refactoring with feature work.
4. **When in doubt, be consistent** - if the codebase uses one pattern and the style guide says another, follow the codebase. Consistency within a project trumps external standards.

## Change Scope Discipline - MANDATORY

**Change only what was asked for. No drive-by refactors, no unsolicited improvements.**

### Rules

1. **Minimal changes** - modify as few lines as possible while correctly solving the problem. Every changed line must be justified by the task.
2. **No extra improvements** - do not refactor, optimize, or "clean up" code that is not part of the current task, even if it looks wrong.
3. **No unsolicited dependency updates** - don't upgrade packages, change configs, or modify tooling unless the task requires it.
4. **Scope creep is a bug** - if implementation reveals a needed change outside the current scope, document it as a separate task. Don't silently expand the change.
5. **Review your diff before committing** - every line in the diff should relate to the task. If something doesn't, revert it.

## Dependency Minimalism

- Every new dependency must have a functional justification tied to a concrete requirement, test need, or architectural concern.
- Do not add libraries speculatively. If the standard library or an existing dependency can do the job, use it.
- Keep dependency manifests (`pyproject.toml`, `package.json`) lean and auditable.
- **Python dependencies are managed exclusively via uv and pyproject.toml.** Never use `requirements.txt`, `pip install`, `pip freeze`, or `poetry`. Add deps with `uv add <package>`. The lockfile is `uv.lock`.
- **Justify every new dependency** - the commit message or task notes must explain why this dependency is needed and why existing deps or stdlib can't do the job.
- **Check for overlap** - before adding a new package, verify no existing dependency already provides the same functionality.
- **Prefer small, focused packages** over large frameworks when only one feature is needed.
- **Pin versions explicitly** - never use floating version ranges in production dependencies. Lock files must be committed.
- **Audit before adding** - check the package's maintenance status, download count, last update date, and known vulnerabilities before adding it to the project.

## Design Principles

- Favor composition over inheritance. Use inheritance only when it is semantically justified and materially improves the design.
- Public interfaces, domain models, service boundaries, and infrastructure adapters must be explicit and easy to reason about.
- No god classes, hidden coupling, or ambiguous ownership boundaries.
- Write code as if a different engineer will inherit the project under delivery pressure.

## Commit Discipline

- Commit at meaningful milestones
- Descriptive commit messages stating what and why
- Update changelog for behavior/structure changes
- Verify tests pass before committing

## Changelog Rolling Policy

- `docs/changelogs/CHANGELOG.md` should stay under **500 lines**
- When it exceeds 500 lines, roll over: rename to `docs/changelogs/CHANGELOG.YYYY-MM-DD.md` and start fresh
- Do NOT copy, summarize, or selectively preserve entries - just roll it over clean
- Write **consolidated** changelog entries grouped by feature

## Repository Hygiene

- Do not clutter the repository root with ad hoc notes, temporary design files, scratchpads, or undocumented artifacts.
- All project documentation lives in `docs/` (except `README.md` at root).

## Security & Credentials

- No credentials in source control
- Use .env.example for configuration templates
- Run secret-exposure review before commits
- Credentials, API keys, and test accounts must be externalized into secure configuration - never inline
