# F14: Complete Sidebar Decomposition - Execution Plan

## Pre-Conditions
- All 1133 tests passing
- Coverage baseline: server 85.1% stmts, extension 71.4% stmts
- Feature branch: `refactor/sidebar-decomposition-v2`

## Phase 1: Event System (Foundation)

Before extracting tightly coupled modules, implement the CustomEvent system on the shadow DOM root.

### Step 1.1: Create `sidebar/events.js`
- Define event names: `vg:refresh`, `vg:tab-switch`, `vg:annotation-added`, `vg:annotation-resolved`, `vg:config-changed`, `vg:help-toggle`, `vg:settings-toggle`, `vg:capture-received`
- Export `emit(shadowRoot, name, detail)` and `on(shadowRoot, name, handler)` helpers
- Tests: event dispatch and listener registration

### Step 1.2: Wire events into existing code
- Replace direct `refresh()` calls from sub-modules with `emit('vg:refresh')`
- Core listens for `vg:refresh` and calls `refresh()`
- Verify all 1133 tests still pass

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
