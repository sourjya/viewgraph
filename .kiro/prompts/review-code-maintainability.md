
Act as a principal-level software engineer, software architect, and prompt-driven code review specialist.

Your task is to perform a comprehensive optimization, maintainability, and structural consistency review of this repository. Assess the codebase for redundancy, inconsistency, missed reuse opportunities, weak abstractions, and recurring engineering gaps, then produce a practical refactor plan that improves maintainability without altering business behavior.

Your mission is not just to find obvious duplicates. You must actively look for families of similar issues across the repository, including repeated patterns that appear with minor variations, inconsistent implementations of the same concern, and areas where the same engineering intent has been solved multiple different ways.

## Review Objectives

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
11. Inconsistent error contract patterns, including multiple shapes for similar errors, repeated error translation logic, or mixed approaches to user-facing and internal error handling.
12. Repeated parsing, serialization, transformation, mapping, or normalization logic that should be centralized.
13. Inconsistent configuration access patterns, including direct environment reads scattered through the codebase, partially duplicated config loaders, or mixed defaulting behavior.
14. Domain rules or business policies implemented in multiple places, especially if the same rule is enforced separately in controllers, services, validators, UI code, jobs, or database layers.
15. Repeated control flow for retries, backoff, polling, idempotency, rate limiting, caching, batching, or pagination that should be standardized. Specifically flag: missing rate limiting on authentication or expensive endpoints implemented inconsistently across services, unbounded pagination parameters without a maximum cap enforced at a shared layer, and ReDoS-prone regex patterns applied to user input that should be centralized and reviewed for catastrophic backtracking.
16. Frontend duplication such as repeated form logic, validation rules, loading states, empty states, error rendering, table behavior, modal patterns, or data-fetching orchestration.
17. Backend duplication such as repeated controller scaffolding, request guards, service orchestration, repository access patterns, transaction handling, or response formatting.
18. Logging and observability inconsistencies, including repeated log message templates, missing context propagation, mixed severity usage, or inconsistent metrics and tracing hooks. Specifically flag: security-relevant events that are not consistently logged across services (failed authentication, permission denials, admin actions, data exports), PII or sensitive data appearing in log output without masking, and missing correlation IDs or request context that would make incident investigation difficult.
19. Test duplication, weak test structure, repeated fixture setup, brittle mocks, inconsistent factories, and missing opportunities for shared test utilities.
20. Dependency hygiene issues such as duplicated utility libraries, overlapping packages, wrapper abstractions with little value, or modules coupled to too many concrete dependencies.
21. Workflow and tooling duplication across scripts, CI pipelines, code generation, build steps, linting, formatting, and local developer commands.
22. Public contract drift across API handlers, clients, SDKs, schemas, validators, and documentation.
23. UI, API, and database naming drift where the same concept is represented with different terms, shapes, or statuses across layers.
24. State management inconsistencies, including duplicated derived state, conflicting sources of truth, or business state spread across unrelated modules.
25. File and module placement issues where code exists in technically functional but semantically wrong locations, making future navigation and ownership harder.
26. Cross-cutting concerns implemented ad hoc, including auth, auditing, correlation IDs, feature flags, permissions, tenancy, localization, serialization, and response shaping.
27. Unsafe or maintainability-harming patterns around async behavior, resource lifecycle, cleanup, event listeners, subscriptions, timers, worker jobs, or background processing.
28. Areas where a change to one concept would currently require touching too many files, indicating poor cohesion or excessive coupling.
29. Documentation drift inside the codebase, including misleading comments, stale READMEs, outdated examples, mismatched type comments, and code that no longer matches its stated intent.
30. Places where introducing a shared abstraction would be premature, over-engineered, or harmful. Explicitly call these out so the refactor plan stays pragmatic.
31. AI-generation artifacts: identify patterns typical of multi-session AI-generated code, including over-verbose boilerplate, redundant inline comments that merely restate what the code does, inconsistent naming conventions across files generated in different sessions, unnecessary abstraction layers that add indirection without reducing duplication, and structural inconsistencies that suggest the code was generated without awareness of adjacent modules.
32. Test coverage delta: for every new module, service, utility, or Lambda handler identified in this review, flag whether corresponding unit or integration tests exist. Highlight untested public interfaces, untested business-critical paths, and any service boundaries that lack contract tests.

## Explicit Gap-Finding Instructions

When reviewing, do not stop after identifying a single instance of a problem. For every issue found, actively search for sibling occurrences elsewhere in the codebase.

Use the following review behavior:

* If you find one repeated validation block, look for all other validation paths that solve the same concern differently.
* If you find one duplicated mapper, serializer, or DTO, search for all similar translation layers.
* If you find one repeated query or repository pattern, inspect adjacent services and related modules for the same structure.
* If you find one hard-coded string, status, or constant family, search for all variants and near-matches.
* If you find one bloated file or class, inspect neighboring files in the same layer for similar responsibility creep.
* If you find one inconsistent naming pattern, identify the complete naming family across the repo.
* If you find one standardizable concern such as logging, auth, retries, caching, feature flags, or error handling, review the entire codebase for alternative implementations of the same concern.
* If you find one duplicated frontend interaction pattern, inspect the rest of the UI for similar state, rendering, or network orchestration duplication.
* If you find one test smell, determine whether it reflects a broader testing pattern or an isolated case.
* If you find one AI-generation artifact (objective 31), scan all files generated in the same session or feature branch for the same pattern family.
* If you find one untested module or interface (objective 32), audit the entire layer for consistent test coverage gaps rather than reporting it as an isolated omission.
* If you find one rate limiting gap or unbounded pagination instance (objective 15), scan all endpoints and service entry points for the same missing control.
* If you find one logging security gap (objective 18), audit all services for consistent coverage of security-relevant events before reporting it as an isolated omission.

Treat the repository as a pattern landscape, not a collection of isolated issues.

## Review Method

Use this method while analyzing:

1. Identify repeated patterns within a file.
2. Check whether the same pattern exists across sibling files in the same layer.
3. Check whether the same concern is implemented differently across layers.
4. Group similar findings into refactor themes instead of reporting each occurrence as unrelated noise.
5. Prefer recommendations that remove entire categories of repetition, not just individual examples.
6. Quantify the spread of a problem whenever possible, such as how many files, modules, or call sites are affected.
7. Distinguish root-cause design issues from surface-level duplicates.
8. Call out when a symptom appears in many places but should be solved centrally once.

## Operating Constraints

* Base every finding on direct evidence from the codebase.
* Do not make speculative claims.
* Do not recommend broad rewrites unless clearly justified by repeated structural evidence.
* Prioritize high-impact, low-risk improvements first.
* Preserve existing behavior, contracts, public interfaces, and expected outputs unless a change is explicitly flagged as a separate recommendation.
* Distinguish between safe cleanup, moderate refactor, and deeper architectural improvement.
* Prefer incremental refactors that can be executed in small, reviewable steps.
* Explicitly separate root-cause issues from follow-on symptoms.
* Do not propose abstractions that add indirection without reducing meaningful duplication or inconsistency.
* Do not collapse intentionally separate domain concepts just because they look superficially similar.
* Flag where a shared abstraction is justified versus where duplication is acceptable due to differing domain intent.
* When recommending consolidation, note the likely migration path and blast radius.
* Highlight any findings that would require coordinated updates across multiple layers, such as schema, API, UI, and tests.
* When reviewing AI-generated code, apply extra scrutiny to naming consistency, comment quality, and structural coherence across files - these are the most common failure modes of multi-session generation.

## Evidence Requirements

For each finding:

* Cite exact files, functions, classes, or modules.
* Explain whether the issue is local, repeated, or systemic.
* Show the recurring pattern, not just a single instance, when applicable.
* Describe the maintainability cost in concrete terms, such as change amplification, regression risk, onboarding friction, testing complexity, or hidden business rule drift.
* State why the proposed refactor is safe or what makes it risky.

## Refactor Evaluation Criteria

Assess each recommendation using:

* Maintainability gain
* Reuse potential
* Readability improvement
* Testability improvement
* Coupling reduction
* Risk of behavioral regression
* Breadth of impact across the codebase
* Ease of incremental rollout

## Required Output

### A. Executive Summary

Provide:

* The most important maintainability risks
* The strongest reuse opportunities
* The areas with the highest duplication or inconsistency
* The most systemic cross-cutting patterns worth standardizing
* The highest-confidence quick wins with low regression risk
* A summary of AI-generation artifact findings and inter-session drift observed

### B. Findings Table

For each finding, include:

* Title
* Severity: Low, Medium, High
* Category
* Pattern scope: Local, Repeated, Systemic
* Exact evidence: files, functions, classes, or modules involved
* Why it matters
* Recommended refactor
* Estimated effort
* Regression risk
* Likely payoff

### C. Refactor Roadmap

Organize recommendations into:

* Phase 1: Safe quick wins
* Phase 2: Moderate refactors
* Phase 3: Structural improvements

For each phase, explain:

* Why these items belong in that phase
* Dependencies between items
* Suggested implementation order
* What should be tested after completion

### D. Optional Patch Proposals

For the top 5 highest-confidence issues, provide concrete refactor examples or patch-ready implementation guidance.

### E. Consolidation Themes

Group related findings into broader refactor themes, for example:

* Error handling standardization
* Config centralization
* DTO and schema unification
* Shared frontend state patterns
* Repository and query abstraction cleanup
* Test utility consolidation
* AI-generation drift remediation
* Rate limiting and abuse prevention standardization
* Logging security and observability consolidation

This section should help turn many granular findings into a smaller number of actionable workstreams.

### F. Do Not Miss List

At the end, include a checklist of high-value areas you explicitly reviewed, even if no issue was found:

* Constants and magic values
* DTO and schema duplication
* Auth and permission checks
* Logging and exception handling
* API response consistency
* Database access patterns
* Validation paths
* Frontend form/state duplication
* Test utilities and fixtures
* Config and environment access
* Dependency duplication
* Dead code and unused abstractions
* AI-generation naming drift across sessions
* Untested new modules and public interfaces
* Redundant comments or documentation that restates obvious code behavior
* Lambda handler structure and execution role hygiene (for AWS-based codebases)
* Rate limiting coverage across all authentication and expensive endpoints
* Security-relevant event logging coverage across all services
* Unbounded pagination parameters without enforced maximum caps

## Quality Bar

Be precise, repository-specific, and implementation-aware. Avoid generic best-practice commentary. Deliver an engineering-grade review with actionable findings, not a vague advisory summary.

Do not merely point out code smells. Build a structured, evidence-based refactor strategy that reveals patterns, consolidates similar gaps, and helps the team reduce long-term maintenance cost with minimal behavioral risk.
