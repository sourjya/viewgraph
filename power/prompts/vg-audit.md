---
description: "Full audit: accessibility + layout + missing testids"
---

# @vg-audit

Run a comprehensive UI audit on the latest ViewGraph capture.

1. Call `get_latest_capture` to find the most recent capture
2. Run `audit_accessibility` - report all a11y violations grouped by severity
3. Run `audit_layout` - report overflow, overlap, and viewport issues
4. Run `find_missing_testids` - list interactive elements without data-testid
5. Summarize all findings in a single table: element, issue type, severity, suggested fix
6. For each high-severity issue, call `find_source` to locate the source file
7. Offer to fix all issues automatically if the user confirms
