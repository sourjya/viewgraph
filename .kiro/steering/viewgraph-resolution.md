---
inclusion: auto
description: ViewGraph annotation resolution format and conventions
---

# ViewGraph Resolution Format

## When resolving annotations

Call `resolve_annotation` with these parameters:

- `filename` - the capture file containing the annotation
- `annotation_uuid` - UUID of the annotation to resolve
- `action` - one of: `fixed`, `wontfix`, `duplicate`, `invalid`
- `summary` - brief description of what was done (max 500 chars)
- `files_changed` - array of file paths that were modified

## Action types

- `fixed` - code was changed to address the issue
- `wontfix` - intentional behavior, not a bug
- `duplicate` - same issue already reported in another annotation
- `invalid` - not a real issue (misunderstanding, outdated)

## Summary guidelines

- Be specific: "Changed font-size from 42px to 28px" not "Fixed font"
- Reference the actual values: "Updated label from 'Email' to 'Email or Username'"
- Keep it under one sentence when possible

## Example

```
resolve_annotation(
  filename: "viewgraph-localhost-2026-04-09-1241.json",
  annotation_uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  action: "fixed",
  summary: "Changed h1 font-size from 42px to 28px in docs/demo/index.html",
  files_changed: ["docs/demo/index.html"]
)
```
