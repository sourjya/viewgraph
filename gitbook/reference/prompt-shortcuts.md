# Prompt Shortcuts Reference

11 prompt shortcuts for common ViewGraph workflows.

{% hint style="info" %}
**Kiro CLI:** Type `@vg-review`, `@vg-audit`, etc. The `@` prefix triggers prompt expansion.

**Kiro IDE:** Use the Hooks panel in the sidebar, or type the shortcut name **without `@`** in chat (e.g., `vg-review`). Typing `@vg-review` in IDE chat will trigger a "new spec" prompt - that's a Kiro IDE behavior, not a ViewGraph issue.
{% endhint %}

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

List all 38 ViewGraph MCP tools grouped by category with plain-English explanations and example usage.

## @vg-ideate

Generate feature specs from idea annotations. Reads annotations with "Idea" category from the latest capture and creates a Kiro spec with feature requirements, user stories, and implementation tasks - all grounded in the actual UI context from the capture.

## @vg-debug-ui

5-step UI debugging recipe for systematic issue resolution.

Follows a structured pipeline: (1) **Assess** - calls `get_page_summary` and checks console errors and failed network requests, (2) **Annotations** - reads user feedback via `get_annotations` and `get_annotation_context`, (3) **Audit** - runs `audit_accessibility` and `audit_layout` to find issues the user may not have annotated, (4) **Fix** - locates source files via `find_source` and implements fixes, resolving each annotation, (5) **Verify** - requests a fresh capture and diffs before/after to confirm fixes and check for regressions.

## @vg-debug-fullstack

Cross-tool orchestration for full-stack debugging with graceful degradation.

Coordinates ViewGraph with Chrome DevTools MCP (network waterfall, JS profiling, runtime evaluation) and TracePulse (backend trace correlation). Starts with ViewGraph DOM context, then enriches with DevTools network/performance data and backend traces when available. If Chrome DevTools MCP or TracePulse are not connected, the prompt degrades gracefully - it uses only the tools that are available and notes what additional context could be gathered with the missing tools.
