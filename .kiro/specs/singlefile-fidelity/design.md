# SingleFile Fidelity Measurement - Design

## Architecture

```
Extension                          MCP Server
┌──────────────┐                   ┌──────────────────────┐
│ Content Script│                   │                      │
│ ├─ traverser  │──► JSON ────────►│ POST /captures       │
│ └─ snapshot   │──► HTML ────────►│ POST /snapshots      │
└──────────────┘                   │                      │
                                   │ Fidelity Comparator  │
                                   │ ├─ parse HTML        │
                                   │ ├─ compare elements  │
                                   │ └─ generate report   │
                                   │                      │
                                   │ MCP Tool             │
                                   │ └─ get_fidelity_report│
                                   └──────────────────────┘
```

## Directory Structure

```
captures/
├── viewgraph-localhost-2026-04-08-120612.json
├── viewgraph-localhost-2026-04-08-123639.json
snapshots/
├── viewgraph-localhost-2026-04-08-120612.html
├── viewgraph-localhost-2026-04-08-123639.html
reports/
├── fidelity-localhost-2026-04-08-120612.json
└── fidelity-summary.json
```

All three directories live as siblings under the configured captures
root. The server creates `snapshots/` and `reports/` on first use.

## File Structure

### Extension (new files)

```
extension/lib/
└── html-snapshot.js     Lightweight HTML serializer
```

### Server (new files)

```
server/src/
├── snapshot-receiver.js   HTTP endpoint for snapshots
├── analysis/
│   └── fidelity.js        Compare capture vs snapshot
└── tools/
    └── get-fidelity-report.js  MCP tool
```

## HTML Serializer (extension/lib/html-snapshot.js)

Lightweight alternative to SingleFile. Captures the DOM as-is with
inline styles, without inlining external resources as data URIs.

```javascript
// Core approach:
// 1. Clone the document
// 2. For each visible element, inline key computed styles
// 3. Remove all <script> tags
// 4. Return outerHTML
```

This is NOT a full SingleFile replacement. It captures enough for
element-level fidelity comparison. Images remain as URLs (not inlined),
fonts are not embedded, CSS @import chains are not resolved.

For full visual fidelity, users install SingleFile separately and drop
the HTML into `snapshots/`.

## Fidelity Comparator (server/src/analysis/fidelity.js)

Parses the HTML snapshot using a lightweight HTML parser (no browser
needed), extracts element inventory, and compares against the ViewGraph
JSON capture.

### Comparison algorithm

1. Parse HTML: extract all elements with tag, id, data-testid, text,
   aria attributes, classes
2. Parse ViewGraph JSON: extract same fields from details section
3. Match elements by: data-testid (exact), then id (exact), then
   tag+text (fuzzy)
4. Compute coverage metrics

### Metrics

```json
{
  "captureFile": "viewgraph-localhost-2026-04-08-120612.json",
  "snapshotFile": "viewgraph-localhost-2026-04-08-120612.html",
  "timestamp": "2026-04-08T12:06:12Z",
  "url": "http://localhost:5173/dashboard",
  "metrics": {
    "elementCoverage": { "total": 243, "captured": 208, "pct": 0.856 },
    "testidCoverage": { "total": 38, "captured": 37, "pct": 0.974 },
    "textCoverage": { "total": 1850, "captured": 1720, "pct": 0.930 },
    "interactiveCoverage": { "total": 20, "captured": 20, "pct": 1.0 },
    "overallScore": 0.94
  },
  "missing": [
    { "tag": "button", "testid": "sidebar-close", "reason": "hidden" }
  ]
}
```

### Overall score

Weighted average: testid coverage (40%) + interactive coverage (30%) +
element coverage (20%) + text coverage (10%). TestID and interactive
coverage matter most for agent workflows.

## Fidelity Summary (reports/fidelity-summary.json)

Rolling summary updated after each comparison:

```json
{
  "lastUpdated": "2026-04-08T12:36:39Z",
  "totalPairs": 5,
  "averageScore": 0.93,
  "trend": [
    { "date": "2026-04-08", "score": 0.94, "pairs": 2 },
    { "date": "2026-04-07", "score": 0.92, "pairs": 3 }
  ],
  "commonMissing": [
    { "pattern": "hidden dialogs", "count": 4 },
    { "pattern": "inactive tab content", "count": 2 }
  ]
}
```

## HTTP Endpoints

### POST /snapshots

Accepts raw HTML body. Filename derived from `X-Capture-Filename`
header (matching the JSON capture filename, with .html extension).

```
POST /snapshots
Content-Type: text/html
X-Capture-Filename: viewgraph-localhost-2026-04-08-120612

<html>...</html>
```

Response: `{ "filename": "viewgraph-localhost-2026-04-08-120612.html" }`

After writing the snapshot, the server checks if a matching capture
exists and auto-generates the fidelity report.

## Capture Flow (updated)

```
1. User clicks "Capture Page" (snapshot toggle ON)
2. Content script runs traverser -> JSON
3. Content script runs html-snapshot -> HTML
4. Background POSTs JSON to /captures
5. Background POSTs HTML to /snapshots
6. Server writes both files
7. Server auto-generates fidelity report
8. Popup shows: "208 elements | Fidelity: 94%"
```
