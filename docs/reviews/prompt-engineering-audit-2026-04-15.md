# Prompt Engineering Audit (2026-04-15)

## Problem

Kiro prompts had unclear boundaries, inconsistent output formats, and missing error handling. Specifically:
- `@vg-audit` was fixing issues instead of just reporting them
- `@vg-a11y` and `@vg-audit` had overlapping behavior
- Output format varied between runs - no consistent table structure
- Edge cases (no captures, no annotations, fewer than 2 captures) not handled

## Changes Made

### Boundary enforcement

Each prompt now has an explicit action scope:

| Prompt | Action | Modifies files? |
|---|---|---|
| `@vg-audit` | Report only | NO - explicitly forbidden |
| `@vg-a11y` | Report + fix errors, list warnings | YES |
| `@vg-review` | Fix user annotations only | YES - only annotated issues |
| `@vg-capture` | Capture + report | NO |
| `@vg-diff` | Compare + report | NO |
| `@vg-help` | List tools | NO |
| `@vg-testids` | Find + add testids | YES - only data-testid attributes |
| `@vg-tests` | Generate test file | YES - creates one test file |

Key phrases added:
- "REPORT ONLY - do NOT fix any issues"
- "Do NOT edit any files"
- "Do NOT fix issues that were not annotated by the user"
- "Do NOT modify any other attributes"

### Consistent output formats

Every prompt now specifies exact table columns:

- `@vg-audit`: `| # | Element | Issue | Type | Severity | Suggested Fix |`
- `@vg-a11y`: findings table first, then `| # | Element | Issue | Action Taken |`
- `@vg-review`: `| # | Annotation | Fix Applied | File |`
- `@vg-capture`: key elements table + issues detected list
- `@vg-diff`: `| Change | Element | Details |` with change types (Removed/Added/Shifted/TestID changed)
- `@vg-testids`: before table + after table with file paths
- `@vg-help`: tools grouped by category in tables

### Error handling

Every prompt now handles edge cases:
- No captures: "Capture a page first using the ViewGraph extension"
- No annotations: "No unresolved annotations found"
- Fewer than 2 captures for diff: "Need at least 2 captures to compare"
- Server not connected: "Run `viewgraph-init` from your project folder"
- Capture declined: "Please accept it in the ViewGraph sidebar"
- No missing testids: "All interactive elements have data-testid attributes"

### Cross-prompt guidance

Report-only prompts now suggest action prompts:
- `@vg-audit` ends with: "Run @vg-a11y for accessibility fixes or @vg-review for annotated issues"
- `@vg-capture` ends with: "Run @vg-audit for a full audit"
- `@vg-diff` ends with: "Run @vg-review after annotating the issues"

## Files Changed

All 8 files in `power/prompts/`:
- `vg-audit.md` - rewritten: report only, structured table, no file edits
- `vg-a11y.md` - rewritten: show table first, fix errors, list warnings
- `vg-review.md` - rewritten: annotations only, explicit scope boundary
- `vg-capture.md` - rewritten: structured summary format, error handling
- `vg-diff.md` - rewritten: structured diff table, edge case handling
- `vg-help.md` - rewritten: grouped tables, updated init command
- `vg-testids.md` - rewritten: show before/after tables, scope boundary
- `vg-tests.md` - unchanged (already correct from earlier fix)
