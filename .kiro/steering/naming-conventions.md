---
inclusion: auto
description: File naming conventions for test files and source code organization
---

# File Naming Conventions

## Test Files Must Mirror Source File Names

Test files must use the **exact same name** as the source file they test, with the appropriate test suffix.

### Backend (Python)

| Source file | Test file |
|---|---|
| `src/services/auth.py` | `tests/unit/test_auth.py` |
| `src/models/user.py` | `tests/unit/test_user.py` |

### Frontend (TypeScript)

| Source file | Test file |
|---|---|
| `src/features/auth/auth.service.ts` | `tests/unit/auth.service.test.ts` |
| `src/shared/hooks/useAuth.ts` | `tests/unit/useAuth.test.ts` |

### Rules

- Never mix conventions - the test file name is always derived from the source file name
- E2E tests use kebab-case descriptive names (e.g. `ingredient-analysis-flow.test.ts`)
