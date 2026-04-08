---
inclusion: always
---

# Code Commenting Standards

Every piece of code in this project must be commented so that a follow-on developer can understand all pieces without needing to ask the original author.

## Enforcement

1. **Automated hook** -- `.kiro/hooks/comment-standards-check.kiro.hook` fires after every file write
2. **Linting rules** -- Enable docstring/JSDoc rules in linter config

## Guiding Principle

Comments answer "why" and "how it fits", not "what it does".

## File-Level Documentation

Every file must start with a documentation block that includes:
1. A one-line summary of the module's purpose
2. How this module fits into the larger architecture
3. Key design decisions or tradeoffs (link to ADRs where applicable)
4. For complex modules: a brief description of the internal flow or pipeline

## Class and Function Documentation

- Every public class and function must have a documentation block
- Include parameter descriptions and return types for non-trivial functions
- Document error conditions and edge cases

## Inline Comments

Use for: Non-obvious design decisions, cross-module relationships, security rationale, performance tradeoffs, backward compatibility notes.

Do NOT use for: Restating what the code does, obvious variable assignments, standard library usage.

## Section Separators

Use comment block separators for files with multiple logical sections.

## Cross-Reference Comments

When code depends on or mirrors code in another module, add a cross-reference comment.

## Enum and Constant Comments

Document why each value exists, not just what it is.
