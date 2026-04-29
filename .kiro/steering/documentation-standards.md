---
inclusion: always
---

# Documentation Standards

Documentation organization, spec quality standards, API versioning, and roadmap planning.

## Documentation Organization

All documentation must be placed in the appropriate `docs/` subdirectory based on its purpose:

### docs/decisions/ (Architecture Decision Records)
- **Format**: `ADR-###-descriptive-name.md` (e.g., `ADR-001-tech-stack.md`)
- **Content**: Context, decision, alternatives considered, consequences
- **Immutability**: ADRs are historical artifacts; status can change to "superseded" but content stays

### docs/architecture/
- **Purpose**: Technical documentation of HOW the system works today
- **Content**: System structure, data flows, format specs, project metrics, feature specs

### docs/product/
- **Purpose**: Product strategy, UX design, marketing, and go-to-market
- **Content**: Product analysis, positioning, UX designs, pain points, feature mapping, cost analysis, demo scripts

### docs/references/
- **Purpose**: Research, competitive analysis, and external documentation
- **Content**: Format research, competitive analysis, migration research, strategic recommendations

### docs/reviews/
- **Purpose**: Code reviews, audits, and maintainability reports
- **Content**: Security audits, code quality audits, maintainability reviews, UX reviews

### docs/roadmap/
- **Purpose**: Project planning and milestone tracking
- **Content**: Roadmaps, milestone plans, implementation schedules

### docs/changelogs/
- **Purpose**: Historical record of changes to the system
- **Content**: `CHANGELOG.md` (current), archived changelogs (`CHANGELOG.YYYY-MM-DD.md`)

### docs/bugs/
- **Purpose**: Bug investigation and resolution documentation
- **Format**: `BUG-###-short-description.md`

### docs/ideas/
- **Purpose**: Feature exploration and research before promotion to specs
- **Content**: Freeform markdown exploring a feature concept
- **Archive**: Promoted ideas move to `docs/ideas/_archive/`

### docs/technical-debt/
- **Purpose**: Known technical debt items and remediation plans

### docs/testing/
- **Purpose**: Testing strategy, test plans, coverage reports

### docs/runbooks/
- **Purpose**: Operational guides and setup instructions

### docs/references/
- **Purpose**: External documentation, research materials, API guides

### docs/architecture/
- **Purpose**: Engineering process documentation, execution standards

### docs/security/
- **Purpose**: Security review reports and findings log

### Placement Rules

**DO NOT**: Create documentation files in `docs/` root, mix document types, or create new subdirectories without documenting their purpose.

**DO**: Place ADRs in `docs/decisions/` with proper numbering, update this list if adding a new documentation category.

## API Versioning

- APIs must be versioned from the start of the project.
- Versioning strategy must be explicit, documented, and applied consistently.

## Development Roadmap and Planning

- Before substantive implementation begins, establish a structured plan:
  - **Kiro Specs** (preferred): `requirements.md`, `design.md`, and `tasks.md` under `.kiro/specs/{feature-name}/`
  - **Manual Roadmap** (for broader planning): `docs/roadmap/roadmap.md` with milestones and TODO items
- Link specs to the roadmap at the appropriate timeline point.
- Execute work incrementally, one task at a time.
- If implementation realities require a plan change: update the spec/roadmap, document the reason, record in changelog.

### Spec Quality Standards - NON-NEGOTIABLE

**Requirements.md** must include:
- Numbered user stories with acceptance criteria (testable, not vague)
- Non-functional requirements (performance, cost, reliability, accessibility)
- Explicit "out of scope" section to prevent scope creep

**Design.md** must include:
- Architecture diagram showing service interactions
- Data model with actual SQL or Pydantic schemas (not hand-wavy descriptions)
- API contracts with request/response examples
- Frontend component tree with data flow
- For pipelines/background processes: observability design (what gets logged, what metrics are emitted, how to trace a request end-to-end)

**Tasks.md** must include:
- Phases with clear boundaries and checkpoint gates
- Every task has a concrete deliverable (file path, test name, endpoint)
- TDD structure: RED → GREEN → REFACTOR per step
- Security checkpoint at final phase
- No vague tasks like "implement the feature" - break down to individual functions/components

**If a spec feels thin, it IS thin. Expand it before writing code.**

### ADR Roadmap Linking - MANDATORY

Every ADR must be linked in `docs/roadmap/roadmap.md` at the sprint/milestone row where the decision was made.

**Rules:**
- Link ADRs in chronological order within each row
- Only link ADRs that actually exist on disk
- Format: `[ADR-###](../decisions/ADR-###-descriptive-name.md)` (relative path from `docs/roadmap/`)

## Code Documentation

- See `code-commenting-standards.md` for docstring and comment rules
- All docs live in `docs/` directory (except `README.md`)
