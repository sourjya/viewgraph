# Playwright Python Fixture - Design

## Architecture

Python wrapper around the same JS bundle that `@viewgraph/playwright` (TypeScript) uses. The DOM traversal, scoring, and serialization all run as JavaScript inside the browser via `page.evaluate()`. Python orchestrates injection, capture timing, file I/O, and pytest integration.

```
pytest test_checkout.py
  └─ viewgraph fixture (conftest.py)
       └─ ViewGraphPage(page)
            ├─ capture(label?) → page.add_script_tag(bundle.js) → page.evaluate(__vg.*)
            ├─ annotate(selector, comment) → page.evaluate(querySelector + getBoundingClientRect)
            └─ auto-capture on failure → pytest_runtest_makereport hook
                                           └─ writes .viewgraph/captures/*.json
```

## Bundle Strategy

The JS bundle is the same code used by `@viewgraph/playwright` (TypeScript). Two loading paths:

1. **Repo context:** Read `packages/playwright/bundle-prebuilt.js` and extract the IIFE string
2. **PyPI install context:** Ship `_bundle.js` as package data (copied from TS build during release)

The bundle exposes `window.__vg` with `traverseDOM`, `scoreAll`, `serialize`, `captureSnapshot`.

## Key Classes

### ViewGraphPage

Wraps a Playwright `Page` object. Manages bundle injection and capture lifecycle.

```python
class ViewGraphPage:
    def __init__(self, page: Page, captures_dir: Path)
    async def capture(self, label: str | None = None) -> dict
    async def annotate(self, selector: str, comment: str, severity: str = "major") -> dict
    async def snapshot(self) -> str
    async def capture_with_annotations(self, label: str | None = None) -> dict
```

### Pytest Fixture

```python
@pytest.fixture
async def viewgraph(page):
    vg = ViewGraphPage(page)
    yield vg
    # auto-capture on failure handled by pytest_runtest_makereport hook
```

## File Output

Captures written to `.viewgraph/captures/` with filename format:
`viewgraph-{hostname}-{timestamp}-{label}.json`

Identical to TypeScript fixture output. All MCP server tools work without modification.

## Dependencies

- `playwright` (peer dependency, >=1.40)
- No other runtime dependencies
