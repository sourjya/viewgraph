---
description: "Find and add missing data-testid attributes"
---

# @vg-testids

Find all interactive elements missing data-testid and add them to the source code. This command MODIFIES files.

1. Call `get_latest_capture` to find the most recent capture. If no captures exist, tell the user to capture a page first.
2. Call `find_missing_testids` to get all interactive elements without data-testid
3. If no missing testids found, tell the user: "All interactive elements have data-testid attributes."
4. Present the findings first (before making changes):

**Missing testids:**
| # | Element | Selector | Suggested testid |
|---|---|---|---|

5. For each element:
   a. Call `find_source` with the element's selector or aria-label
   b. Add `data-testid="suggested-id"` to the element in the source file
   c. Use the suggested testid from the tool (kebab-case from tag + text)
6. After all changes, show a summary:

**Added N testids across M files:**
| # | Element | testid added | File |
|---|---|---|---|

7. Do NOT modify any other attributes or fix any other issues - only add data-testid.
