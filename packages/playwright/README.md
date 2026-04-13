# @viewgraph/playwright

Capture structured DOM snapshots during Playwright E2E tests. Generate tests from live page captures. Bridge the gap between what you see in the browser and what your test suite covers.

## The Problem

Writing E2E tests is slow and fragile:

1. **Manual element discovery.** You open DevTools, inspect elements, copy selectors, figure out which locator strategy to use. For a page with 30 interactive elements, this takes 20-30 minutes.

2. **Stale selectors.** You write `page.locator('.btn-primary')` today. Next sprint someone renames the class. Test breaks. You spend 15 minutes figuring out which element moved where.

3. **Incomplete coverage.** You test the happy path but miss the 5 buttons without `data-testid`, the form input without a label, the nav link that's actually an `<a>` with `role="button"`. You don't know what you're not testing.

4. **No structural regression detection.** Your tests check behavior ("click login, see dashboard") but not structure ("the login page still has 12 interactive elements, all with accessible names"). A CSS change hides a button - your tests pass because they never checked it existed.

## How ViewGraph + Playwright Solves This

### Generate tests from captures, not from memory

Instead of manually inspecting elements, capture the page and let your AI agent generate the tests:

```
You: "Generate Playwright tests for the login page"

Agent calls: get_latest_capture -> get_interactive_elements -> get_page_summary

Agent sees:
  - 4 inputs (email, password, remember-me, submit)
  - 3 links (forgot password, sign up, terms)
  - 2 buttons (submit, show password toggle)
  - All with data-testid except the terms link
  - Email input has aria-label="Email address"

Agent generates: complete test file with correct locators for every element
```

**Time saved:** 20-30 minutes of manual inspection reduced to one prompt. The agent picks the best locator strategy for each element (testid > role+name > label > css) because it has the full DOM context.

### Capture during tests for regression baselines

Add `viewgraph.capture()` to your existing tests to create structural snapshots:

```js
import { test } from '@viewgraph/playwright/fixture';

test('checkout flow', async ({ page, viewgraph }) => {
  await page.goto('/cart');
  await viewgraph.capture('cart-page');

  await page.click('[data-testid="checkout-btn"]');
  await viewgraph.capture('checkout-page');

  await page.fill('#card-number', '4242424242424242');
  await page.click('[data-testid="pay-btn"]');
  await viewgraph.capture('confirmation-page');
});
```

Each capture produces a ViewGraph JSON file with every element's selector, attributes, styles, bounding box, and accessibility state. After the test runs, your agent can:

- **Diff captures between runs:** "The checkout page lost 2 interactive elements since last week"
- **Audit accessibility:** "The card number input is missing an aria-label"
- **Find missing testids:** "5 buttons on the confirmation page have no data-testid"
- **Set baselines:** "This is the known-good state of the cart page"

### Flag issues from test assertions

When a test catches a problem, annotate it so the agent has context to fix it:

```js
test('form validation', async ({ page, viewgraph }) => {
  await page.goto('/signup');

  // Test finds a problem - annotate it for the agent
  const emailInput = page.getByTestId('email');
  if (!await emailInput.getAttribute('aria-label')) {
    await viewgraph.annotate('[data-testid="email"]', 'Missing aria-label on email input', {
      severity: 'major',
      category: 'a11y',
    });
  }

  // Capture with annotations - agent gets the full picture
  await viewgraph.captureWithAnnotations('signup-a11y-issues');
});
```

The agent receives the annotation + the element's full DOM context + the page structure. It calls `find_source` to locate the file and implements the fix. No screenshots-with-arrows, no vague Jira tickets.

## The Two Workflows

### Workflow A: Generate tests from captures (new projects)

```
1. Open your app in the browser
2. Click ViewGraph icon to capture the page
3. Tell your agent: "@vg-tests" (or "generate Playwright tests from the latest capture")
4. Agent generates test file with correct locators for every interactive element
5. Run the tests, iterate
```

**Best for:** New projects without test coverage, pages that just shipped, onboarding onto an existing codebase where you don't know what to test.

### Workflow B: Capture during tests (existing test suites)

```
1. Add `viewgraph.capture()` calls to existing Playwright tests
2. Run tests - captures are saved alongside test results
3. Agent analyzes captures: audit a11y, find missing testids, detect regressions
4. Agent fixes issues, re-run tests to verify
```

**Best for:** Mature projects adding structural regression detection, teams improving accessibility coverage, CI pipelines that want automated UI audits.

## Install

```bash
npm install @viewgraph/playwright
```

## Usage with Fixture

```js
import { test, expect } from '@viewgraph/playwright/fixture';

test('login page', async ({ page, viewgraph }) => {
  await page.goto('/login');
  const capture = await viewgraph.capture('login-page');
  expect(capture.metadata.stats.totalNodes).toBeGreaterThan(10);
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
});
```

## API

### `createViewGraph(page, options?)`

Creates a ViewGraph instance bound to a Playwright page.

- `page` - Playwright Page instance
- `options.capturesDir` - Output directory (default: `.viewgraph/captures/`)

Returns:

- `capture(label?)` - Capture DOM as ViewGraph JSON. Writes to captures dir.
- `snapshot()` - Capture HTML snapshot string.
- `annotate(selector, comment, options?)` - Add a programmatic annotation. Options: `severity` (critical/major/minor), `category` (visual/functional/a11y/content/perf).
- `captureWithAnnotations(label?)` - Capture with pending annotations attached.

### Fixture

```js
import { test } from '@viewgraph/playwright/fixture';
```

Provides a `viewgraph` fixture auto-injected into each test, scoped to the test's page.

## How It Works

The package injects ViewGraph's DOM traverser, salience scorer, and serializer into the Playwright page context via `addScriptTag()`. The same capture engine that powers the browser extension runs inside your test browser. Captures are written to `.viewgraph/captures/` where the MCP server picks them up automatically.

No browser extension needed. No server needed during test execution. The captures are plain JSON files that the MCP server reads when your agent queries them.

## What the Agent Gets from a Test Capture

Every capture includes:

| Data | What the agent does with it |
|---|---|
| Every interactive element with ranked locators (testid > role > css) | Generates tests with the most stable locator strategy |
| Computed styles, bounding boxes, layout | Detects visual regressions between test runs |
| Accessibility attributes (role, aria-label, aria-describedby) | Audits WCAG compliance, finds missing labels |
| Salience scoring (high/med/low per element) | Prioritizes which elements to test first |
| Parent-child relationships, semantic landmarks | Understands page structure for better test organization |

## Example: What Gets Generated

From a capture of a login page with 2 inputs, 1 button, and 2 links, the agent generates:

```js
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle('Login - MyApp');
  });

  test('email input is visible and labeled', async ({ page }) => {
    const email = page.getByTestId('email-input');
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute('type', 'email');
  });

  test('password input is visible', async ({ page }) => {
    const password = page.getByTestId('password-input');
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('login button is clickable', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Sign in' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('forgot password link exists', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Forgot password?' });
    await expect(link).toBeVisible();
  });

  test('sign up link exists', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Create account' });
    await expect(link).toBeVisible();
  });
});
```

Every locator comes from the capture data. The agent didn't guess - it used the exact testids, roles, and names from the live DOM.

---

[Full documentation](https://chaoslabz.gitbook.io/viewgraph) - [GitHub](https://github.com/sourjya/viewgraph) - [Quick Start](https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start)
