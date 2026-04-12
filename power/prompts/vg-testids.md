---
description: "Find and add missing data-testid attributes"
---

# @vg-testids

Find all interactive elements missing data-testid and add them to the source code.

1. Call `get_latest_capture` to find the most recent capture
2. Call `find_missing_testids` to get all interactive elements without data-testid
3. For each element:
   a. Call `find_source` with the element's selector or aria-label
   b. Add `data-testid="suggested-id"` to the element in the source file
   c. Use the suggested testid from the tool (kebab-case from tag + text)
4. Summarize: N testids added across M files
5. List all added testids with their selectors for verification
