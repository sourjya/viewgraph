---
description: "Generate Playwright tests from the latest capture"
---

# @vg-tests

Generate Playwright E2E tests from the latest ViewGraph capture.

1. Call `get_latest_capture` to find the most recent capture
2. Call `get_interactive_elements` to get all buttons, links, inputs with their selectors and labels
3. Call `get_page_summary` for page structure context
4. Generate a Playwright test file that:
   a. Navigates to the captured URL
   b. Verifies all key interactive elements are present (use data-testid locators when available, fall back to role + name)
   c. Verifies page title matches
   d. Checks that critical elements are visible (high-salience interactive elements)
   e. Includes a basic form fill test if form inputs are present
5. Use Playwright best practices:
   - `page.getByTestId()` for elements with data-testid
   - `page.getByRole()` for elements with ARIA roles
   - `page.getByLabel()` for form inputs with labels
   - `expect(locator).toBeVisible()` for visibility checks
6. Write the test file to `tests/e2e/` or the project's existing test directory
7. List all generated test cases with the locator strategy used for each
