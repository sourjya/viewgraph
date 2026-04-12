# @viewgraph/playwright

ViewGraph capture fixture for Playwright. Capture structured DOM snapshots during E2E tests and analyze them with ViewGraph's 34 MCP tools.

## Install

```bash
npm install @viewgraph/playwright
```

## Usage with Fixture

```js
import { test, expect } from '@viewgraph/playwright/fixture';

test('login page has correct structure', async ({ page, viewgraph }) => {
  await page.goto('/login');

  // Capture DOM state
  const capture = await viewgraph.capture('login-page');
  expect(capture.metadata.stats.totalNodes).toBeGreaterThan(10);

  // Add programmatic annotations
  await viewgraph.annotate('#email', 'Missing aria-label', { severity: 'major', category: 'a11y' });
  await viewgraph.annotate('#submit', 'Needs data-testid', { category: 'functional' });

  // Capture with annotations attached
  const review = await viewgraph.captureWithAnnotations('login-review');
  expect(review.annotations).toHaveLength(2);
});
```

## Usage without Fixture

```js
import { createViewGraph } from '@viewgraph/playwright';
import { test } from '@playwright/test';

test('custom setup', async ({ page }) => {
  const vg = await createViewGraph(page, {
    capturesDir: './test-captures',
  });

  await page.goto('/dashboard');
  const capture = await vg.capture('dashboard');
  const html = await vg.snapshot();
});
```

## API

### `createViewGraph(page, options?)`

Creates a ViewGraph instance bound to a Playwright page.

- `page` - Playwright Page instance
- `options.capturesDir` - Output directory (default: `.viewgraph/captures/`)

Returns an object with:

- `capture(label?)` - Capture DOM as ViewGraph JSON. Writes to captures dir.
- `snapshot()` - Capture HTML snapshot string.
- `annotate(selector, comment, options?)` - Add a programmatic annotation.
- `captureWithAnnotations(label?)` - Capture with pending annotations attached.

### Fixture

Import `test` from `@viewgraph/playwright/fixture` to get a `viewgraph` fixture auto-injected into each test.

## How It Works

The package injects ViewGraph's DOM traverser, salience scorer, and serializer into the Playwright page context via `addScriptTag()`. The same capture engine that powers the browser extension runs inside your test browser. Captures are written to `.viewgraph/captures/` where the MCP server picks them up automatically.

## With MCP Agent

After tests run, your AI agent can analyze the captures:

```
"Audit the login-page capture for accessibility issues"
"Compare login-page and login-after-fix captures for regressions"
"Find all interactive elements missing data-testid in the dashboard capture"
```
