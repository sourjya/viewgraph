---
inclusion: auto
description: Periodic review policy - when and how security and maintainability reviews are triggered
---

# Periodic Review Policy

## Purpose

This policy governs when and how automated code reviews are triggered during development. All reviews are powered by prompts in `.kiro/prompts/`. Results are stored in `docs/security/` and `docs/reviews/` respectively.

## Security Review Triggers

Run `.kiro/prompts/review-code-security.md` when ANY of the following conditions are met:

- A new route, Lambda handler, or service is added
- Any external integration (OAuth, third-party API, database, message queue) is wired up
- 20 or more files have changed since the last SRR
- A new IAM role, policy, or cloud resource is defined
- Any dependency manifest (`package.json`, `requirements.txt`, etc.) is modified
- Manually triggered at the end of each development phase or sprint

## Maintainability Review Triggers

Run `.kiro/prompts/review-code-maintainability.md` when ANY of the following conditions are met:

- A feature or module is marked complete
- Before any major commit or PR
- At the end of each development phase or sprint
- Manually triggered when structural drift is suspected

## Output Convention

- Security reports: `docs/security/SRR-{###}-{YYYY-MM-DD}.md`
- Maintainability reports: `docs/reviews/MRR-{###}-{YYYY-MM-DD}.md`
- Always update `docs/security/SECURITY_LOG.md` after each security review
- Always update `docs/reviews/REVIEW_LOG.md` after each maintainability review

## Sequencing Rule

When both reviews are due at the same checkpoint (e.g., end of sprint), run the **security review first**, then the maintainability review. Security findings may surface structural issues that the maintainability review should account for.

## Scope Convention

- Security reviews: focus on files changed since the last SRR, plus any new integrations or IAM definitions
- Maintainability reviews: full codebase scan at sprint end; changed-files-only scan at feature completion

## Report Numbering

- SRR numbers are sequential: SRR-001, SRR-002, SRR-003, ...
- MRR numbers are sequential: MRR-001, MRR-002, MRR-003, ...
- Always check the existing files in `docs/security/` and `docs/reviews/` to determine the next number before creating a new report
