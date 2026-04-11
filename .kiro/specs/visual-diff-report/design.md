# Capture Diffing Visual Report - Design

## Architecture

```
compare_captures (existing)     generate_diff_report (new)
  |                                |
  v                                v
capture-diff.js                 report-generator.js
  |                                |
  v                                v
JSON diff data  -------->  HTML template + diff data
                                   |
                                   v
                           .viewgraph/reports/diff-{a}-vs-{b}.html
```

The report generator takes the existing `capture-diff.js` output and injects it into an HTML template with embedded CSS and JavaScript for interactive viewing.

## Report Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>ViewGraph Diff: {url} - {timestamp-a} vs {timestamp-b}</title>
  <style>/* all styles inline */</style>
</head>
<body>
  <header><!-- URL, timestamps, viewport, summary counts --></header>
  <nav><!-- filter controls: change type, role, search --></nav>
  <main>
    <section id="tree"><!-- side-by-side element tree --></section>
    <section id="detail"><!-- element detail panel --></section>
  </main>
  <script>
    const DIFF_DATA = /* JSON injected at generation time */;
    // Interactive tree, filtering, search, detail panel
  </script>
</body>
</html>
```

## Diff Data Schema

```json
{
  "meta": {
    "url": "https://example.com",
    "captureA": { "filename": "...", "timestamp": "...", "viewport": {...} },
    "captureB": { "filename": "...", "timestamp": "...", "viewport": {...} }
  },
  "summary": { "added": 12, "removed": 3, "changed": 7, "unchanged": 245 },
  "elements": [
    {
      "status": "added|removed|changed|unchanged",
      "selector": "button#submit",
      "tag": "button",
      "role": "button",
      "text": "Submit",
      "before": { "bbox": {...}, "styles": {...} },
      "after": { "bbox": {...}, "styles": {...} },
      "changes": ["position shifted 20px right", "font-size 14px -> 16px"]
    }
  ]
}
```

## File Layout

```
server/
  src/
    analysis/
      report-generator.js    HTML report builder
    tools/
      generate-diff-report.js  MCP tool handler
scripts/
  viewgraph-diff.js          CLI entry point
```

## Color Scheme

| Status | Background | Border | Icon |
|---|---|---|---|
| Added | #052e16 (dark green) | #22c55e | + |
| Removed | #450a0a (dark red) | #ef4444 | - |
| Changed | #422006 (dark amber) | #f59e0b | ~ |
| Unchanged | transparent | #333 | (none) |

Matches the dark theme of the ViewGraph sidebar.
