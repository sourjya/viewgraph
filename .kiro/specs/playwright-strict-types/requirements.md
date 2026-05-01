# Playwright Strict Types - Requirements

## Problem Statement

TypeScript overtook Python and JavaScript to become the most-used language on GitHub (Octoverse 2025). JetBrains 2025 ranks TypeScript as having the highest perceived growth potential. Teams adopting strict TS configs (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) reject packages with loose types. The current `@viewgraph/playwright` fixture works but capture payloads are typed as `any` - strict TS teams treat this as a second-class integration and avoid programmatic access to capture data.

## User Stories

### US-1: Typed capture payloads

As a TypeScript developer with strict mode enabled, I want `@viewgraph/playwright` capture results to have full type definitions, so that I get autocomplete and compile-time safety when accessing capture data.

**Acceptance Criteria:**
- `viewgraph.capture()` returns a typed `ViewGraphCapture` object (not `any`)
- All top-level sections are typed: `nodes`, `summary`, `relations`, `details`, `annotations`, `metadata`
- Node types include all possible fields: `id`, `tag`, `selector`, `testid`, `text`, `bbox`, `component`, `role`, `ariaLabel`
- Discriminated unions for node types (interactive vs. structural vs. text)
- Zero `any` types in the public API surface

### US-2: Strict mode compatibility

As a developer with `strict: true` and `noUncheckedIndexedAccess` in tsconfig, I want the package to compile without errors or type assertions, so that I don't need `// @ts-ignore` workarounds.

**Acceptance Criteria:**
- Package compiles cleanly under `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- No implicit `any` in exported types
- Optional fields use `field?: T` (not `field: T | undefined`) correctly per `exactOptionalPropertyTypes`
- Array access patterns account for `noUncheckedIndexedAccess` (returns `T | undefined`)

### US-3: Type-safe element queries

As a developer writing assertions on capture data, I want typed helper functions for querying elements, so that I can filter by role, testid, or component with type narrowing.

**Acceptance Criteria:**
- `capture.findByTestId(id)` returns `ViewGraphNode | undefined` (not `any`)
- `capture.findByRole(role)` returns `ViewGraphNode[]` with the role field narrowed
- `capture.findByComponent(name)` returns `ViewGraphNode[]` with component field present
- Type guards exported: `isInteractive(node)`, `hasTestId(node)`, `hasComponent(node)`

### US-4: Exported types for downstream use

As a library author building on ViewGraph captures, I want all types exported from the package entry point, so that I can reference them in my own type definitions.

**Acceptance Criteria:**
- All public types exported from `@viewgraph/playwright` package root
- Types importable: `import type { ViewGraphCapture, ViewGraphNode, BoundingBox } from '@viewgraph/playwright'`
- Types versioned alongside the package (breaking type changes = major version bump)
- JSDoc comments on all exported types and their fields

## Non-Functional Requirements

- **Compatibility:** TypeScript 5.0+ (matches current ecosystem minimum)
- **No runtime cost:** Types are compile-time only - no runtime type checking or validation added
- **Backward compatible:** Existing JS users unaffected - types are additive
- **Declaration maps:** Ship `.d.ts.map` files for go-to-definition support in IDEs
- **Bundle size:** Zero increase to runtime bundle (types stripped at compile)

## Out of Scope

- Runtime validation of capture payloads (use Zod or similar separately if needed)
- Types for the MCP server's internal data structures
- Types for the browser extension's internal state
- Generating types from JSON Schema (manual types are more ergonomic)
- Supporting TypeScript < 5.0

## Research Citations

- GitHub Octoverse 2025: TypeScript overtook Python and JavaScript as #1 language
- JetBrains Developer Ecosystem 2025: TypeScript has highest perceived growth potential
- Strict TS configs are standard in enterprise and modern open-source projects
