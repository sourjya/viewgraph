---
description: "Full audit: accessibility + layout + missing testids"
---

# @vg-audit

Run a comprehensive UI audit on the latest ViewGraph capture. REPORT ONLY - do NOT fix any issues. Present findings as a structured table.

1. Call `get_latest_capture` to find the most recent capture
2. Run `audit_accessibility` - collect all a11y violations
3. Run `audit_layout` - collect overflow, overlap, and viewport issues
4. Run `find_missing_testids` - collect interactive elements without data-testid
5. Present ALL findings in a single markdown table with these exact columns:

| # | Element | Issue | Type | Severity | Suggested Fix |
|---|---|---|---|---|---|

Where Type is one of: a11y, layout, testid

6. After the table, show a summary: "Found N issues: X errors, Y warnings, Z info"
7. Do NOT edit any files. Do NOT fix any issues. This is a report-only command.
8. Ask the user: "Would you like me to fix these issues? Run @vg-a11y for accessibility fixes or @vg-review for annotated issues."
