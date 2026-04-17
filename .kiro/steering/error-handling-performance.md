---
inclusion: always
---

# Error Handling & Performance

Standards for error handling, performance optimization, and themed UI dialogs.

## Error Handling Standards - MANDATORY

**Errors must be explicit, contextual, and never silently swallowed.**

### Rules

1. **Never silently ignore errors** - every error must be raised, logged, or explicitly handled. Empty `except:` / `catch {}` blocks are forbidden.
2. **Use specific error types** - not catch-all handlers. Each error type should clearly indicate what went wrong and where.
3. **Error messages must include context** - request parameters, status codes, what operation was being attempted, and what input caused the failure. No generic "something went wrong."
4. **No automatic fallbacks** - code should either succeed or fail clearly. Fallbacks are only allowed when explicitly designed and documented. Silent fallbacks hide real problems.
5. **Fix root causes, not symptoms** - if an error keeps occurring, fix the underlying issue rather than adding retry/fallback logic around it.
6. **External service calls: retry with backoff** - use exponential backoff for transient failures. Raise the last error if all attempts fail. Log each retry attempt.
7. **API endpoints return proper HTTP status codes** - never return 200 for errors. Use 4xx for client errors, 5xx for server errors, with structured error response bodies.
8. **Frontend errors: catch at boundaries** - use error boundaries (React) or equivalent. Show user-friendly messages, log the full error for debugging.

## Performance Guidelines - MANDATORY

**Design for efficiency from the start. Performance is not an afterthought.**

### Rules

1. **Cache expensive operations** - database queries, API calls, computed values. Use appropriate cache invalidation strategies.
2. **Pagination for all list endpoints** - never return unbounded result sets. Default page size must be a named constant.
3. **No N+1 queries** - use eager loading, joins, or batch queries. Review ORM-generated SQL for new endpoints.
4. **Lazy load heavy resources** - large images, optional modules, below-the-fold content. Load on demand, not upfront.
5. **Database indexes** - every column used in WHERE, JOIN, or ORDER BY clauses in frequent queries must have an index. Document index decisions.
6. **Bundle size awareness (frontend)** - monitor bundle size. Use code splitting and tree shaking. Avoid importing entire libraries when only one function is needed.
7. **Timeouts on all external calls** - every HTTP request, database query, and external service call must have an explicit timeout. No indefinite waits.

## Themed Dialogs - MANDATORY

**All confirmation dialogs, alerts, and informational popups must use the application's themed dialog components. No exceptions.**

### Rules

1. **Never use native browser dialogs** - `window.alert()`, `window.confirm()`, and `window.prompt()` are forbidden. They cannot be styled, break the visual experience, and behave inconsistently across browsers.
2. **Use the application's dialog/modal system** - every dialog must render through the project's themed component (e.g., `ConfirmDialog`, `AlertDialog`, `Modal`) so it inherits the design system's colors, typography, spacing, and animations.
3. **Consistent UX across all interactions** - destructive actions get a themed confirmation dialog with clear action labels (not "OK/Cancel"). Informational messages use themed toast/snackbar notifications. Error messages use themed error dialogs with context.
4. **Accessible by default** - themed dialogs must trap focus, support Escape to close, and include proper ARIA roles (`role="dialog"`, `aria-modal="true"`).

## Observability-First Design - MANDATORY

**ZERO BLACKBOXES.** Every pipeline, background process, and async workflow must be observable from day one.

### Rules for all background/async/pipeline code:

1. **Structured logging** - every operation logs: what started, what inputs it received, what it produced, how long it took, whether it succeeded or failed. JSON structured logging, not print statements.
2. **Correlation IDs** - every pipeline run or background task gets a unique ID that flows through all log entries and database records.
3. **State transitions** - every job/task has explicit states (PENDING → RUNNING → SUCCESS/FAILED/RETRYING) stored in the database.
4. **Metrics** - track: items processed, items failed, processing time, queue depth, retry count.
5. **Error context** - when something fails, log the full context: what was being processed, what step failed, what the input was.
6. **Resumability** - if a pipeline crashes mid-run, it must be resumable from where it stopped via database checkpointing.
7. **Discuss architecture first** - before implementing any pipeline or background process, discuss the architecture: data flow, failure modes, retry strategy, observability hooks.
