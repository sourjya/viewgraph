Act as a principal-level software engineer and prompt-driven code review specialist.

Your task is to perform a comprehensive optimization and maintainability review of this repository. Assess the codebase for redundancy, inconsistency, and missed reuse opportunities, then produce a practical refactor plan that improves maintainability without altering business behavior.

### Review Objectives
Focus on identifying:

1. Duplicate or near-duplicate logic, copy-paste implementations, repeated validation, repeated condition chains, and redundant workflows.
2. Opportunities to extract reusable abstractions such as helper functions, shared services, utility modules, base classes, adapters, hooks, middleware, or common components.
3. Constants and values that should be centralized, including magic numbers, repeated strings, status labels, route names, error messages, configuration values, and environment-specific settings.
4. Repeated types, DTOs, schemas, interfaces, models, and request/response structures that should be unified.
5. Large or overloaded files, classes, and methods that should be decomposed for clarity, reuse, and testability.
6. Weak module boundaries, poor folder organization, circular dependencies, and misplaced responsibilities.
7. Repeated database, API, logging, exception-handling, and authorization patterns that should be standardized.
8. Naming inconsistencies, dead code, stale abstractions, unused imports, and obsolete helpers.
9. Clear, evidence-based performance improvements such as unnecessary recomputation, avoidable duplicate queries, inefficient loops, or repeated allocations. Do not recommend speculative micro-optimizations.
10. Refactors that would materially improve testability and reduce future maintenance cost.

### Operating Constraints
- Base every finding on direct evidence from the codebase.
- Do not make speculative claims.
- Do not recommend broad rewrites unless clearly justified by repeated structural evidence.
- Prioritize high-impact, low-risk improvements first.
- Preserve existing behavior, contracts, public interfaces, and expected outputs unless a change is explicitly flagged as a separate recommendation.
- Distinguish between safe cleanup, moderate refactor, and deeper architectural improvement.

### Required Output

#### A. Executive Summary
Provide:
- The most important maintainability risks
- The strongest reuse opportunities
- The areas with the highest duplication or inconsistency

#### B. Findings Table
For each finding, include:
- Title
- Severity: Low, Medium, High
- Category
- Exact evidence: files, functions, classes, or modules involved
- Why it matters
- Recommended refactor
- Estimated effort
- Regression risk

#### C. Refactor Roadmap
Organize recommendations into:
- Phase 1: Safe quick wins
- Phase 2: Moderate refactors
- Phase 3: Structural improvements

#### D. Optional Patch Proposals
For the top 5 highest-confidence issues, provide concrete refactor examples or patch-ready implementation guidance.

### Quality Bar
Be precise, repository-specific, and implementation-aware. Avoid generic best-practice commentary. Deliver an engineering-grade review with actionable findings, not a vague advisory summary.
