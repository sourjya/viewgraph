---
inclusion: auto
description: File naming conventions for test files and source code organization
---

# File Naming Conventions

## Test Files Must Mirror Source File Names

Test files must use the exact same name as the source file they test, with the appropriate test suffix appended.

### JavaScript/TypeScript
| Source file | Test file |
|---|---|
| `src/tools/list-captures.js` | `tests/unit/list-captures.test.js` |
| `src/indexer.js` | `tests/unit/indexer.test.js` |
| `lib/inspector.js` | `tests/unit/inspector.test.js` |

### Rules

- kebab-case for all filenames (source and test)
- Test files use `.test.js` or `.spec.js` suffix
- Never mix conventions within a component
- E2E tests use kebab-case descriptive names (e.g., `capture-flow.e2e.js`)
- Test directory structure mirrors source directory structure
