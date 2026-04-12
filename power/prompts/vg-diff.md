---
description: "Compare the two most recent captures for regressions"
---

# @vg-diff

Compare the two most recent ViewGraph captures to detect regressions.

1. Call `list_captures` with limit 2 to get the two most recent captures
2. Call `compare_captures` with the older as file_a and newer as file_b
3. Report:
   - Elements added (new on page)
   - Elements removed (missing from page)
   - Layout shifts (bounding box changes > 10px)
   - TestID changes (added, removed, or renamed)
4. If a baseline exists for this URL, also run `compare_baseline` and note any baseline regressions
5. For any removed interactive elements, call `find_source` to locate where they were defined
