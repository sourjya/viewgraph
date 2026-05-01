# Framework Component Capture - Requirements

## Problem Statement

ViewGraph captures the rendered DOM generically, which works with any framework. However, agents receive CSS selectors like `div.css-xyz` instead of meaningful component names like `ProductCard`. The existing components enrichment collector detects which framework is in use but does not map component boundaries to individual DOM nodes. With React at 44.7%, Angular at 18.2%, and Vue at 17.6% (Stack Overflow 2025), 80% of users are on frameworks that expose component metadata at runtime. Surfacing component names alongside DOM nodes dramatically improves agent reasoning about UI structure.

## User Stories

### US-1: React component name capture

As a developer using React, I want ViewGraph captures to include the React component name for each DOM node, so that my AI agent can reference `<ProductCard>` instead of `div.css-xyz`.

**Acceptance Criteria:**
- Capture traversal reads `__REACT_FIBER__` (or `__reactFiber$` prefix) from DOM elements
- Component names appear in the capture payload alongside the node's selector and testid
- Anonymous/arrow function components fall back to the variable name or display `Anonymous`
- React.memo, forwardRef, and lazy-wrapped components resolve to the inner component name
- Performance: component name extraction adds < 50ms to capture time on a 500-node page

### US-2: Vue 3 component boundary capture

As a developer using Vue 3, I want ViewGraph captures to include Vue component names for each DOM node, so that my agent understands the component hierarchy.

**Acceptance Criteria:**
- Capture traversal reads `__vue_app__` and `__vueParentComponent__` from DOM elements
- Vue component names (from `name` option or filename-derived) appear in capture payloads
- Works with both Options API and Composition API components
- Handles `<script setup>` components where name is derived from the filename
- Performance: extraction adds < 50ms on a 500-node page

### US-3: Angular component capture

As a developer using Angular, I want ViewGraph captures to include Angular component names, so that my agent can map DOM elements to their Angular component class.

**Acceptance Criteria:**
- Capture traversal uses Angular DevTools protocol or `ng.getComponent()` debug API
- Angular component class names appear in capture payloads (e.g., `ProductCardComponent`)
- Works with Angular 14+ (standalone components and NgModule-based)
- Gracefully degrades when Angular is in production mode (no debug APIs available)
- Performance: extraction adds < 100ms on a 500-node page (Angular debug API is slower)

### US-4: Component data in MCP tools

As an AI agent consuming ViewGraph captures, I want component names available in tool responses, so that I can use `find_source` with component names and reference components in fix suggestions.

**Acceptance Criteria:**
- `get_page_summary` includes a `components` section listing top-level component names and counts
- `get_capture` nodes include a `component` field when a framework component is detected
- `find_source` accepts a `component` parameter and searches for component definitions
- `get_elements_by_role` results include the component name when available

### US-5: Framework detection drives extraction

As a ViewGraph user, I want component extraction to activate only for detected frameworks, so that capture performance is not impacted on plain HTML pages.

**Acceptance Criteria:**
- The existing framework detection in the components collector gates component extraction
- If no framework is detected, no component extraction runs (zero overhead)
- If multiple frameworks are detected (micro-frontends), each region uses the appropriate extractor

## Non-Functional Requirements

- **Performance:** Component extraction must not increase total capture time by more than 100ms on pages with up to 1000 nodes
- **Compatibility:** Must work in Chrome 116+ and Firefox 109+
- **Graceful degradation:** If framework internals change (fiber structure, Vue internals), capture still succeeds - component names are omitted, not errors thrown
- **Security:** Component extraction must not execute arbitrary page JavaScript or trigger side effects
- **Token efficiency:** Component names add minimal token overhead - short string per node, not full props/state

## Out of Scope

- Capturing component props or state (too large, privacy concerns)
- Svelte component capture (compile-time erasure - see documented-gaps spec)
- React Native / Expo (browser extension cannot reach native layer)
- Framework version auto-detection beyond what the components collector already provides
- Component tree visualization in the extension sidebar
- Supporting frameworks below 5% usage (Solid, Qwik, Lit, etc.)

## Research Citations

- Stack Overflow Developer Survey 2025: React 44.7%, Angular 18.2%, Vue 17.6%
- GitHub Octoverse 2025: TypeScript #1 language on GitHub
- React powers 11.2 million websites globally, used by 80% of Fortune 500 companies
