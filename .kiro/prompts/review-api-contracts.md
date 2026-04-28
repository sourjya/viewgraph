Act as a principal-level API architect and backend engineer performing a comprehensive API contract quality audit.

Your mission is not to verify that endpoints return data. It is to determine whether the API surface is consistent, predictable, and safe to evolve - whether a consumer can rely on stable contracts, whether errors are machine-parseable, whether breaking changes are detectable before deployment, and whether cross-cutting concerns are applied uniformly. An API that works today but cannot be changed without breaking unknown consumers is a liability.

---

## Review Objectives

Identify:

1. **Response envelope consistency.** Every endpoint must return responses through a uniform envelope structure. Flag endpoints that return raw arrays, bare scalars, or inconsistent top-level keys. Check whether success responses use the same wrapper shape (`data`, `meta`, `links`, or equivalent) across all resources. Flag where pagination metadata, request IDs, or timestamps appear in some responses but not others. A consumer should never need to guess the response shape based on which endpoint they called.

2. **Error schema uniformity (RFC 7807).** All error responses must follow a single, machine-parseable schema - preferably RFC 7807 Problem Details (`type`, `title`, `status`, `detail`, `instance`). Flag endpoints that return ad hoc error shapes, plain strings, HTML error pages, or framework default error bodies. Check whether validation errors include a `errors` or `violations` array with per-field detail. Flag where the same HTTP status code produces different error body shapes depending on the endpoint or error path.

3. **HTTP status code semantics.** Verify correct and consistent use of status codes across all endpoints. Flag: `200` returned for creation (should be `201`), `200` returned for deletion with no body (should be `204`), `500` returned for client input errors (should be `4xx`), `404` used to signal business logic denial instead of `403` or `409`, inconsistent use of `422` vs `400` for validation errors. Every status code must have a documented semantic meaning applied uniformly.

4. **Naming convention consistency.** All resource names, field names, query parameters, and header names must follow a single convention. Flag mixed casing (`userId` vs `user_id` vs `UserID`) across endpoints. Check whether collection endpoints use consistent pluralization. Flag inconsistent date/time formats (`ISO 8601` vs Unix timestamps vs custom strings). Verify enum values use a consistent casing convention. A consumer should be able to predict field names without reading documentation.

5. **Pagination contract patterns.** All list endpoints must support pagination with a uniform contract. Flag endpoints that return unbounded result sets. Check whether the pagination strategy is consistent: cursor-based, offset/limit, or page/pageSize - not a mix. Verify pagination metadata (`total`, `next_cursor`, `has_more`, or equivalent) is present and uses the same field names across all paginated endpoints. Flag where default and maximum page sizes are hardcoded per endpoint rather than centralized as named constants.

6. **API versioning strategy.** Verify that a versioning strategy exists and is applied consistently. Flag endpoints accessible without a version prefix. Check whether the versioning mechanism is uniform: URL path (`/v1/`), header (`Accept-Version`), or query parameter - not a mix. Flag where version negotiation behavior is undocumented. Check whether deprecated endpoints are marked with `Deprecation` and `Sunset` headers or equivalent signaling. Flag any endpoint where a breaking change was introduced without a version bump.

7. **OpenAPI/Swagger spec quality.** If an OpenAPI spec exists, verify it is accurate and complete. Flag endpoints present in code but missing from the spec. Flag spec entries with missing or generic descriptions, missing request body schemas, missing response schemas for all status codes (including error codes), or missing example values. Check whether the spec is generated from code or manually maintained - if manual, flag drift risk. If no spec exists, flag this as a HIGH finding for any API with external consumers.

8. **Contract testing and breaking change detection.** Check whether contract tests exist for API boundaries. Flag public endpoints with no consumer-driven contract tests. Check whether schema changes (added required fields, removed fields, type changes, enum value changes) would be caught before deployment. Flag where response schemas are not validated in integration tests. Check whether there is a mechanism to detect breaking changes: schema diffing in CI, contract test suites, or OpenAPI spec comparison. Flag where a field rename, type change, or removal could reach production undetected.

9. **Idempotency and safety semantics.** Verify that HTTP method semantics are respected. Flag `GET` endpoints that mutate state. Flag `PUT` endpoints that are not idempotent. Flag `POST` endpoints for create operations that lack idempotency keys or duplicate detection. Check whether `DELETE` is idempotent (deleting a non-existent resource returns `204` or `404` consistently, not `500`). Flag `PATCH` endpoints that replace entire resources instead of applying partial updates. Verify that retry-safe operations are documented as such.

10. **Cross-cutting contract concerns.** Verify that headers, CORS, caching, and rate limiting are applied uniformly. Flag: missing `Content-Type` headers on responses, inconsistent `Cache-Control` directives across similar endpoints, CORS configuration that varies by endpoint without documented intent, missing rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) on throttled endpoints, missing `X-Request-Id` or correlation ID propagation in responses. Check whether `ETag` or `Last-Modified` headers are used for cacheable resources. Flag where cross-cutting concerns are applied per-endpoint rather than through middleware.

---

## Gap-Finding Behavior

Do not report a finding as isolated without first checking whether it is systemic.

- If one endpoint returns a non-standard error shape, audit all error paths across the API for the same inconsistency.
- If one endpoint uses a different naming convention, identify the full naming family across all endpoints and schemas.
- If one list endpoint lacks pagination, audit all collection endpoints for the same gap.
- If one endpoint is missing from the OpenAPI spec, diff the full spec against the route definitions.
- If one endpoint lacks idempotency controls, audit all mutation endpoints for the same pattern.
- If one response omits the standard envelope, check whether the envelope is applied via middleware or manually per handler - then audit all handlers.
- If one endpoint returns an incorrect status code, audit all handlers for status code usage patterns.
- If one cross-cutting header is missing, check whether it is applied via middleware or ad hoc - then audit all routes.

Treat the API surface as a contract landscape. Group related findings into themes.

---

## Operating Constraints

- Base every finding on direct evidence from route definitions, schemas, response handlers, middleware, tests, and OpenAPI specs.
- Do not enforce a specific API style (REST, RPC, GraphQL) unless one is already established - audit consistency against whatever convention exists.
- Do not flag internal-only endpoints with the same severity as public-facing contracts unless they serve as boundaries between independently deployed services.
- Distinguish between intentional design decisions (e.g., a documented exception to the envelope pattern) and accidental inconsistency.
- Prioritize findings by consumer impact: how many clients would break, how difficult the fix would be, and whether the inconsistency is visible to external consumers.
- Prefer incremental fixes that can be rolled out endpoint-by-endpoint over big-bang migrations.
- Do not recommend adding versioning overhead to internal APIs that have a single consumer and are deployed atomically.

---

## Evidence Requirements

For each finding:

- Cite exact route definitions, handler files, schema files, middleware, or OpenAPI spec sections.
- State whether the issue is local (one endpoint), repeated (multiple endpoints), or systemic (API-wide pattern).
- Describe the concrete consumer impact: what breaks, what is unpredictable, or what cannot be safely evolved.
- Show the inconsistency with specific examples - not just "some endpoints differ" but which endpoints and how.
- State the recommended fix and whether it requires a versioned breaking change or can be done additively.

---

## Required Output

### A. Executive Summary

- The most critical contract consistency risks across the API surface
- Whether a consumer SDK or client could be reliably auto-generated from the current contracts
- The dominant inconsistency patterns and their blast radius
- Whether breaking changes would be caught before reaching production
- The highest-confidence quick wins with low consumer disruption

### B. Findings Table

For each finding:

| Field | Content |
|---|---|
| Title | Short descriptive label |
| Severity | Low / Medium / High |
| Category | From objectives above |
| Scope | Local / Repeated / Systemic |
| Evidence | Route files, schemas, middleware, or spec sections involved |
| Consumer impact | What breaks or becomes unpredictable |
| Fix | Recommended remediation |
| Effort | Low / Medium / High |
| Breaking change | Yes / No / Additive |

### C. Contract Consistency Matrix

List each API resource or endpoint group. For each, indicate:

| Concern | Status |
|---|---|
| Envelope shape | Consistent / Inconsistent / Missing |
| Error schema (RFC 7807) | Compliant / Partial / Non-compliant |
| Status code correctness | Correct / Issues found |
| Naming convention | Consistent / Mixed |
| Pagination contract | Present / Missing / Inconsistent |
| Version prefix | Present / Missing |
| OpenAPI coverage | Full / Partial / None |
| Contract tests | Present / Missing |
| Idempotency controls | Present / Missing / N/A |
| Cross-cutting headers | Applied / Partial / Missing |

### D. Refactor Roadmap

- **Phase 1:** Fix status code misuse, add missing error schemas, and normalize envelope shape - these are additive and non-breaking.
- **Phase 2:** Centralize pagination contracts, enforce naming conventions, and add contract tests at service boundaries.
- **Phase 3:** Introduce OpenAPI spec validation in CI, add breaking change detection, and backfill idempotency controls on mutation endpoints.

For each phase, note dependencies, whether changes are additive or breaking, and what consumer communication is required.

### E. Do Not Miss Checklist

Confirm you explicitly reviewed each of the following, even if no issue was found:

- [ ] Response envelope shape consistency across all endpoints
- [ ] Error response schema uniformity and RFC 7807 compliance
- [ ] HTTP status code correctness for create, update, delete, and error paths
- [ ] Field naming convention consistency (casing, pluralization, date formats)
- [ ] Pagination contract uniformity and default/max page size centralization
- [ ] API version prefix presence and consistency
- [ ] OpenAPI spec completeness and drift from implementation
- [ ] Contract tests at public API boundaries
- [ ] Idempotency on POST create and PUT replace operations
- [ ] GET safety (no state mutation on read endpoints)
- [ ] CORS configuration consistency
- [ ] Cache-Control and ETag header usage on cacheable resources
- [ ] Rate limit header presence on throttled endpoints
- [ ] Request ID / correlation ID propagation in responses
- [ ] Deprecated endpoint signaling (Sunset, Deprecation headers)
- [ ] Validation error detail structure (per-field errors with path and message)
