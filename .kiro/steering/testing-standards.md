---
inclusion: always
---

# Testing Standards

Test folder organization, task-first discipline, and test-driven development rules.

## Test Folder Organization - STRICT

### Directory Structure

```
tests/
├── unit/                     # Fast, isolated tests - no I/O, no DB, no network
│   ├── auth/                 # Mirrors backend/src domain structure
│   │   ├── test_auth_service.py
│   │   └── test_token_utils.py
│   ├── products/
│   │   ├── test_product_service.py
│   │   └── test_pricing.py
│   └── common/
│       └── test_pagination.py
├── integration/              # Tests that hit real DB, APIs, or external services
│   ├── test_auth_flow.py
│   └── test_product_api.py
├── e2e/                      # End-to-end tests (Playwright, Cypress, etc.)
│   └── test_checkout_flow.py
├── property/                 # Property-based tests (Hypothesis, fast-check)
│   └── test_pricing_properties.py
├── conftest.py               # Root fixtures: DB sessions, auth helpers, test client
└── unit/conftest.py          # Unit-specific fixtures (mocks, fakes)
```

### Rules

- **NEVER** create `__tests__/` folders, co-located test files, or any alternative test directory structure
- **Unit test subdirectories mirror source domains** - if the source has `services/auth/`, tests go in `tests/unit/auth/`
- **One test file per source file** - `auth_service.py` → `test_auth_service.py`. Never bundle unrelated tests.
- **Test file naming mirrors source** - prefix with `test_` (Python) or suffix with `.test.ts` / `.spec.ts` (TypeScript)
- **Shared fixtures in conftest.py** - never duplicate fixture setup across test files. Extract to the nearest `conftest.py`.
- **Integration tests are separate from unit tests** - unit tests must run without any external dependencies (DB, network, filesystem). Integration tests get their own directory.
- **Create subdirectories as domains emerge** - don't pre-create empty test directories. Add them when the first test for that domain is written.

### Frontend Test Structure

```
frontend/tests/
├── unit/
│   ├── auth/
│   │   ├── LoginForm.test.tsx
│   │   └── useAuth.test.ts
│   ├── dashboard/
│   │   └── DashboardPage.test.tsx
│   └── shared/
│       └── Button.test.tsx
├── integration/
│   └── auth-flow.test.ts
├── e2e/
│   └── checkout.spec.ts
└── setup.ts                  # Test setup (mocks, providers, global config)
```

## Task-First Discipline - MANDATORY

**CRITICAL**: No code may be written without a task list. This is non-negotiable.

**Where the task list lives:**
- Full spec features: `.kiro/specs/{feature-name}/tasks.md`
- Bug fixes: `docs/bugs/BUG-###-description.md`
- Minor enhancements: create a minimal task list inline before starting

**The task list must be followed in order:**
1. Read the full task list before writing any code
2. Mark each task `[-]` (in progress) before starting it
3. Write tests FIRST (RED phase) per TDD rules
4. Implement to make tests pass (GREEN phase)
5. Mark each task `[x]` (complete) before moving to the next
6. Never skip tasks or reorder them without documenting why

## Test-Driven Development (TDD) - MANDATORY

### The TDD Cycle

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make it pass
3. **REFACTOR**: Clean up while keeping tests green

### TDD Workflow Rules

- **NEVER write implementation code before writing its test**
- **NEVER skip the RED phase** - you must see the test fail first
- **Tests define the contract** - implementation fulfills it
- Each test should fail for the right reason (missing functionality, not syntax errors)

### Exceptions to TDD

The ONLY exceptions where you may write code before tests:
- Database migrations (but test the models they create)
- Configuration files (JSON, YAML, .env templates)
- Documentation (Markdown, ADRs)
- Build scripts and tooling configuration

### Testing Requirements

- Every bug fix must include a regression test
- Minimum 80% code coverage for new code
- Both positive AND negative test cases required for every feature
