---
inclusion: always
---

# Code Organization

Runtime environment, folder structure, and development server configuration.

## Runtime and Environment

Defaults below. Override in `user-project-overrides.md` for your stack.

- **Backend**: Python 3.12+ with FastAPI
- **Frontend**: TypeScript with React + Vite
- **Backend Dependencies**: uv with pyproject.toml
- **Frontend Dependencies**: npm with package.json

## Folder Organization Principles - MANDATORY

These rules apply regardless of framework, language, or stack.

### Backend: Domain-Grouped Within Layers

Organize backend code by **layer first, domain second**. Each layer directory (routes, models, schemas, services) contains subdirectories grouped by domain when the project has more than a handful of files per layer.

```
backend/src/
├── api/                      # Route/controller layer
│   ├── v1/                   # API version namespace
│   │   ├── auth.py
│   │   ├── users.py
│   │   └── products.py
│   └── deps.py               # Shared route dependencies (auth, db session)
├── core/                     # Configuration, security, database setup
├── common/                   # Cross-cutting: middleware, logging, shared utils
├── models/                   # ORM / data models
│   ├── auth/                 # user.py, role.py, session.py
│   ├── products/             # product.py, category.py
│   └── base.py               # Shared base model
├── schemas/                  # Request/response schemas (Pydantic, Zod, etc.)
│   ├── auth/
│   ├── products/
│   └── common.py             # Shared pagination, error response schemas
├── services/                 # Business logic layer
│   ├── auth/
│   ├── products/
│   └── base.py               # Base service class if applicable
├── constants/                # Domain constants - NEVER inline in model files
│   ├── auth.py
│   └── products.py
└── main.py                   # Application entry point
```

**Rules:**
- Group by domain when a layer has 5+ files. Below that, flat is fine.
- Each domain subdirectory gets an `__init__.py` (Python) or `index.ts` (TS) that re-exports its public API.
- `common/` is for truly cross-cutting concerns (logging, middleware, error handling). Not a dumping ground.
- `constants/` holds all domain constants - never define them inline in model or service files.
- Adapt layer names to your framework's conventions (e.g., `views/` for Django, `handlers/` for Go, `controllers/` for Express).

### Frontend: Feature-Sliced Design

Organize frontend code by **feature first**. Each feature is a self-contained module with its own components, hooks, services, and types.

```
frontend/src/
├── app/                      # Application root (routing, providers, layout)
├── features/                 # Feature modules - one per domain
│   ├── auth/
│   │   ├── components/       # Feature-specific UI components
│   │   ├── hooks/            # Feature-specific hooks
│   │   ├── services/         # API calls for this feature
│   │   ├── types/            # Feature-specific type definitions
│   │   ├── utils/            # Feature-specific helpers
│   │   └── index.ts          # Public API - ONLY export what other features need
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
├── shared/                   # Cross-feature reusable code
│   ├── components/           # Generic UI (Button, Modal, Layout)
│   ├── hooks/                # Generic hooks (useDebounce, useLocalStorage)
│   ├── utils/                # Generic helpers (formatDate, cn())
│   └── types/                # Shared type definitions
├── services/                 # Global API client setup, interceptors
└── types/                    # App-wide type definitions
```

**Rules:**
- Features never import from each other's internals - only through `index.ts`.
- If feature A needs something from feature B, it goes through B's public `index.ts` export, or it belongs in `shared/`.
- Each feature's `index.ts` is the only entry point. Internal files are private to the feature.
- This pattern works for React, Vue, Svelte, Angular, or any component-based framework.

### Shared vs Feature-Scoped - Graduation Policy

Code starts in the feature where it was first needed and graduates to `shared/` only when reuse is proven:

1. **First use**: lives inside the feature directory
2. **Second feature needs it**: move it to `shared/` and update both imports
3. **Never preemptively put code in `shared/`** - that creates a junk drawer
4. `shared/` items must be genuinely generic: no feature-specific logic, no domain assumptions, no hardcoded business rules
5. If a "shared" item accumulates feature-specific parameters or branches, it should be split back into feature-scoped copies

### Customizing for Your Stack

The directory structures above are defaults. Adapt them to your stack:

- **Backend-only project**: remove the frontend section entirely - don't leave dead structure
- **Frontend-only project**: remove the backend section entirely
- **Different framework**: rename layers to match your framework's conventions (e.g., Django `views/`, Go `handlers/`, Rails `controllers/`)
- **Monorepo**: use `packages/` with each package following the same internal layer/feature structure
- **No ORM**: replace `models/` with whatever your data layer uses (`entities/`, `repositories/`, etc.)
- Keep the principles (layer-first backend, feature-first frontend, graduation policy) even when the directory names change

## Local Development Servers

Defaults below. Override in `user-project-overrides.md` for your ports.

- Backend: default port 8000
- Frontend: default port 5173
