# Documented Capture Gaps - Requirements

## Problem Statement

ViewGraph works with any web framework via generic DOM capture, but certain platforms have fundamental limitations that prevent full component-level capture. React Native/Expo renders native views outside the browser - the extension cannot reach the native layer. Svelte compiles away its component tree at build time, leaving no runtime metadata to extract. Users on these platforms will ask "does ViewGraph work with X?" and find no answer. Documenting gaps explicitly prevents user frustration, shows transparency, and sets correct expectations. Svelte has 62.4% admiration from 7.2% usage (Stack Overflow 2025) - a fast-growing segment that will ask. React Native is the dominant mobile framework.

## User Stories

### US-1: React Native / Expo gap documentation

As a React Native developer evaluating ViewGraph, I want to quickly understand what works and what doesn't, so that I don't waste time trying to capture native views.

**Acceptance Criteria:**
- Documentation page explains: browser extension captures web DOM only, not native views
- Clearly states what DOES work: React Native Web (renders to DOM), Expo Web
- Clearly states what DOES NOT work: native iOS/Android views, Metro bundler output
- Suggests workaround: use ViewGraph for the web version of the app if one exists
- Listed in the FAQ and "How It Works" sections of the docs

### US-2: Svelte gap documentation

As a Svelte developer evaluating ViewGraph, I want to understand why component names aren't captured, so that I know it's a platform limitation and not a bug.

**Acceptance Criteria:**
- Documentation explains: Svelte compiles components to vanilla JS/DOM at build time
- No `__SVELTE_COMPONENT__` or equivalent runtime metadata exists to read
- DOM capture still works fully - only component name mapping is unavailable
- Suggests workaround: use `data-testid` attributes for element identification
- Notes that SvelteKit pages render standard HTML that ViewGraph captures normally

### US-3: Limitations page in docs

As any developer evaluating ViewGraph, I want a single "Known Limitations" page listing all capture gaps, so that I can quickly check if my stack is supported.

**Acceptance Criteria:**
- New page at `docs/` or GitBook: "Known Limitations" or "Platform Compatibility"
- Table format: Platform | What Works | What Doesn't | Workaround
- Includes: React Native, Svelte, cross-origin iframes, closed Shadow DOM, Canvas/WebGL
- Links to relevant specs or issues for platforms where support is planned
- Updated whenever a new gap is identified or resolved

### US-4: Extension sidebar messaging

As a user who captured a page with known limitations, I want the extension to surface relevant context, so that I understand partial results.

**Acceptance Criteria:**
- If framework detection identifies Svelte: sidebar shows info note "Svelte component names unavailable (compile-time erasure)"
- If the page has no framework detected but has React Native web markers: no special messaging needed (it works)
- Messages are informational only - never block capture
- Messages link to the full limitations documentation

### US-5: MCP tool responses include gap context

As an AI agent, I want capture metadata to indicate known limitations for the detected framework, so that I don't suggest impossible fixes.

**Acceptance Criteria:**
- Capture metadata includes `knownLimitations: string[]` when applicable
- Example: `["svelte-no-component-names"]` for Svelte pages
- `get_page_summary` surfaces limitations in its response
- Agent prompts (vg-help) reference the limitations page

## Non-Functional Requirements

- **Accuracy:** All documented limitations must be technically verified, not assumed
- **Maintenance:** Limitations page must be updated when new framework support ships
- **Discoverability:** Limitations must be findable from README, FAQ, and GitBook navigation
- **Tone:** Factual and helpful, not apologetic - frame as "here's what works and what's coming"

## Out of Scope

- Building workarounds or partial support for the documented gaps
- React Native native view capture (requires a fundamentally different architecture)
- Svelte compiler plugin for component metadata injection
- Supporting every niche framework (Solid, Qwik, Lit, Alpine, HTMX) - only document gaps users actually ask about
- Performance benchmarks for unsupported platforms

## Research Citations

- Stack Overflow 2025: Svelte 62.4% admiration from 7.2% usage - fast-growing segment
- React Native is the dominant cross-platform mobile framework
- Svelte compiles away component tree at build time - no runtime metadata available
- Cross-origin iframes and closed Shadow DOM are existing documented blind spots in ViewGraph
