# Architecture Modularity Audit

**Date:** 2026-04-16
**Scope:** Extension (7,236 lines across 42 files) + Server (5,281 lines across 59 files)

## Executive Summary

The codebase is functional and well-tested (1107 tests) but has grown organically. The main architectural debt is in the extension, where `annotation-sidebar.js` (2,268 lines, 31 functions, 21 imports) has become a god module handling UI rendering, state management, network calls, settings, diagnostics, and tab switching. The server side is better structured but has its own patterns worth improving.

---

## Problem Areas

### 1. annotation-sidebar.js - God Module (Critical)

**Current:** 2,268 lines, 31 functions, 21 imports. Handles:
- Sidebar creation and DOM structure
- Help card rendering
- Settings screen
- Review tab (annotation list, filters, entry rendering)
- Inspect tab (diagnostics, captures, baselines, auto-audit)
- Collapsed strip
- Keyboard shortcut wiring
- WS connection and message handling
- Resolution polling
- Capture request polling
- Tab switching
- Badge count updates

**Proposed decomposition:**

| New Module | Responsibility | Est. Lines |
|---|---|---|
| `sidebar-core.js` | Shell: create/destroy shadow DOM, header, tabs, collapse/expand | ~200 |
| `sidebar-review.js` | Review tab: annotation list, entry rendering, filters | ~400 |
| `sidebar-inspect.js` | Inspect tab: diagnostics, sections, copy/note buttons | ~500 |
| `sidebar-captures.js` | Captures section + baseline management | ~200 |
| `sidebar-settings.js` | Settings screen rendering | ~150 |
| `sidebar-help.js` | Help card with shortcuts | ~100 |
| `sidebar-strip.js` | Collapsed strip with mode icons | ~150 |
| `sidebar-sync.js` | Resolution polling, request polling, WS handlers | ~150 |

**Pattern:** Each module exports `render(container, context)` and `destroy()`. The core module orchestrates them.

### 2. annotation-panel.js - Growing Complexity (Medium)

**Current:** 420 lines. Handles comment editing, severity/category chips, idea toggle, diagnostic attachment, smart suggestions, positioning.

**Proposed:** Extract chip-select widget into `ui/chip-select.js` (reusable). Extract diagnostic attachment into `ui/diagnostic-preview.js`. Panel stays as orchestrator.

### 3. http-receiver.js - Route Sprawl (Medium)

**Current:** 425 lines, 16 endpoints in one `handleRequest` function with a chain of `if (method === ... && url === ...)` blocks.

**Proposed:** Router pattern:

```js
// routes/config.js
export function registerConfigRoutes(router, capturesDir) {
  router.get('/config', async (req, res) => { ... });
  router.put('/config', async (req, res) => { ... });
}
```

Each route file handles one domain. `http-receiver.js` becomes a thin shell that registers routes.

### 4. server/index.js - Registration Boilerplate (Low)

**Current:** 36 individual import + register calls. 72 lines of boilerplate.

**Proposed:** Auto-discovery:

```js
const toolFiles = await glob('src/tools/*.js');
for (const file of toolFiles) {
  const { register } = await import(file);
  register(server, indexer, capturesDir, options);
}
```

All tools follow the same `register(server, indexer, capturesDir, options?)` signature already.

### 5. Collector Pattern - No Base Class (Low)

**Current:** 14 collectors each export a standalone function. No shared interface, no error handling contract (safeCollect wraps externally).

**Proposed:** Base collector class:

```js
class Collector {
  constructor(name) { this.name = name; }
  collect() { throw new Error('Not implemented'); }
  safe() { try { return this.collect(); } catch { return this.fallback(); } }
  fallback() { return null; }
}
```

Each collector extends it. `enrichment.js` calls `.safe()` on each. But this is low priority - the current pattern works and collectors are simple.

---

## What NOT to Refactor

| Area | Why Leave It |
|---|---|
| Tool files (36 files) | Each is small, focused, follows the same pattern. No benefit from classes. |
| Analysis modules | Pure functions, well-scoped. Composition over inheritance is correct here. |
| Selector/storage/constants | Small utility modules. Already clean. |
| Test files | Mirror source structure. Refactoring source means moving tests too - do together. |

---

## Recommended Priority

| Priority | Refactor | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | Split annotation-sidebar.js | High - unblocks all sidebar work | Large (8-10h) | Medium - many tests to update |
| 2 | Router pattern for http-receiver.js | Medium - cleaner endpoint management | Small (2-3h) | Low |
| 3 | Auto-discovery for tool registration | Low - reduces boilerplate | Small (1h) | Low |
| 4 | Extract chip-select widget | Low - reusability | Small (1h) | Low |
| 5 | Collector base class | Low - consistency | Medium (3-4h) | Low |

---

## Implementation Approach

The sidebar split (#1) should be done as a dedicated refactor branch with no feature changes. Steps:

1. Create `extension/lib/sidebar/` directory
2. Extract one module at a time, starting with the most independent (help, strip, settings)
3. Update imports in the core module after each extraction
4. Run full test suite after each extraction
5. The core module shrinks from 2,268 lines to ~300 lines

The key constraint: all modules share access to the sidebar's shadow DOM and annotation state. The core module passes these as context to each sub-module's `render()` function.


## Test Reorganization

The sidebar split requires parallel test reorganization. Currently `annotation-sidebar.test.js` is 58 tests in one file (the largest test file in the extension). It must be split to mirror the new module structure.

### Current state
- `extension/tests/unit/annotation-sidebar.test.js` - 58 tests covering creation, tabs, filters, severity, MCP disconnect, captures, baselines, pending state, keyboard shortcuts, collapsed strip, help card, settings, section copy/note buttons, auto-audit, annotation type badges, diagnostic notes

### Proposed split

| New test file | Mirrors | Tests (approx) |
|---|---|---|
| `tests/unit/sidebar/core.test.js` | `sidebar/core.js` | Creation, destroy, shadow DOM, header, tab switching |
| `tests/unit/sidebar/review.test.js` | `sidebar/review.js` | Annotation list, entry rendering, filters, type badges, pending state |
| `tests/unit/sidebar/inspect.test.js` | `sidebar/inspect.js` | Diagnostics, section copy/note buttons, auto-audit, auto-capture |
| `tests/unit/sidebar/captures.test.js` | `sidebar/captures.js` | Captures section, baselines |
| `tests/unit/sidebar/settings.test.js` | `sidebar/settings.js` | Settings screen |
| `tests/unit/sidebar/help.test.js` | `sidebar/help.js` | Help card, shortcuts display |
| `tests/unit/sidebar/strip.test.js` | `sidebar/strip.js` | Collapsed strip, badge count, mode icons |
| `tests/unit/sidebar/sync.test.js` | `sidebar/sync.js` | Resolution polling, WS handlers |

### Why split tests alongside source

1. **One test file per source file** - project convention (see `.kiro/steering/file-naming.md`). A 58-test monolith violates this.
2. **Faster feedback** - running `tests/unit/sidebar/inspect.test.js` takes seconds vs running the full sidebar test file.
3. **Ownership clarity** - when a sidebar module changes, the developer knows exactly which test file to update.
4. **Shared test fixtures** - extract common setup (chrome mocks, shadow DOM helpers, `mockFetchWith`) into `tests/unit/sidebar/helpers.js`. Currently duplicated across test sections.
5. **Parallel execution** - Vitest runs test files in parallel. 8 small files run faster than 1 large file.

### Migration approach

1. Create `tests/unit/sidebar/helpers.js` with shared mocks and utilities
2. Move tests one describe block at a time, updating imports
3. Run full suite after each move to catch breakage
4. Delete the monolith only after all tests are migrated
5. Verify test count matches before and after (currently 58 sidebar tests)


## Annotation Type Architecture

### Current Problem

Annotation type detection is scattered across 5+ files using ad-hoc field checks:

```js
// annotation-sidebar.js (badge rendering)
if (ann.diagnostic) { ... }
else if ((ann.category || '').includes('idea')) { ... }
else if (ann.type === 'page-note') { ... }
else { ... }

// annotation-panel.js (severity hiding)
const isIdea = (ann.category || '').includes('idea');
severityChip.style.display = isIdea ? 'none' : 'inline-block';

// annotate.js (serialization)
...(diagnostic ? { diagnostic } : {}), ...(pending ? { pending } : {})

// content.js (capture serialization)
...(a.diagnostic ? { diagnostic: a.diagnostic } : {})
```

Every new annotation type requires changes in all these locations. The `diagnostic` persistence bug (missing from two serialization points) was a direct consequence of this scattered approach.

### Option A: Class Inheritance (Rejected)

```js
class Annotation { ... }
class ElementAnnotation extends Annotation { ... }
class IdeaAnnotation extends Annotation { ... }
class DiagnosticAnnotation extends Annotation { ... }
```

**Why rejected:**
1. **Serialization boundary** - Annotations cross `chrome.runtime.sendMessage()`, `chrome.storage`, and HTTP POST to the server. All three serialize to plain JSON. Class instances don't survive these boundaries - you'd need `toJSON()` + `fromJSON()` factory methods at every crossing point, adding complexity instead of reducing it.
2. **Paradigm mismatch** - The entire codebase is functional (pure functions + plain objects). Introducing class hierarchies creates two paradigms that developers must context-switch between.
3. **Collector/tool compatibility** - 14 enrichment collectors and 36 MCP tools all expect plain objects. Changing the annotation shape ripples across 50+ files.
4. **Inheritance fragility** - Annotation types aren't a clean hierarchy. An idea can also be a page note. A diagnostic can be resolved. Inheritance forces single-parent classification; annotations have overlapping traits.

### Option B: Type Registry + Factory (Recommended)

A single `annotation-types.js` module that centralizes all type-specific behavior:

```js
// extension/lib/annotation-types.js

const TYPES = {
  element:      { badge: (ann) => MARKER_COLORS[(ann.id - 1) % MARKER_COLORS.length],
                  icon: null, hasSeverity: true, label: 'Bug' },
  region:       { badge: (ann) => MARKER_COLORS[(ann.id - 1) % MARKER_COLORS.length],
                  icon: null, hasSeverity: true, label: 'Region' },
  'page-note':  { badge: () => '#0ea5e9', icon: PAGE_ICON_SVG,
                  hasSeverity: true, label: 'Note' },
  idea:         { badge: () => '#eab308', icon: LIGHTBULB_SVG,
                  hasSeverity: false, label: 'Idea' },
  diagnostic:   { badge: () => '#0d9488', icon: TERMINAL_SVG,
                  hasSeverity: false, label: 'Diagnostic' },
};

/** Resolve annotation type from its properties. Single source of truth. */
export function resolveType(ann) {
  if (ann.diagnostic) return 'diagnostic';
  if ((ann.category || '').includes('idea')) return 'idea';
  if (ann.type === 'page-note') return 'page-note';
  if (ann.nids?.length > 1) return 'region';
  return 'element';
}

export function getBadgeColor(ann) { return TYPES[resolveType(ann)].badge(ann); }
export function getBadgeIcon(ann) { return TYPES[resolveType(ann)].icon; }
export function hasSeverity(ann) { return TYPES[resolveType(ann)].hasSeverity; }
export function getTypeLabel(ann) { return TYPES[resolveType(ann)].label; }

/** Fields to serialize for each type. Prevents missing-field bugs. */
const EXTRA_FIELDS = {
  diagnostic: ['diagnostic'],
  idea: [],
  'page-note': [],
  region: [],
  element: [],
};

export function serializeAnnotation(ann) {
  const base = { id: ann.id, uuid: ann.uuid, type: ann.type, region: ann.region,
    comment: ann.comment, severity: ann.severity, category: ann.category,
    nids: ann.nids, ancestor: ann.ancestor, element: ann.element,
    timestamp: ann.timestamp, resolved: ann.resolved, resolution: ann.resolution };
  const extras = EXTRA_FIELDS[resolveType(ann)] || [];
  for (const field of extras) { if (ann[field] !== undefined) base[field] = ann[field]; }
  if (ann.pending) base.pending = true;
  return base;
}
```

**Why this approach:**

1. **Plain objects preserved** - Annotations remain plain JSON objects. No serialization boundary issues. `chrome.runtime.sendMessage()`, `chrome.storage`, and HTTP POST all work unchanged.
2. **Single source of truth** - `resolveType()` replaces all scattered `if (ann.diagnostic)` / `if (ann.category.includes('idea'))` checks. One function, one place to update.
3. **Serialization safety** - `serializeAnnotation()` knows every type's extra fields. The `diagnostic` persistence bug becomes impossible - the type registry declares which fields each type needs.
4. **New types are one-line additions** - Adding a new annotation type means adding one entry to `TYPES` and optionally one entry to `EXTRA_FIELDS`. No changes to sidebar, panel, or content script.
5. **Composable traits** - An annotation can be both an idea and a page note. `resolveType()` handles priority ordering. No inheritance diamond problem.
6. **Testable in isolation** - `resolveType()`, `getBadgeColor()`, `hasSeverity()` are pure functions. Easy to unit test without DOM or chrome mocks.
7. **Gradual migration** - Can be introduced incrementally. Replace one `if (ann.diagnostic)` check at a time with `resolveType(ann) === 'diagnostic'`. No big-bang refactor needed.

### Migration Plan

1. Create `extension/lib/annotation-types.js` with the type registry
2. Replace badge rendering in `annotation-sidebar.js` with `getBadgeColor()` / `getBadgeIcon()`
3. Replace severity hiding in `annotation-panel.js` with `hasSeverity()`
4. Replace serialization in `annotate.js` and `content.js` with `serializeAnnotation()`
5. Add comprehensive tests for `annotation-types.js` (type resolution, serialization, edge cases)
6. Grep for remaining `ann.diagnostic` / `ann.category.includes('idea')` checks and replace

This should be done as part of the F14 sidebar decomposition, not as a separate effort.
