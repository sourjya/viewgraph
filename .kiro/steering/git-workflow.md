---
inclusion: always
description: Git branching strategy, branch naming conventions, and commit discipline
---

# Git Workflow

## Core Principle

**Every concrete piece of work gets its own branch. Merge to main when it works. Never mix unrelated work on the same branch.**

```
main ──→ feat/A ──→ merge ──→ fix/B ──→ merge ──→ feat/C ──→ merge ──→ ...
```

---

## Branch Types

| Situation | Branch type | Example |
|---|---|---|
| Building a new feature or spec | `feat/` | `feat/ingredient-analysis` |
| Fixing a reported bug | `fix/` | `fix/bug-003-score-calc` |
| UI/UX change only | `ui/` | `ui/dashboard-layout` |
| Tests only | `test/` | `test/auth-regression` |
| Tooling, config, deps | `chore/` | `chore/update-deps` |
| Documentation only | `docs/` | `docs/adr-001-tech-stack` |
| Refactor (no behaviour change) | `refactor/` | `refactor/extract-service` |

**Rules:**
- Always kebab-case after the `/`
- 3-5 words max
- Include BUG-### for bug fixes: `fix/bug-034-description`
- Include spec name for spec work: `feat/spec-name`

---

## Standard Git Scripts

All git operations MUST use the scripts in `scripts/` which pipe output through `tee` to `logs/`. This ensures output is always captured.

| Script | Purpose | Log file |
|---|---|---|
| `./scripts/git-commit-push.sh "message"` | Commit, merge to main, push | `logs/git-commit-push.txt` |

---

## The Standard Lifecycle

### 1. Start from main
```bash
git checkout main && git checkout -b feat/my-work
```

### 2. Work and commit incrementally
```bash
git add -A && git commit -m "feat: description of what changed"
```

### 3. Merge to main when done
```bash
bash scripts/git-commit-push.sh "feat: description"
```

### 4. Start the next piece of work from main
```bash
git checkout -b feat/next-thing
```

---

## Handling Bug Reports During Feature Work

**Do NOT fix bugs on the current feature branch.**

1. Note it down - add to `docs/bugs/`
2. Finish or stash the current feature
3. Create a dedicated fix branch from main
4. Fix, test, merge
5. Return to the feature branch and merge main

---

## Bug Resolution Workflow - MANDATORY

When a bug is identified, follow this workflow in full:

1. **Assign a bug number** - check `docs/bugs/` for the highest existing `BUG-###` number and increment by 1
2. **Create the bug document** - `docs/bugs/BUG-###-short-description.md` with: ID, Severity, Status, Description, Reproduction steps, Root cause, Fix description, Files changed, Regression tests added
3. **Fix the bug** - minimal and targeted fix on a `fix/bug-###-description` branch. Do not refactor unrelated code.
4. **Add regression tests - NON-NEGOTIABLE** - every bug fix requires both negative AND positive regression tests:
   - **Negative test**: reproduces the bug, must FAIL on unfixed code (RED phase)
   - **Positive test**: confirms the fix, passes after fix (GREEN phase)
   - Named after the bug: `test_bug###_<description>` (Python) or `it('BUG-###: <description>')` (TypeScript)
   - Never mark a bug `FIXED` without regression tests committed in the same change
5. **Link to the roadmap** - add a reference in the roadmap or spec tasks for traceability
6. **Update the changelog** - add entry to `docs/changelogs/CHANGELOG.md` under today's date
7. **Update the bug document status** - set `Status` to `FIXED`, fill in `Fixed` date and remaining fields

---

## Forbidden Actions

| Action | Why it's banned |
|---|---|
| Fixing a bug on a feature branch | Entangles unrelated changes |
| Creating a branch from another feature branch | Misses main's latest work |
| Committing directly to main | Bypasses branch isolation |
| Leaving a branch unmerged and starting new work | Creates divergence |
| Mixing multiple features on one branch | Makes rollback impossible |
| `git checkout --ours .` or `git checkout --theirs .` | Blanket conflict resolution reverts work |

---

## Commit Message Format

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>
```

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, deps, config |
| `docs` | Documentation only |
| `test` | Tests only |
| `refactor` | No behaviour change |
| `ui` | Frontend-only visual change |
| `perf` | Performance improvement |

---

## Spec-Driven Work

1. Create `feat/<spec-name>` branch from main
2. Complete ALL tasks in the spec on that branch
3. Merge to main when the spec is complete
4. ONLY THEN create the next spec's branch

**Never start Phase 2 before Phase 1 is merged to main.**

---

## Per-File Conflict Resolution - MANDATORY

**FORBIDDEN:**
```bash
git checkout --ours .    # ← BANNED
git checkout --theirs .  # ← BANNED
```

Resolve each file individually based on which side has the correct work.
