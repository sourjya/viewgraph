# Playwright Python Fixture - Tasks

## Phase 1: Package Structure + Bundle

- [x] Task 1: Create `packages/playwright-python/` directory structure
- [ ] Task 2: Write `pyproject.toml` with metadata
- [ ] Task 3: Create `__init__.py` with public API exports
- [ ] Task 4: Implement bundle loader (`_bundle.py`)
- [ ] Task 5: Copy pre-built JS bundle as package data

## Phase 2: Core Implementation (TDD)

- [ ] Task 6: Write failing tests for `ViewGraphPage.capture()`
- [ ] Task 7: Implement `ViewGraphPage.capture()`
- [ ] Task 8: Write failing tests for `ViewGraphPage.annotate()`
- [ ] Task 9: Implement `ViewGraphPage.annotate()`
- [ ] Task 10: Write failing tests for `ViewGraphPage.snapshot()`
- [ ] Task 11: Implement `ViewGraphPage.snapshot()`
- [ ] Task 12: Write failing test for `capture_with_annotations()`
- [ ] Task 13: Implement `capture_with_annotations()`

## Phase 3: Pytest Integration

- [ ] Task 14: Write failing test for `viewgraph` fixture
- [ ] Task 15: Implement conftest.py with fixture + auto-capture-on-fail hook
- [ ] Task 16: Write test for `@pytest.mark.viewgraph(capture_on_fail=False)` marker

## Phase 4: Verification

- [ ] Task 17: Verify capture format matches TypeScript fixture output
- [ ] Task 18: Run full test suite (Python + existing 1850 JS tests)
- [ ] Task 19: Commit, merge to main, push
