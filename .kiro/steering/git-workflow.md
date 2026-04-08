---
inclusion: always
description: Git branching strategy, branch naming conventions, and commit discipline
---

# Git Workflow

## Core Principle

**Every concrete piece of work gets its own branch. Merge to main when it works. Never mix unrelated work on the same branch.**

## Branch Types and When to Create Them

| Situation | Branch type | Example |
|---|---|---|
| Building a new feature or spec | `feat/` | `feat/hover-inspector` |
| Fixing a reported bug | `fix/` | `fix/bug-003-watcher-crash` |
| UI/UX change only | `ui/` | `ui/annotation-panel-layout` |
| Tests only | `test/` | `test/mcp-tools-integration` |
| Tooling, config, deps | `chore/` | `chore/update-dependencies` |
| Documentation only | `docs/` | `docs/adr-001-format-choice` |
| Refactor (no behaviour change) | `refactor/` | `refactor/extract-parser` |

**Rules:**
- Always kebab-case after `/`, 3-5 words max
- Include BUG-### for bug fixes
- Include spec name for spec work

## The Standard Lifecycle

1. Start from main: `./scripts/git-branch.sh feat/my-work`
2. Work and commit incrementally
3. Merge to main when done (--no-ff)
4. Start the next piece of work from main

## Handling Bug Reports During Feature Work

Do NOT fix bugs on the current feature branch. Create a dedicated fix branch from main.

## Forbidden Actions

- Fixing a bug on a feature branch
- Creating a branch from another feature branch
- Committing directly to main
- Leaving a branch unmerged and starting new work
- Mixing multiple features on one branch
- `git checkout --ours .` or `git checkout --theirs .`

## Commit Message Format

Conventional Commits: `<type>(<optional scope>): <short description>`

Types: feat, fix, chore, docs, test, refactor, ui, perf

Examples:
- `feat(server): add list_captures MCP tool`
- `fix(extension): handle empty captures directory`
- `docs: add annotation format section to technical design`

## Spec-Driven Work

One branch per spec. Complete ALL tasks before merging. Never start Phase 2 before Phase 1 is merged.

## Per-File Conflict Resolution -- MANDATORY

Resolve each file individually based on file type rules. Never use blanket `--ours .` or `--theirs .`.
