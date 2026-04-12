/**
 * @viewgraph/playwright - Playwright Fixture
 *
 * Extends Playwright's test fixtures with a `viewgraph` object on each
 * page. Usage:
 *
 *   import { test } from '@viewgraph/playwright/fixture';
 *
 *   test('login page', async ({ page, viewgraph }) => {
 *     await page.goto('/login');
 *     const capture = await viewgraph.capture('login-page');
 *     expect(capture.metadata.stats.totalNodes).toBeGreaterThan(0);
 *   });
 *
 * Captures are written to `.viewgraph/captures/` by default.
 *
 * @see docs/architecture/competitive-analysis-browser-mcp.md - interop design
 */

import { test as base } from '@playwright/test';
import { createViewGraph } from './index.js';

/**
 * Extended Playwright test with ViewGraph fixture.
 * Provides a `viewgraph` object scoped to each test's page.
 */
export const test = base.extend({
  /**
   * ViewGraph fixture - auto-injects the capture bundle into the page
   * and provides capture/snapshot/annotate methods.
   */
  viewgraph: async ({ page }, use) => {
    const vg = await createViewGraph(page);
    await use(vg);
  },
});

export { expect } from '@playwright/test';
