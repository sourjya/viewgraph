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
