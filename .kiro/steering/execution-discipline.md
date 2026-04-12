---
inclusion: always
---

# Execution Discipline Standards

Supplementary engineering rules derived from the project's coding agent execution standard.
These rules fill gaps not already covered by `engineering-standards.md` or `code-commenting-standards.md`.

## Dependency Minimalism

- Every new dependency must have a functional justification tied to a concrete requirement, test need, or architectural concern.
- Do not add libraries speculatively. If the standard library or an existing dependency can do the job, use it.
- Keep dependency manifests lean and auditable.
- **Justify every new dependency** -- the commit message or task notes must explain why this dependency is needed and why existing deps or stdlib can't do the job.
- **Check for overlap** -- before adding a new package, verify no existing dependency already provides the same functionality.
- **Prefer small, focused packages** over large frameworks when only one feature is needed.
- **Pin versions explicitly** -- never use floating version ranges in production dependencies. Lock files must be committed.
- **Audit before adding** -- check the package's maintenance status, download count, last update date, and known vulnerabilities before adding it to the project.

## Design Principles

- Favor composition over inheritance. Use inheritance only when it is semantically justified and materially improves the design.
- Public interfaces, domain models, service boundaries, and infrastructure adapters must be explicit and easy to reason about.
- No god classes, hidden coupling, or ambiguous ownership boundaries.
- Write code as if a different engineer will inherit the project under delivery pressure.

## Repository Hygiene

- Do not clutter the repository root with ad hoc notes, temporary design files, scratchpads, or undocumented artifacts.
- All project documentation lives in `docs/` (except `README.md` at root).

## Documentation Organization

All documentation must be placed in the appropriate `docs/` subdirectory based on its purpose:

### docs/decisions/ (Architecture Decision Records)
- **Purpose**: Historical decision records documenting WHY a decision was made
- **Format**: `ADR-###-descriptive-name.md` (e.g., `ADR-001-mcp-transport.md`)
- **Content**: Context, decision, alternatives considered, consequences
- **Immutability**: ADRs are historical artifacts; status can change to "superseded" but content stays
- **When to use**: Major architectural choices, technology selections, design pattern decisions

### docs/architecture/
- **Purpose**: Technical documentation of HOW the system works today
- **Content**: System structure, data flows, component interactions, implementation patterns
- **Living documents**: Evolve with the codebase as the system changes

### docs/runbooks/
- **Purpose**: Operational guides and setup instructions
- **Content**: Step-by-step procedures for setup, configuration, deployment, troubleshooting

### docs/changelogs/
- **Purpose**: Historical record of changes to the system
- **Content**: `CHANGELOG.md` (current), archived changelogs (`CHANGELOG.YYYY-MM-DD.md`)
- **See**: Changelog Rolling Policy in `engineering-standards.md`

### docs/bugs/
- **Purpose**: Bug investigation and resolution documentation
- **Format**: `BUG-###-short-description.md`
- **Content**: Reproduction steps, root cause analysis, fix description

### docs/roadmap/
- **Purpose**: Project planning and milestone tracking
- **Content**: Roadmaps, milestone plans, implementation schedules

### Placement Rules

**DO NOT**:
- Create documentation files in `docs/` root
- Mix document types (e.g., ADRs in architecture/, runbooks in decisions/)
- Create new subdirectories without documenting their purpose

**DO**:
- Place ADRs in `docs/decisions/` with proper numbering
- Place architecture docs in `docs/architecture/`
- Place operational guides in `docs/runbooks/`
- Update this list if adding a new documentation category

## Development Roadmap and Planning

- Before substantive implementation begins, establish a structured plan using one of two approaches:
  - **Kiro Specs** (preferred for feature work): Use the spec workflow to produce `requirements.md`, `design.md`, and `tasks.md` under `.kiro/specs/{feature-name}/`. The tasks file serves as the executable roadmap with trackable task statuses.
  - **Manual Roadmap** (for broader project planning or when specs aren't appropriate): Write a structured roadmap to `docs/roadmap/roadmap.md` decomposed into milestones, each broken down into concrete TODO items.
- Either approach satisfies the planning requirement -- the key is that work is planned before it begins and tracked as it progresses.
- Execute work incrementally, one task or milestone at a time. Do not jump randomly across unrelated parts of the system.
- If implementation realities require a plan change: update the spec tasks or roadmap, document the reason, record the change in the changelog, and continue against the revised plan.

## Git Branching -- MANDATORY

**All work must happen on a feature branch, never directly on `main`.**
**One branch per spec/feature. Merge to main before starting the next one. No exceptions.**

See `.kiro/steering/git-workflow.md` for the complete branching rules.

## Bug Reporting and Resolution Workflow -- MANDATORY

When the user flags something as a bug (or you identify one during work), follow this workflow:

### Step 1: Assign a bug number
Check `docs/bugs/` for the highest existing `BUG-###` number and increment by 1.

### Step 2: Create the bug document
Create `docs/bugs/BUG-###-short-description.md` with:
- ID, Severity, Status (`OPEN` while investigating, `FIXED` when resolved)
- Description, Reproduction steps, Root cause
- Fix description, Files changed
- Regression tests added (or reason why not)

### Step 3: Fix the bug
Apply the fix in the codebase. The fix must be minimal and targeted.

### Step 4: Add regression tests
Every bug fix requires both negative AND positive regression tests.

### Step 5: Update the changelog

## Test Organization

- Maintain clear separation between: Unit tests, Integration tests, End-to-end tests, Regression tests
- Every bug fix must include a regression test.

## Credential Handling

- Reusable credentials must be externalized into secure configuration sources -- never duplicated across test files.
- Prior to every commit, perform an explicit secret-exposure review.
