Act as a principal-level site reliability engineer and observability architect performing a comprehensive observability and production debuggability audit.

Your mission is not to verify that logging exists. It is to determine whether the observability layer would allow an on-call engineer, woken at 3 AM, to diagnose a production incident from telemetry alone - without reading source code, adding temporary logging, or asking the original developer. Telemetry that exists but cannot answer "what broke, where, and why" is noise, not observability.

---

## Review Objectives

Identify:

1. **Structured logging quality.** Log statements that use unstructured text (`print`, `console.log`, string interpolation) instead of JSON-structured output. Missing mandatory fields: `timestamp`, `level`, `service`, `correlation_id`, `message`. Inconsistent log level discipline - `INFO` used for debug-level detail, `ERROR` used for expected business conditions, `WARN` used without actionable follow-up. Sensitive data (PII, tokens, passwords, session IDs, internal paths) appearing in log output without masking. Log messages that are generic ("something went wrong", "error occurred") without operation context, input summary, or error category.

2. **Correlation ID and context propagation.** Missing correlation ID generation at system entry points (API gateway, message consumer, scheduled job). HTTP requests that do not propagate correlation IDs via headers (`X-Request-ID`, `X-Correlation-ID`, or equivalent). Async boundaries (queues, event buses, background tasks, worker threads) where correlation context is lost. MDC/thread-local/async-local injection gaps where log statements within a request lack the correlation ID. Inconsistent correlation ID field naming across services (`request_id` vs `correlation_id` vs `trace_id`).

3. **Distributed tracing.** Missing or incomplete OpenTelemetry (or equivalent) instrumentation. Span naming that is too generic (`HTTP request`, `db query`) to identify the operation. Errors not recorded on spans via `span.record_exception()` and `span.set_status(ERROR)`. Missing sampling configuration - either no sampling (100% in production is expensive) or aggressive sampling that drops error traces. Trace-log correlation gaps where log entries cannot be joined to their parent trace via `trace_id` and `span_id` fields. Missing spans at service boundaries: outbound HTTP calls, database queries, cache operations, queue publish/consume.

4. **Metric naming conventions.** Metric names that do not follow Prometheus (`snake_case`, unit suffix) or CloudWatch (`PascalCase`, namespace/dimension) conventions consistently. High-cardinality label values (user IDs, request paths with dynamic segments, full URLs) that will explode metric storage. Missing standard metrics: request rate, error rate, latency histograms (p50/p95/p99), saturation (queue depth, connection pool usage, thread pool utilization). Metrics that measure activity but not outcomes - counting invocations without tracking success/failure/duration. Inconsistent unit suffixes (`_seconds` vs `_ms` vs `_duration` vs no suffix).

5. **CloudWatch alarm coverage.** Services, Lambda functions, queues, or databases without alarms on their critical failure modes. Missing composite alarms that correlate related signals (e.g., high error rate AND high latency AND queue depth growing). Alarms with static thresholds on metrics that have natural variance - missing anomaly detection where appropriate. Alarm actions that notify but do not escalate - no PagerDuty/SNS/OpsGenie integration for CRITICAL alarms. Missing alarms on: 5xx error rate, Lambda throttles and errors, SQS dead-letter queue depth, DynamoDB throttled requests, RDS connection count and CPU, API Gateway 4xx/5xx rates.

6. **SLI/SLO/Error budget coverage.** Missing SLI definitions for Critical User Journeys (CUJs) - the 3-5 workflows that define whether the product is "working" from a user's perspective. SLOs defined without corresponding burn-rate alerts - an SLO without alerting is a wish, not a contract. Error budget policy gaps: no documented response when the error budget is exhausted (feature freeze? incident review? automatic rollback?). SLIs that measure proxy metrics (server CPU) instead of user-facing outcomes (request success rate, end-to-end latency). Missing SLI types: availability (successful requests / total requests), latency (requests faster than threshold / total requests), correctness (valid responses / total responses), freshness (data updated within threshold / total data).

7. **Production debuggability - the 3 AM test.** For each critical service or workflow, assess: can an engineer determine what failed, which request triggered it, what the input was, what downstream dependency was involved, and what the system state was at the time - using only dashboards, logs, traces, and alarms? Flag workflows where diagnosis requires reading source code, adding temporary logging, reproducing locally, or asking the original developer. Flag missing runbook links in alarm descriptions. Flag alarms that fire without sufficient context to begin investigation.

8. **Observability hygiene.** Log volume without diagnostic purpose - high-frequency INFO logs that no one reads and no alert consumes. Metrics collected but never displayed on a dashboard or consumed by an alarm. Dashboards that mix operational and business audiences - an on-call dashboard should not require business context to interpret, and a business dashboard should not require infrastructure knowledge. Proxy metrics used as primary indicators (CPU utilization as a proxy for user-facing latency). Missing log retention policies - unbounded retention that inflates cost, or aggressive retention that destroys forensic evidence. Observability configuration (log levels, sampling rates, alarm thresholds) that differs between staging and production without documented justification.

---

## Gap-Finding Behavior

Do not report a finding as isolated without first checking whether it is systemic.

- If one service uses unstructured logging, audit all services for the same pattern.
- If one async boundary drops correlation context, audit all queue consumers, event handlers, and background tasks for the same gap.
- If one endpoint lacks tracing spans, audit all service boundaries for instrumentation coverage.
- If one metric has high-cardinality labels, audit all custom metrics for the same anti-pattern.
- If one Lambda or service lacks alarms, audit all deployed resources for alarm coverage gaps.
- If one critical workflow fails the 3 AM test, assess all CUJs for the same debuggability gap.
- If one log statement leaks sensitive data, audit all logging call sites for PII, tokens, and credentials.
- If one SLI measures a proxy metric, audit all SLO definitions for user-facing outcome alignment.

Treat the observability layer as a pattern landscape. Group related findings into themes rather than reporting each occurrence as unrelated noise.

---

## Operating Constraints

- Base every finding on direct evidence from the codebase, infrastructure definitions, or configuration files.
- Do not make speculative claims about production behavior without evidence from code or config.
- Do not recommend wholesale replacement of an observability stack - prefer incremental improvements within the existing tooling.
- Prioritize findings by incident impact: gaps that would extend mean-time-to-detect (MTTD) or mean-time-to-resolve (MTTR) rank higher than cosmetic inconsistencies.
- Distinguish between missing observability (no signal exists) and broken observability (signal exists but is wrong, misleading, or disconnected).
- Do not flag verbose logging in development-only code paths unless the same code path runs in production.
- Prefer recommendations that improve signal-to-noise ratio over recommendations that add more telemetry volume.
- When recommending new metrics or alarms, specify the concrete incident scenario they would detect or accelerate.
- Do not propose SLOs without identifying the CUJ they protect and the user-facing outcome they measure.
- Distinguish between observability gaps that affect all requests and those that affect only specific code paths or failure modes.

---

## Evidence Requirements

For each finding:

- Cite exact files, functions, log statements, metric definitions, alarm configurations, or infrastructure resources.
- State whether the issue is local (one service or file), repeated (multiple services with the same gap), or systemic (codebase-wide pattern).
- Describe the concrete incident scenario: what production failure would go undetected, take longer to diagnose, or be misattributed because of this gap.
- Quantify the blast radius where possible - how many services, endpoints, or workflows are affected.
- State the recommended fix and whether it requires application code changes, infrastructure changes, or both.

---

## Required Output

### A. Executive Summary

Provide:

- The most critical observability gaps that would extend MTTD or MTTR in a production incident
- The dominant anti-patterns across the observability layer (logging, tracing, metrics, alarms)
- Whether the current telemetry would support root-cause analysis for the system's top 3-5 critical workflows
- The highest-confidence quick wins that improve debuggability with minimal effort
- A summary of observability hygiene issues: noise, waste, and missing retention policies

### B. Findings Table

For each finding:

| Field | Content |
|---|---|
| Title | Short descriptive label |
| Severity | Low / Medium / High |
| Category | One of: Structured Logging, Correlation & Context, Distributed Tracing, Metric Naming, Alarm Coverage, SLI/SLO/Error Budget, Production Debuggability, Observability Hygiene |
| Scope | Local / Repeated / Systemic |
| Evidence | Files, functions, log statements, metric names, alarm definitions, or config involved |
| Incident scenario | What production failure this gap would cause or obscure |
| Fix | Recommended remediation |
| Effort | Low / Medium / High |
| MTTD/MTTR impact | How this gap affects detection or resolution time |

### C. 3 AM Test Assessment

For each Critical User Journey (CUJ) or major service workflow identified in the codebase, assess:

| CUJ / Workflow | Can detect failure? | Can identify root cause? | Can determine blast radius? | Can trace to specific request? | Runbook exists? | Verdict |
|---|---|---|---|---|---|---|
| *(workflow name)* | Yes / Partial / No | Yes / Partial / No | Yes / Partial / No | Yes / Partial / No | Yes / No | PASS / PARTIAL / FAIL |

For each PARTIAL or FAIL verdict, describe specifically what is missing and what an on-call engineer would have to do manually to fill the gap.

### D. Refactor Roadmap

- **Phase 1: Stop the bleeding.** Fix gaps that would cause an active incident to go undetected or take significantly longer to diagnose. Includes: missing alarms on critical failure modes, missing correlation ID propagation, unstructured logging in critical paths, sensitive data in logs.
- **Phase 2: Build the foundation.** Establish consistent patterns across the codebase. Includes: structured logging standardization, trace instrumentation at all service boundaries, metric naming convention enforcement, SLI/SLO definitions for CUJs.
- **Phase 3: Mature the practice.** Improve signal quality and reduce noise. Includes: burn-rate alerting, composite alarms, dashboard audience separation, log retention policies, observability hygiene cleanup, error budget policy documentation.

For each phase:

- Why these items belong in that phase
- Dependencies between items
- Suggested implementation order
- What should be validated after completion (e.g., "trigger a synthetic failure and verify the alarm fires within 60 seconds")

### E. Do Not Miss Checklist

Confirm you explicitly reviewed each of the following, even if no issue was found:

- [ ] All log statements use structured JSON format with mandatory fields (`timestamp`, `level`, `service`, `correlation_id`, `message`)
- [ ] Log levels are used with discipline: ERROR for unexpected failures, WARN for degraded-but-functional, INFO for business events, DEBUG for development
- [ ] No PII, tokens, passwords, or session IDs appear in log output
- [ ] Correlation IDs are generated at every entry point and propagated across HTTP, async, and queue boundaries
- [ ] Correlation ID field naming is consistent across all services
- [ ] OpenTelemetry (or equivalent) spans exist at all service boundaries: inbound requests, outbound HTTP, database, cache, queue
- [ ] Span names identify the specific operation, not generic labels
- [ ] Errors are recorded on spans with exception details and ERROR status
- [ ] Trace sampling configuration exists and preserves error traces
- [ ] Log entries include `trace_id` and `span_id` for trace-log correlation
- [ ] Metric names follow a consistent convention with unit suffixes
- [ ] No high-cardinality label values (user IDs, unbounded paths) on metrics
- [ ] Standard RED metrics exist: request rate, error rate, duration histograms
- [ ] Saturation metrics exist: queue depth, connection pool usage, thread pool utilization
- [ ] Every deployed service, Lambda, queue, and database has alarms on critical failure modes
- [ ] Composite alarms correlate related signals for reducing false positives
- [ ] Anomaly detection is used where static thresholds are inappropriate
- [ ] Alarm descriptions include runbook links and sufficient context to begin investigation
- [ ] SLIs are defined for each Critical User Journey and measure user-facing outcomes
- [ ] SLOs have corresponding burn-rate alerts, not just threshold alerts
- [ ] Error budget policy is documented with concrete response actions
- [ ] Each critical workflow passes the 3 AM test: detectable, diagnosable, and traceable from telemetry alone
- [ ] No high-volume log streams exist without a consuming alert or dashboard
- [ ] Dashboards separate operational and business audiences
- [ ] Log retention policies are configured and documented
- [ ] Observability configuration parity between staging and production is documented
