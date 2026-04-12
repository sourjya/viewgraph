---
description: "Deep accessibility audit with automatic source fixes"
---

# @vg-a11y

Run a deep accessibility audit and fix all issues found.

1. Call `get_latest_capture` to find the most recent capture
2. Call `audit_accessibility` - this includes both ViewGraph's built-in rules and axe-core results when available
3. Group issues by severity (error > warning > info)
4. For each error-level issue:
   a. Call `find_source` to locate the source file
   b. Implement the fix:
      - `missing-alt`: add descriptive alt text based on image context
      - `button-no-name`: add aria-label or visible text
      - `missing-form-label`: add `<label>` element or aria-label
      - `insufficient-contrast`: adjust color to meet WCAG AA (4.5:1 ratio)
   c. Note the fix in a summary table
5. For warning-level issues, list them with suggested fixes but don't auto-implement
6. Offer to request a verification capture to confirm fixes
