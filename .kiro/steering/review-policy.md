---
inclusion: auto
description: Periodic review policy - tiered security reviews and maintainability reviews
---

# Periodic Review Policy

## Purpose

This policy governs when and how automated code reviews are triggered during development. All reviews are powered by hooks in `.kiro/hooks/`. Results are stored in `docs/security/` and `docs/reviews/` respectively.

The security review system follows a three-tier model - one prompt, three hooks, three scopes - that matches review depth to development context. See `docs/tiered-review-methodology.md` for full rationale.

---

## Tier 1 - Pre-Commit (Every Commit)

**Hook:** `security-tier1-precommit.json`
**Trigger:** Automatically on every `git commit`
**Scope:** Staged files only

**Fires when:**
- Any `git commit` command is detected
- Any call to `scripts/git-commit-push.sh` is detected

**Checks:** Secrets, unsafe execution, auth bypass, missing input validation, PII in logs

**Output:** Inline block/warn response only - no SRR file generated
- CRITICAL and HIGH findings block the commit
- MEDIUM findings warn but allow

---

## Tier 2 - Feature Complete

**Hook:** `security-tier2-feature.json`
**Trigger:** After feature completion or manual invocation
**Scope:** Files changed since the last SRR, plus new integrations, routes, and IAM definitions

**Fires when:**
- A new route, Lambda handler, or service is added and marked complete
- Any external integration (OAuth, third-party API, database, message queue) is wired up
- A new IAM role, policy, or cloud resource is defined
- Manually triggered when a feature branch is ready for review

**Checks:** All Tier 1 categories plus OWASP S1-S13, BOLA/IDOR, cryptographic quality, file upload security

**Output:** Full SRR report - `docs/security/SRR-{###}-{YYYY-MM-DD}-T2.md`
- SECURITY_LOG.md updated
- CRITICAL/HIGH findings create immediate fix tasks
- MEDIUM/LOW findings added to roadmap

---

## Tier 3 - Sprint or Phase End

**Hook:** `security-tier3-sprint.json`
**Trigger:** Manual invocation at sprint or phase end
**Scope:** Full codebase

**Fires when:**
- End of each development sprint or phase
- Before any major release or deployment
- Manually triggered when systemic drift is suspected
- Any dependency manifest (`package.json`, `requirements.txt`, etc.) has had significant changes across the sprint

**Checks:** All Tier 1 and Tier 2 categories plus supply chain (D1-D5), secure headers and CORS (S15), logging security (S16), rate limiting systemic review (S14-EXT), AI-generation artifact review, test coverage delta

**Output:** Full SRR report - `docs/security/SRR-{###}-{YYYY-MM-DD}-T3.md`
- SECURITY_LOG.md updated
- CRITICAL/HIGH findings create immediate fix tasks
- MEDIUM/LOW findings added to roadmap
- Dependency manifest snapshot recorded in `docs/security/dep-snapshot-{YYYY-MM-DD}.md`

---

## Maintainability Review

**Trigger:** Manual invocation at feature completion and sprint end
**Scope:** Changed files at feature completion; full codebase at sprint end

**Fires when:**
- A feature or module is marked complete
- Before any major commit or PR
- At the end of each development sprint or phase
- Manually triggered when structural drift is suspected

**Output:** Full MRR report - `docs/reviews/MRR-{###}-{YYYY-MM-DD}.md`
- REVIEW_LOG.md updated
- Phase 1 quick wins added to active sprint backlog
- Phase 2 and Phase 3 items added to roadmap

---

## Sequencing Rule

When both a security review and a maintainability review are due at the same checkpoint (e.g., end of sprint or feature complete), run in this order:

1. Tier 2 or Tier 3 security review first
2. Maintainability review second

Security findings may surface structural issues that the maintainability review should account for.

---

## Output Convention

| Review Type | Output Path | Naming Pattern |
|---|---|---|
| Security Tier 1 | Inline only | No file |
| Security Tier 2 | `docs/security/` | `SRR-{###}-{YYYY-MM-DD}-T2.md` |
| Security Tier 3 | `docs/security/` | `SRR-{###}-{YYYY-MM-DD}-T3.md` |
| Maintainability | `docs/reviews/` | `MRR-{###}-{YYYY-MM-DD}.md` |
| Dep snapshot | `docs/security/` | `dep-snapshot-{YYYY-MM-DD}.md` |

---

## Report Numbering

- SRR numbers are sequential across all tiers: SRR-001, SRR-002, SRR-003, ...
- MRR numbers are sequential: MRR-001, MRR-002, MRR-003, ...
- Always check existing files in `docs/security/` and `docs/reviews/` to determine the next number before creating a new report
- The tier suffix (T2 or T3) is appended after the date, not the number

---

## Folder Structure

```
.kiro/
- hooks/
  - security-tier1-precommit.json
  - security-tier2-feature.json
  - security-tier3-sprint.json
- prompts/
  - review-code-security.md
  - review-code-maintainability.md
- steering/
  - review-policy.md

docs/
- security/
  - SECURITY_LOG.md
  - dep-snapshot-{YYYY-MM-DD}.md
  - SRR-{###}-{YYYY-MM-DD}-T2.md
  - SRR-{###}-{YYYY-MM-DD}-T3.md
- reviews/
  - REVIEW_LOG.md
  - MRR-{###}-{YYYY-MM-DD}.md
```
