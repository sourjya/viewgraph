# Merge Inspect + Review - Tasks

**ADR:** [ADR-006](../../../docs/decisions/ADR-006-merge-inspect-review.md)
**Branch:** `feat/unified-annotate-mode`

## Phase 1: Unified state machine

- [ ] 1.1 Create `lib/annotate.js` - single state machine with `start()`, `stop()`, `isActive()`
  - Hover-to-highlight (from inspector)
  - Click-to-freeze + open comment panel (new)
  - Shift+drag region select + open comment panel (from review)
  - Escape to exit
  - Manages annotations array, markers, persistence
- [ ] 1.2 Write tests for annotate.js - hover, click-freeze, shift-drag, escape, annotation CRUD
- [ ] 1.3 Migrate `copySelector` and `bestSelector` into annotate.js (or shared util)

## Phase 2: Popup and wiring

- [ ] 2.1 Update popup HTML - replace Inspect + Review buttons with single "Annotate" button
- [ ] 2.2 Update popup.js - send `toggle-annotate` message
- [ ] 2.3 Update content.js - handle `toggle-annotate`, remove `toggle-inspect` and `toggle-review`
- [ ] 2.4 Update content.js capture handler - exit annotate mode before capture

## Phase 3: Annotation panel integration

- [ ] 3.1 On click-freeze: open annotation panel anchored to element, create annotation with element's subtree context
- [ ] 3.2 On shift+drag: open annotation panel anchored to region (existing behavior)
- [ ] 3.3 Copy selector stays as utility button on frozen element (below comment panel)
- [ ] 3.4 Sidebar shows both click and region annotations uniformly

## Phase 4: Cleanup

- [ ] 4.1 Remove `lib/inspector.js` (functionality absorbed into annotate.js)
- [ ] 4.2 Remove `lib/review.js` (functionality absorbed into annotate.js)
- [ ] 4.3 Update imports in content.js, annotation-sidebar.js, annotation-panel.js
- [ ] 4.4 Remove/rewrite inspector.test.js and review.test.js into annotate.test.js
- [ ] 4.5 Update changelog and ADR status to "Accepted"

## Phase 5: Verify

- [ ] 5.1 All tests pass (target: maintain 260+ total)
- [ ] 5.2 Build succeeds for Chrome
- [ ] 5.3 Manual test: click element -> comment -> send -> verify in MCP
- [ ] 5.4 Manual test: shift+drag -> comment -> send -> verify in MCP
- [ ] 5.5 Manual test: annotations persist across page refresh
