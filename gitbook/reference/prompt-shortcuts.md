# Prompt Shortcuts Reference

9 prompt shortcuts for Kiro CLI. Type `@vg` then Tab to see all options.

## @vg-audit

Full audit: accessibility + layout + missing testids.

Captures the latest page, runs `audit_accessibility`, `audit_layout`, and `find_missing_testids`. Summarizes all findings in a table grouped by severity. Offers to fix all issues automatically.

## @vg-review

Fix all annotations from the latest capture.

Pulls unresolved annotations via `get_unresolved`. For each: reads the comment, calls `get_annotation_context` for DOM context, calls `find_source` to locate the file, implements the fix, calls `resolve_annotation`. Offers verification capture at the end.

## @vg-capture

Request a fresh capture and summarize the result.

Calls `request_capture`, polls `get_request_status` until completed, then runs `get_page_summary`. Reports page title, element counts, and flags any console errors or failed network requests.

## @vg-diff

Compare the two most recent captures for regressions.

Calls `list_captures` (limit 2), then `compare_captures`. Reports elements added, removed, layout shifts, and testid changes. Also runs `compare_baseline` if a baseline exists.

## @vg-testids

Find and add missing data-testid attributes.

Calls `find_missing_testids`, then for each element calls `find_source` and adds the suggested testid to the source file. Summarizes: N testids added across M files.

## @vg-a11y

Deep accessibility audit with automatic source fixes.

Runs `audit_accessibility` (includes axe-core results). For each error-level issue: locates the source file and implements the fix (alt text, aria-label, form labels, contrast). Warning-level issues are listed but not auto-fixed.

## @vg-tests

Generate Playwright E2E tests from the latest capture.

Calls `get_interactive_elements` and `get_page_summary`. Generates a Playwright test file with correct locators for every interactive element. Uses `getByTestId()`, `getByRole()`, and `getByLabel()` following Playwright best practices.

## @vg-help

List all 37 ViewGraph MCP tools grouped by category with plain-English explanations and example usage.

## @vg-ideate

Generate feature specs from idea annotations. Reads annotations with "Idea" category from the latest capture and creates a Kiro spec with feature requirements, user stories, and implementation tasks - all grounded in the actual UI context from the capture.
