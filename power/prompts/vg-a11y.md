---
description: "Deep accessibility audit with automatic source fixes"
---

# @vg-a11y

Run a deep accessibility audit AND fix all error-level issues. This is the action command - it modifies files.

1. Call `get_latest_capture` to find the most recent capture
2. Call `audit_accessibility` - this includes both ViewGraph's built-in rules and axe-core results when available
3. Present findings in a table first (same format as @vg-audit) so the user sees what will be fixed
4. For each ERROR-level issue:
   a. Call `find_source` to locate the source file
   b. Implement the fix:
      - `missing-alt`: add descriptive alt text based on image context
      - `button-no-name`: add aria-label or ensure visible text exists
      - `missing-form-label`: add `<label>` element or aria-label
      - `insufficient-contrast`: adjust color to meet WCAG AA (4.5:1 ratio)
      - `empty-aria-label`: remove empty attribute or add meaningful label
   c. Note each fix in a summary
5. For WARNING-level issues: list them with suggested fixes but do NOT auto-implement. Ask the user if they want these fixed too.
6. After all fixes, show a summary table:

| # | Element | Issue | Action Taken |
|---|---|---|---|

7. Offer to request a verification capture to confirm fixes
