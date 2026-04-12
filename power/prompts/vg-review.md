---
description: "Fix all annotations from the latest capture"
---

# @vg-review

Pull unresolved annotations from the latest capture and fix them one by one.

1. Call `get_unresolved` to find all unresolved annotations
2. For each annotation:
   a. Read the comment and severity
   b. Call `get_annotation_context` to see the annotated element's full DOM context
   c. Call `find_source` to locate the source file (use testid, selector, or component name)
   d. Implement the fix described in the annotation comment
   e. Call `resolve_annotation` with action "fixed" and the files changed
3. After all annotations are resolved, summarize what was fixed
4. Offer to request a verification capture via `request_capture` with purpose "verify"
