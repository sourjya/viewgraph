---
description: "Fix all annotations from the latest capture"
---

# @vg-review

Fix issues that the USER annotated in the browser. Only fix what the user explicitly marked - do not fix other issues you notice.

1. Call `get_unresolved` to find all unresolved annotations
2. If no unresolved annotations exist, tell the user: "No unresolved annotations found. Capture a page and annotate issues first, then run @vg-review."
3. For each unresolved annotation:
   a. Read the comment and severity
   b. Call `get_annotation_context` to see the annotated element's full DOM context
   c. Call `find_source` to locate the source file (use testid, selector, or component name)
   d. Implement ONLY the fix described in the annotation comment
   e. Call `resolve_annotation` with action "fixed", a summary of what was changed, and the files modified
4. Do NOT fix issues that were not annotated by the user, even if you notice them
5. After all annotations are resolved, show a summary:

| # | Annotation | Fix Applied | File |
|---|---|---|---|

6. Offer to request a verification capture via `request_capture` with purpose "verify"
