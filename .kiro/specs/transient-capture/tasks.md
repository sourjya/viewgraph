# F20: Transient UI State Capture - Tasks

## Phase 1: Mutation Buffer + Toast Detection

### Task 1.1: Create transient-collector.js skeleton
- [ ] Create `extension/lib/collectors/transient-collector.js`
- [ ] Export `startTransientObserver()`, `stopTransientObserver()`, `collectTransient()`
- [ ] Module-level state: buffer array, observer ref, elementTimestamps map
- [ ] `resetTransient()` for tests
- **Deliverable:** File exists, exports work, no logic yet
- **Test:** `extension/tests/unit/collectors/transient-collector.test.js` - exports exist

### Task 1.2: RED - Mutation buffer tests
- [ ] Test: added elements appear in buffer with selector and text
- [ ] Test: removed elements appear in buffer
- [ ] Test: buffer limited to 100 entries (FIFO eviction)
- [ ] Test: buffer clears after 30s retention
- [ ] Test: ViewGraph UI mutations (`[data-vg-annotate]`) are excluded
- [ ] Test: stopTransientObserver clears buffer and disconnects
- **Deliverable:** 6 failing tests

### Task 1.3: GREEN - Implement mutation buffer
- [ ] MutationObserver on `document.body` with `childList: true, subtree: true`
- [ ] On added nodes: push to buffer with timestamp, selector (via `ue()` from collector-utils), text (first 100 chars)
- [ ] On removed nodes: push removal entry, calculate lifespan from elementTimestamps
- [ ] Filter: skip nodes inside `[data-vg-annotate]`
- [ ] Eviction: shift oldest when buffer > 100
- [ ] Retention: on each push, evict entries older than 30s
- **Deliverable:** 6 tests pass

### Task 1.4: RED - Toast heuristic tests
- [ ] Test: element with position:fixed + z-index > 100 is flagged as toast
- [ ] Test: toast styles are captured immediately on add
- [ ] Test: aria-live presence is checked on element and ancestors
- [ ] Test: element with position:static is NOT flagged as toast
- [ ] Test: element inside [data-vg-annotate] is NOT flagged
- **Deliverable:** 5 failing tests

### Task 1.5: GREEN - Implement toast heuristic
- [ ] On added node: check `getComputedStyle` for position + z-index
- [ ] If matches: capture styles object (position, zIndex, opacity, top/right/bottom/left)
- [ ] Walk ancestors for `aria-live` attribute or `role="alert"`/`role="status"`
- [ ] Store in buffer entry: `isToast: true`, `styles`, `ariaLive`, `role`
- **Deliverable:** 5 tests pass

### Task 1.6: RED - Issue analyzer tests (toast-no-aria-live, flash-content)
- [ ] Test: collectTransient() returns issue for toast without aria-live
- [ ] Test: collectTransient() does NOT flag toast with aria-live ancestor
- [ ] Test: collectTransient() returns flash-content issue for element with lifespan < 500ms
- [ ] Test: collectTransient() does NOT flag element with lifespan > 500ms
- [ ] Test: issues have correct type, severity, message, selector, evidence
- **Deliverable:** 5 failing tests

### Task 1.7: GREEN - Implement issue analyzer
- [ ] `collectTransient()` iterates buffer
- [ ] Pairs add/remove entries by selector to calculate lifespans
- [ ] Checks toast entries for aria-live → generates `toast-no-aria-live` issue
- [ ] Checks lifespan < 500ms with text → generates `flash-content` issue
- [ ] Returns `{ issues, timeline, animations: [], summary }`
- [ ] Timeline entries have relative timestamps (ms before capture)
- **Deliverable:** 5 tests pass

### Task 1.8: Integration - wire into enrichment and sidebar
- [ ] Add `transient: collectTransient()` to `collectAllEnrichment()` in enrichment.js
- [ ] Call `startTransientObserver()` in annotation-sidebar.js `create()`
- [ ] Call `stopTransientObserver()` in annotation-sidebar.js `destroy()`
- [ ] Add transient section to diagnostics.js (after existing sections)
- [ ] Section shows issue count badge, each issue with Copy/Note buttons
- **Deliverable:** Transient data appears in captures, Inspect tab shows section

---

## Phase 2: Animation Analysis

### Task 2.1: RED - Animation snapshot tests
- [ ] Test: collectTransient() includes running animations
- [ ] Test: animation entry has selector, name, duration, progress, properties
- [ ] Test: animation using `top` is flagged as layout trigger
- [ ] Test: animation using `transform` is NOT flagged
- [ ] Test: graceful fallback when getAnimations() unavailable
- **Deliverable:** 5 failing tests

### Task 2.2: GREEN - Implement animation snapshot
- [ ] In `collectTransient()`: call `document.getAnimations()` (guarded)
- [ ] For each animation: extract target selector, animationName, duration, progress
- [ ] Extract animated properties from keyframes
- [ ] Check against layout-trigger set: top, left, right, bottom, width, height, margin*, padding*
- [ ] Generate `animation-jank` issue for layout-triggering animations
- **Deliverable:** 5 tests pass

---

## Phase 3: Pattern Detection

### Task 3.1: RED - Rapid reflow tests
- [ ] Test: same selector added/removed 3+ times in 5s flagged as rapid-reflow
- [ ] Test: 2 times is NOT flagged
- [ ] Test: 3 times across 10s is NOT flagged (outside 5s window)
- **Deliverable:** 3 failing tests

### Task 3.2: GREEN - Implement rapid reflow detection
- [ ] In issue analyzer: group buffer entries by selector
- [ ] Count add/remove pairs within 5s windows
- [ ] Generate `rapid-reflow` issue when count >= 3
- **Deliverable:** 3 tests pass

### Task 3.3: REFACTOR - Extract shared utilities
- [ ] Extract toast heuristic into testable pure function
- [ ] Extract timeline builder into testable pure function
- [ ] Ensure all functions are documented per code commenting standards

---

## Security Checkpoint

- [ ] Verify no user page data leaks into extension storage (buffer is memory-only)
- [ ] Verify buffer is cleared on destroy (no stale data across pages)
- [ ] Verify toast style capture doesn't trigger layout thrashing
- [ ] Verify no innerHTML usage in diagnostics section rendering
- [ ] Run Tier 1 pre-commit check on all new files
