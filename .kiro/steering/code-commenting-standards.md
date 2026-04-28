---
inclusion: always
---

# Code Commenting Standards

Every piece of code must be commented so that a follow-on developer - or a coding agent picking up the project cold - can understand all pieces without needing to ask the original author.

## Enforcement

1. **During code writing - NON-NEGOTIABLE** - every file you create or modify MUST have comments meeting this standard BEFORE you move to the next task. Do not write code first and "add comments later" - comments are part of the implementation, not an afterthought.
2. **Automated hook** - `.kiro/hooks/comment-standards-check.kiro.hook` intercepts git commits and verifies staged source files meet this standard.
3. **Maintainability review** - the maintainability review prompt explicitly checks for commenting compliance and flags undocumented code as HIGH severity.
4. **Linting rules** - Enable docstring rules in your linter config.

## Guiding Principle

Comments answer "why" and "how it fits", not "what it does". Every comment should assume the reader has zero prior context about the project.

## Agent-Readability Requirement

All comments must be written so that both human developers and AI coding agents can fully reconstruct the intent, constraints, and architectural role of the code. This means:
- No shorthand or project-internal jargon without explanation
- Spell out acronyms on first use in each file
- State assumptions explicitly rather than relying on tribal knowledge
- When a method exists because of a non-obvious requirement, say so

## Module-Level Docstrings / File-Level JSDoc

Every file must start with a docstring/JSDoc block that includes:
1. A one-line summary of the module's purpose
2. How this module fits into the larger architecture
3. Key design decisions or tradeoffs (link to ADRs where applicable)
4. For complex modules: a brief description of the internal flow

## Class Docstrings

Every class - public, internal, or private - must have a docstring/JSDoc that includes:
1. What the class represents and its responsibility boundary
2. Why this class exists as a separate abstraction (justification)
3. Key collaborators: what other classes/services it interacts with
4. Thread-safety or lifecycle notes if applicable

## Property and Attribute Documentation

Every class property, instance variable, and TypeScript class member must be documented:
- **Python**: use inline comments or Pydantic `Field(description=...)` for model fields
- **TypeScript**: use JSDoc `@property` or inline comments above the declaration
- State what the property holds, its valid range or constraints, and why it exists if non-obvious
- For Pydantic/dataclass fields: document each field's purpose, not just its type

## Method and Function Docstrings - All Visibility Levels

Every method and function must have a docstring/JSDoc, regardless of visibility (public, protected, private, internal helper):
1. **Purpose**: what it does and when it should be called
2. **Justification**: why this method exists - what requirement, design decision, or constraint motivated it. If it could have been done differently, briefly note why this approach was chosen
3. **Args/Params**: describe each parameter, its expected values, and edge cases
4. **Returns**: what is returned and under what conditions
5. **Raises/Throws**: exceptions that can be raised and when
6. **Side effects**: any state mutations, I/O, or external calls

For trivial getters/setters, a one-line docstring is sufficient. The justification requirement applies to any method with non-obvious logic.

## Inline Comments

Use for:
- Non-obvious design decisions and the reasoning behind them
- Cross-module relationships and data flow explanations
- Security rationale (why a check exists, what attack it prevents)
- Performance tradeoffs (why this algorithm, why this data structure)
- Backward compatibility notes
- Workarounds with references to the issue/bug they address

Do NOT use for:
- Restating what the code does (the code itself should be readable)
- Obvious variable assignments
- Standard library usage

## Section Separators

For files with multiple logical sections, use comment block separators:
```python
# ──────────────────────────────────────────────
# Section Name
# ──────────────────────────────────────────────
```

## Cross-Reference Comments

When code depends on or mirrors code in another module, add a cross-reference:
- "See also: ADR-005 for rationale"
- "The frontend mirrors these checks in auth.service.ts"
- "This constant must stay in sync with backend/src/core/config.py"

## Enum and Constant Comments

Document why each value exists, not just what it is. If a constant's value was chosen for a specific reason (protocol requirement, performance threshold, external API contract), state that reason.
