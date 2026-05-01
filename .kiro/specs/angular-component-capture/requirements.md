# Angular Component Capture - Requirements

## Problem Statement

Angular holds 18.2% usage (Stack Overflow 2025) and is the enterprise default for regulated industries - finance, healthcare, government. These enterprise teams have the highest willingness to pay for developer tooling and are highly likely to adopt AI agents for productivity. Angular's strict TypeScript-first architecture means component metadata is available at runtime via the Angular DevTools protocol and `ng.getComponent()` debug API. ViewGraph's generic DOM capture misses this component context entirely, making it less useful for the 18.2% of developers on Angular. This pairs with the Spring Boot backend story for full enterprise stack coverage.

## User Stories

### US-1: Angular component name capture

As an Angular developer, I want ViewGraph captures to include the Angular component class name for each DOM element, so that my AI agent references `ProductCardComponent` instead of `app-product-card` or a generic selector.

**Acceptance Criteria:**
- Capture traversal uses `ng.getComponent(element)` to retrieve the component instance
- Component class name extracted from the constructor name
- Component names appear in capture node's `component` field
- Works with Angular 14, 15, 16, 17, and 18 (standalone and NgModule-based)
- Handles elements that are not component hosts (directives, plain elements) gracefully

### US-2: Component hierarchy in captures

As an AI agent, I want to understand the Angular component tree structure, so that I can suggest fixes at the correct component level.

**Acceptance Criteria:**
- Parent-child component relationships are captured in the `relations` section
- Each component host element links to its parent component host
- The component tree is derivable from the capture without additional API calls
- Lazy-loaded components are captured when they are rendered in the DOM

### US-3: Graceful degradation in production mode

As a developer who sometimes captures production builds, I want ViewGraph to still produce useful captures when Angular debug APIs are unavailable, so that captures never fail.

**Acceptance Criteria:**
- When `ng.getComponent()` is not available (production mode), capture proceeds without component names
- Capture metadata includes `angularDebugAvailable: false` to explain the absence
- No errors thrown or logged when debug APIs are missing
- The extension sidebar shows a hint: "Enable Angular debug mode for component names"

### US-4: Angular-specific source linking

As a developer fixing an Angular component, I want `find_source` to locate the component's `.ts` file from its class name, so that I can navigate directly to the source.

**Acceptance Criteria:**
- `find_source` with `component: "ProductCardComponent"` finds `product-card.component.ts`
- Handles Angular naming conventions: kebab-case filename, PascalCase class name
- Works with both standalone components and NgModule-declared components
- Falls back to grep-based search if naming convention doesn't match

### US-5: Directive and pipe detection

As an Angular developer, I want structural directives (`*ngIf`, `*ngFor`, `@if`, `@for`) and applied directives to be noted in captures, so that my agent understands conditional rendering.

**Acceptance Criteria:**
- Elements with structural directives have a `directives` field listing applied directive names
- New control flow syntax (`@if`, `@for`, `@switch`) is detected from comment nodes
- Attribute directives (e.g., `[ngClass]`, custom directives) are listed when debug info is available
- This is best-effort - missing directive info does not degrade the capture

## Non-Functional Requirements

- **Performance:** Component extraction adds < 100ms on a 1000-node Angular app (Angular debug API is synchronous but slower than React fiber traversal)
- **Compatibility:** Angular 14+ (covers 95%+ of active Angular projects)
- **Browser support:** Chrome 116+ and Firefox 109+
- **No Angular dependency:** The extension does not import Angular packages - it reads runtime debug APIs only
- **Security:** No execution of arbitrary code - only reads component metadata from debug globals

## Out of Scope

- Capturing component inputs/outputs values (too large, privacy concerns)
- AngularJS (1.x) support (end of life, < 1% of new projects)
- Angular Universal / SSR component capture (server-rendered HTML has no debug APIs)
- Modifying Angular's production build to expose debug info
- Integration with Angular DevTools Chrome extension (separate tool, different purpose)

## Research Citations

- Stack Overflow 2025: Angular 18.2% usage, enterprise default for regulated industries
- Angular teams are highly likely to use AI agents for productivity
- Enterprise segment has highest willingness to pay for developer tooling
- Angular + Spring Boot is the dominant enterprise full-stack pairing
