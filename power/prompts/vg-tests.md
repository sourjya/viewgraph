---
description: "Generate Playwright tests from the latest capture"
---

# @vg-tests

Generate a Playwright test file from the latest ViewGraph capture. Do NOT scaffold a project, install dependencies, or create config files. Only generate the test code.

1. Call `get_latest_capture` to find the most recent capture. If no captures exist, tell the user to capture a page first using the ViewGraph extension.
2. Call `get_interactive_elements` to get all buttons, links, inputs with their selectors and labels
3. Call `get_page_summary` for page structure context
4. Generate a SINGLE Playwright test file (not a project) that:
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
6. Write the test file to `tests/` directory. Do not create package.json, playwright.config, or any other files.
7. List all generated test cases with the locator strategy used for each
