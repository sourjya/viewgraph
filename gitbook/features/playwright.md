# Playwright Integration

Capture structured DOM snapshots during Playwright E2E tests. Generate tests from browser captures. Bridge the gap between what you see in the browser and what your test suite covers.

## The Problem

Writing E2E tests is slow:
- **Manual element discovery** - open DevTools, inspect elements, copy selectors. 20-30 minutes per page.
- **Stale selectors** - someone renames a class, test breaks, 15 minutes to debug.
- **Incomplete coverage** - you test the happy path but miss buttons without testids, inputs without labels.

## Two Workflows

### Generate tests from captures (new projects)

1. Capture a page with the ViewGraph extension
2. Tell your agent: `@vg-tests`
3. Agent generates a complete Playwright test file with correct locators for every interactive element

**20-30 minutes of manual inspection reduced to one prompt.**

### Capture during tests (existing suites)

```js
import { test } from '@viewgraph/playwright/fixture';

test('checkout flow', async ({ page, viewgraph }) => {
  await page.goto('/cart');
  await viewgraph.capture('cart-page');

  await page.click('[data-testid="checkout-btn"]');
  await viewgraph.capture('checkout-page');
});
```

After tests run, your agent can diff captures between runs, audit accessibility, and detect structural regressions.

### Flag issues from test assertions

```js
test('form validation', async ({ page, viewgraph }) => {
  await page.goto('/signup');

  if (!await page.getByTestId('email').getAttribute('aria-label')) {
    await viewgraph.annotate('[data-testid="email"]', 'Missing aria-label', {
      severity: 'major',
      category: 'a11y',
    });
  }

  await viewgraph.captureWithAnnotations('signup-a11y-issues');
});
```

## Install

```bash
npm install @viewgraph/playwright
```

[![npm](https://img.shields.io/npm/v/@viewgraph/playwright)](https://www.npmjs.com/package/@viewgraph/playwright)

## API

### Fixture

```js
import { test, expect } from '@viewgraph/playwright/fixture';

test('my test', async ({ page, viewgraph }) => {
  await page.goto('/login');
  const capture = await viewgraph.capture('login-page');
  expect(capture.metadata.stats.totalNodes).toBeGreaterThan(10);
});
```

### Standalone

```js
import { createViewGraph } from '@viewgraph/playwright';

const vg = await createViewGraph(page, { capturesDir: './test-captures' });
const capture = await vg.capture('dashboard');
```

### Methods

| Method | Description |
|---|---|
| `capture(label?)` | Capture DOM as ViewGraph JSON. Writes to captures dir. |
| `snapshot()` | Capture HTML snapshot string. |
| `annotate(selector, comment, options?)` | Add a programmatic annotation. |
| `captureWithAnnotations(label?)` | Capture with pending annotations attached. |

Full documentation: [@viewgraph/playwright on GitHub](https://github.com/sourjya/viewgraph/tree/main/packages/playwright)
