---
inclusion: always
---

# Reusable Architecture

Reusable component design, infrastructure abstraction, and centralized configuration.

## Reusable Component Architecture - MANDATORY

Before building any new service, module, component, or helper, think reuse-first.

### Design-Time Mindset

1. **Search before building** - scan the codebase for existing implementations that solve the same or a similar problem. Duplication is a bug.
2. **Identify the generic core** - every piece of logic has a domain-specific shell and a generic core. Extract the generic core as a standalone unit with clean inputs/outputs.
3. **Design for reuse, place locally** - architect components with clean interfaces, dependency injection, and no hardcoded assumptions. But place them in the feature where they're first needed (per the Graduation Policy in `code-organization.md`). The clean design makes future graduation to `shared/` trivial.
4. **Pure functions by default** - helper methods and utilities should be pure functions (no side effects, no hidden state, no implicit dependencies) wherever possible. Pure functions are trivially reusable and testable.
5. **Parameterize, don't specialize** - if a component could serve multiple consumers with minor variations, accept those variations as parameters rather than forking the implementation.

### When NOT to Make Something Reusable

- If it requires more than 3 domain-specific parameters to generalize, it's not ready - keep it feature-scoped
- If the "generic" version would be more complex than two specialized copies, don't abstract
- If only one consumer exists and no second consumer is foreseeable, don't over-engineer

### Review Checkpoint

When designing any new module, answer these before writing code:
- Does something similar already exist in the codebase?
- What is the generic core vs. the domain-specific wrapper?
- Could another feature, service, or project use this with zero modification?
- Am I hardcoding anything that should be a parameter?

## Infrastructure Abstraction - MANDATORY

**Every external dependency gets an interface.** Storage, email, payments, auth providers, AI models, notification channels - all must be accessed through an abstract interface with swappable backend implementations. No service should be hardwired to a specific vendor or infrastructure.

### Adapter Pattern for External Services

Define an abstract interface for each infrastructure concern. Implement one adapter per backend. Application code depends only on the interface, never on a concrete implementation.

This applies to:
- **File storage** (local filesystem ↔ S3 ↔ GCS)
- **Configuration persistence** (file ↔ localStorage ↔ IndexedDB)
- **Email/SMS** (console logger ↔ SES ↔ SendGrid)
- **Notifications** (log ↔ SNS ↔ WebSocket)
- **AI/ML providers** (local model ↔ OpenAI ↔ Bedrock)
- **Payment processing**, **auth providers**, and any other external service

### Factory + Config-Driven Instantiation

Backends are selected via configuration, never hardcoded. A factory function reads the config and returns the correct adapter:

```python
storage = create_storage_backend(settings.STORAGE_BACKEND)  # "local" | "s3"
email = create_email_backend(settings.EMAIL_BACKEND)         # "console" | "ses"
```

- The factory is the only place that knows about concrete implementations
- Application code receives the interface - it never imports a specific backend directly
- Switching providers is a config change, not a code change

### Secure Defaults

All infrastructure adapters must enforce security at the interface level:

1. **Content-type validation** - never trust client-provided MIME types on upload. Validate server-side.
2. **Size limits at the interface** - enforce max file size in the abstract interface, not just the implementation. Every backend inherits the same limits.
3. **Path traversal prevention** - sanitize all keys and paths. Reject `../`, absolute paths, and null bytes.
4. **Signed/expiring URLs** - never expose raw storage paths (S3 keys, file paths). All download URLs must be signed with expiration.
5. **Least privilege** - each adapter uses credentials scoped to its specific function. Storage adapters don't get database credentials.

### Idempotency

- **Uploads** are idempotent - uploading the same key with the same content is a no-op
- **Deletes** are idempotent - deleting a non-existent object succeeds silently
- **Config writes** are idempotent - writing the same value is a no-op
- Design all infrastructure operations so they can be safely retried without side effects

### Observability

Every infrastructure adapter must emit structured logs for every operation:
- **What**: operation type (upload, download, delete, send)
- **Target**: key, recipient, resource identifier
- **Size**: bytes transferred (where applicable)
- **Duration**: wall-clock time of the operation
- **Outcome**: success or failure with error category
- The abstract interface defines the logging contract - implementations inherit it, not duplicate it

## Centralized Configuration & Constants - MANDATORY

**ZERO embedded literals.** All configuration values, magic numbers, string constants, and environment-dependent settings must live in dedicated, centralized locations - never scattered across modules.

### Configuration Hierarchy

```
backend/src/
├── core/
│   └── config.py             # App config: reads from env vars, .env, defaults
├── constants/                # Domain constants - organized by domain
│   ├── auth.py               # Roles, token lifetimes, OAuth scopes
│   ├── products.py           # Categories, statuses, limits
│   └── common.py             # Shared constants (pagination defaults, date formats)
```

```
frontend/src/
├── shared/
│   └── config/
│       ├── env.ts            # Environment-dependent config (API URLs, feature flags)
│       └── constants.ts      # App-wide constants
├── features/
│   └── auth/
│       └── constants.ts      # Feature-scoped constants (only if used by this feature alone)
```

### Rules

1. **No string literals in business logic** - URLs, status values, error messages, field names, limits, thresholds - all go in constants files or config.
2. **No magic numbers** - every numeric value with business meaning gets a named constant with a comment explaining why that value was chosen.
3. **Config reads from environment** - all environment-dependent values (DB URLs, API keys, feature flags, ports) go through a single config module that reads from `.env` / environment variables with typed defaults.
4. **Constants are grouped by domain** - `constants/auth.py` for auth-related values, `constants/products.py` for product-related values. Not one giant constants file.
5. **Feature-scoped constants stay in the feature** - if a constant is only used within one feature, it lives in that feature's `constants.ts` or at the top of the relevant module. It graduates to `shared/` or `constants/` when a second consumer appears.
6. **Enums over string literals** - use enums (Python `Enum`, TypeScript `enum` or `as const`) for any value that has a fixed set of options. Never compare against raw strings.
7. **Single source of truth** - if the same value is needed by both frontend and backend, define it in the backend and expose it via API or shared schema. Never duplicate constants across the stack.

### What Belongs Where

| Value type | Location |
|---|---|
| Environment-dependent (DB URL, API keys, ports) | `core/config.py` / `shared/config/env.ts` |
| Domain constants (statuses, roles, categories) | `constants/<domain>.py` / `features/<domain>/constants.ts` |
| Shared constants (pagination, date formats) | `constants/common.py` / `shared/config/constants.ts` |
| Error messages | `constants/<domain>.py` or a dedicated `constants/errors.py` |
| Feature flags | `core/config.py` (read from env) |
