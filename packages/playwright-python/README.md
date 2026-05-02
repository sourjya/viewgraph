# viewgraph-playwright

Structured DOM capture for Playwright Python tests. The UI perception layer for AI coding agents.

## Install

```bash
pip install viewgraph-playwright
```

## Usage

```python
import pytest
from viewgraph_playwright import ViewGraphPage

async def test_login(page, viewgraph):
    await page.goto("http://localhost:3000/login")

    # Capture DOM state
    capture = await viewgraph.capture("login-page")

    # Annotate issues for your AI agent
    await viewgraph.annotate("#email", "Missing aria-label", severity="major")

    # Capture with annotations attached
    review = await viewgraph.capture_with_annotations("login-review")
```

## Auto-capture on failure

Tests that fail automatically capture the page state. Disable per-test:

```python
@pytest.mark.viewgraph(capture_on_fail=False)
async def test_flaky(page, viewgraph):
    ...
```

## How it works

Python orchestrates; JavaScript runs in the browser. The same DOM traverser, scorer, and serializer from `@viewgraph/playwright` (TypeScript) are injected via `page.add_script_tag()`. Captures are written to `.viewgraph/captures/` and consumed by the ViewGraph MCP server - all 41 tools work without modification.

## Requirements

- Python 3.9+
- Playwright (peer dependency)
- pytest-playwright for the fixture

## License

AGPL-3.0
