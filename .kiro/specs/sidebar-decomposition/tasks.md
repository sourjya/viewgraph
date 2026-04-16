# F14: Complete Sidebar Decomposition - Execution Plan

## Pre-Conditions
- All 1133 tests passing
- Coverage baseline: server 85.1% stmts, extension 71.4% stmts
- Feature branch: `refactor/sidebar-decomposition-v2`

## Phase 1: Event System (Foundation) - MANDATORY

All inter-module communication MUST use the event system. No direct function imports between sibling modules. Modules only import from shared utilities (selector, constants, storage) and emit/listen for events.

### Architecture

```
                    ┌─────────────────────────┐
                    │   Shadow DOM Root        │
                    │   (Event Bus)            │
                    └────────┬────────────────┘
                             │ CustomEvents
        ┌────────┬───────┬───┴───┬────────┬────────┐
        │        │       │       │        │        │
     core.js  review.js inspect.js help.js strip.js sync.js
        │        │       │       │        │        │
        └────────┴───────┴───┬───┴────────┴────────┘
                             │
                    Shared utilities only:
                    selector.js, constants.js,
                    storage.js, annotate.js,
                    annotation-types.js
```

### Communication Rules

1. **Sibling modules NEVER import each other.** review.js does not import inspect.js.
2. **All cross-module communication is via events.** If review needs to tell inspect something, it emits an event. Core or the target module listens.
3. **Shared state modules are the exception.** `annotate.js` (annotation state), `constants.js` (server discovery), `selector.js` (ATTR), `storage.js` (chrome.storage), `annotation-types.js` (type registry) can be imported by any module.
4. **Core orchestrates.** `core.js` listens for events and coordinates responses. It's the only module that imports all sub-modules.
5. **Events are namespaced.** All events use `vg:` prefix.

### Step 1.1: Create `lib/sidebar/events.js`

Event bus utilities and complete event catalog:

```js
// Event names - single source of truth
export const EVENTS = {
  REFRESH:             'vg:refresh',
  TAB_SWITCH:          'vg:tab-switch',
  ANNOTATION_ADDED:    'vg:annotation-added',
  ANNOTATION_REMOVED:  'vg:annotation-removed',
  ANNOTATION_RESOLVED: 'vg:annotation-resolved',
  ANNOTATION_SELECTED: 'vg:annotation-selected',
  CONFIG_CHANGED:      'vg:config-changed',
  HELP_TOGGLE:         'vg:help-toggle',
  SETTINGS_TOGGLE:     'vg:settings-toggle',
  CAPTURE_RECEIVED:    'vg:capture-received',
  AUDIT_RESULTS:       'vg:audit-results',
  COLLAPSE_TOGGLE:     'vg:collapse-toggle',
  DESTROY:             'vg:destroy',
};

/** Emit an event on the shadow root. */
export function emit(root, name, detail = {}) {
  root.dispatchEvent(new CustomEvent(name, { detail, bubbles: false }));
}

/** Listen for an event on the shadow root. Returns cleanup function. */
export function on(root, name, handler) {
  const wrapped = (e) => handler(e.detail);
  root.addEventListener(name, wrapped);
  return () => root.removeEventListener(name, wrapped);
}
```

Tests: emit fires, on receives detail, cleanup removes listener, unknown events don't crash.

### Step 1.2: Wire events into ALL existing cross-module calls

Replace every direct cross-module call with an event:

| Current call | Replaced with |
|---|---|
| `refresh()` from sync.js | `emit(root, EVENTS.REFRESH)` |
| `refresh()` from review.js after delete | `emit(root, EVENTS.REFRESH)` |
| `showPanel()` from review.js | `emit(root, EVENTS.ANNOTATION_SELECTED, { ann })` |
| `collapse()`/`expand()` from strip.js | `emit(root, EVENTS.COLLAPSE_TOGGLE)` |
| `hideHelpCard()` from shortcuts | `emit(root, EVENTS.HELP_TOGGLE, { visible: false })` |
| `hideSettings()` from shortcuts | `emit(root, EVENTS.SETTINGS_TOGGLE, { visible: false })` |
| `updateBadgeCount()` from refresh | `emit(root, EVENTS.REFRESH)` → strip listens |
| WS `annotation:resolved` | `emit(root, EVENTS.ANNOTATION_RESOLVED, { uuid, resolution })` |
| WS `audit:results` | `emit(root, EVENTS.AUDIT_RESULTS, { audit })` |

Core.js wires the listeners:
```js
on(root, EVENTS.REFRESH, () => { renderReview(); updateTabCount(); strip.updateCount(); });
on(root, EVENTS.ANNOTATION_SELECTED, ({ ann }) => showPanel(ann, { onChange: () => emit(root, EVENTS.REFRESH) }));
on(root, EVENTS.COLLAPSE_TOGGLE, () => collapsed ? expand() : collapse());
on(root, EVENTS.DESTROY, () => destroy());
```

Verify all 1133 tests still pass after wiring.

## Phase 2: Extract Remaining Sidebar Modules

Each step: extract → update imports → run full suite → commit.

### Step 2.1: Extract `sidebar/settings.js` (~150 lines)
**Exports:** `createSettingsScreen(context)` → `{ element, show, hide, isVisible }`
**Needs from core:** `discoverServer`, `getAgentName`, `chrome.storage`, `ATTR`
**Emits:** `vg:settings-toggle`
**Receives:** none
**Test:** settings screen renders, toggles save to storage

### Step 2.2: Extract `sidebar/inspect.js` (~500 lines)
**Exports:** `renderInspect(container, context)` → void
**Needs from core:** all collectors, `discoverServer`, `updateConfig`, `ATTR`, `getAnnotations`, `addPageNote`, `updateComment`
**Emits:** `vg:annotation-added` (when note button clicked)
**Receives:** `vg:capture-received` (to refresh)
**Contains:** `createSection()`, `refreshInspect()`, auto-audit toggle, auto-capture toggle, session recording, all diagnostic sections
**Test:** sections render, copy/note buttons work, auto-audit toggle

### Step 2.3: Extract `sidebar/captures.js` (~200 lines)
**Exports:** `renderCaptures(container, context)` → void
**Needs from core:** `discoverServer`, `ATTR`, `validateCapturePath`
**Emits:** none
**Receives:** none (called by inspect)
**Contains:** `fetchCapturesSection()`, baseline management UI
**Test:** captures render, baseline set/compare

### Step 2.4: Extract `sidebar/review.js` (~400 lines)
**Exports:** `renderReviewList(container, context)` → void
**Needs from core:** `getAnnotations`, `removeAnnotation`, `resolveAnnotation`, `showPanel`, `spotlightMarker`, `ATTR`, `activeFilter`, `activeTypeFilters`
**Emits:** `vg:refresh` (after resolve/delete)
**Receives:** `vg:refresh` (to re-render)
**Contains:** `createEntry()`, filter tabs, type filter toggles, trash button
**Test:** entries render, filters work, type toggles work, badge colors correct

### Step 2.5: Slim down `annotation-sidebar.js` to core orchestrator (~300 lines)
**Responsibilities:**
- Create shadow DOM shell (header, tabs, footer)
- Import and wire all sub-modules
- Listen for events and coordinate
- Export `create()`, `destroy()`, `refresh()`, `collapse()`, `expand()`
**No rendering logic** - all rendering delegated to sub-modules

## Phase 3: Directory Reorganization

### Step 3.1: Move collectors to `lib/collectors/`
- Move 14 `*-collector.js` files
- Update imports in: `enrichment.js`, `annotation-sidebar.js` (inspect section), `content.js`
- Run full suite

### Step 3.2: Move capture pipeline to `lib/capture/`
- Move: `traverser.js`, `serializer.js`, `salience.js`, `subtree-capture.js`, `html-snapshot.js`, `screenshot-crop.js`, `capture-validator.js`
- Update imports in: `content.js`, `enrichment.js`
- Run full suite

### Step 3.3: Move session modules to `lib/session/`
- Move: `session-manager.js`, `journey-recorder.js`, `continuous-capture.js`, `auto-capture.js`, `hmr-detector.js`
- Update imports in: `content.js`, `annotation-sidebar.js`
- Run full suite

### Step 3.4: Move export modules to `lib/export/`
- Move: `export-markdown.js`, `export-zip.js`
- Update imports in: `annotation-sidebar.js`, `content.js`
- Run full suite

### Step 3.5: Move UI components to `lib/ui/`
- Move: `element-flash.js`, `element-diagnostics.js`, `keyboard-shortcuts.js`
- Extract from `annotation-panel.js`: `chip-select.js`, `diagnostic-preview.js`
- Update imports
- Run full suite

## Phase 4: Test Reorganization

### Step 4.1: Create shared test helpers
- `tests/unit/sidebar/helpers.js` - chrome mocks, shadow DOM queries, `mockFetchWith`
- `tests/unit/helpers.js` - shared element factories, annotation factories

### Step 4.2: Split `annotation-sidebar.test.js` (58 tests)
| New file | Source describe blocks | Tests |
|---|---|---|
| `sidebar/core.test.js` | creation, destroy, shadow DOM | ~5 |
| `sidebar/review.test.js` | annotation list, filters, type badges, pending | ~20 |
| `sidebar/inspect.test.js` | section copy/note, auto-audit, diagnostic notes | ~15 |
| `sidebar/captures.test.js` | captures section, baselines | ~5 |
| `sidebar/settings.test.js` | settings link | ~2 |
| `sidebar/help.test.js` | help card | ~3 |
| `sidebar/strip.test.js` | collapsed strip | ~3 |
| `sidebar/events.test.js` | event system | ~5 |

### Step 4.3: Move collector tests to `tests/unit/collectors/`
### Step 4.4: Move capture tests to `tests/unit/capture/`
### Step 4.5: Move session tests to `tests/unit/session/`

## Phase 5: Coverage Improvement

### Step 5.1: Run coverage reports
```bash
npm run coverage:server
npm run coverage:ext
```

### Step 5.2: Compare against baseline
| Metric | Before | Target |
|---|---|---|
| Server statements | 85.1% | 85%+ |
| Extension statements | 71.4% | 80%+ |
| Extension functions | 61.7% | 75%+ |
| Extension branches | 64.1% | 70%+ |

### Step 5.3: Write targeted tests for uncovered paths
- Focus on newly exposed module functions
- Each extracted module should have 80%+ statement coverage
- Document final numbers in `docs/architecture/project-metrics.md`

## Verification Checklist (after each step)

- [ ] `npm run build:ext` succeeds
- [ ] `npm run test:ext` - all tests pass
- [ ] `npm run test:server` - all tests pass
- [ ] `npm run lint` - 0 errors
- [ ] Test count unchanged or increased
- [ ] No circular imports (build would fail)
- [ ] Commit on feature branch with descriptive message

## Estimated Total Effort

| Phase | Steps | Hours |
|---|---|---|
| Phase 1: Event system | 2 | 1-2 |
| Phase 2: Module extraction | 5 | 4-6 |
| Phase 3: Directory reorg | 5 | 2-3 |
| Phase 4: Test reorg | 5 | 2-3 |
| Phase 5: Coverage | 3 | 2-3 |
| **Total** | **20** | **11-17** |
