# MCP Server Core Tools — Design

## Architecture

```
server/
├── index.js                 (entry point — wires everything together)
├── src/
│   ├── watcher.js           (chokidar file watcher on captures dir)
│   ├── indexer.js            (in-memory index: filename → metadata)
│   ├── parsers/
│   │   └── viewgraph-v2.js  (parse ViewGraph v2 JSON sections)
│   └── tools/
│       ├── list-captures.js
│       ├── get-capture.js
│       ├── get-latest.js
│       └── get-page-summary.js
└── tests/
    ├── unit/
    │   ├── indexer.test.js
    │   ├── viewgraph-v2.test.js
    │   └── tools/
    │       ├── list-captures.test.js
    │       ├── get-capture.test.js
    │       ├── get-latest.test.js
    │       └── get-page-summary.test.js
    └── fixtures/
        ├── valid-capture.json
        ├── annotated-capture.json
        └── malformed-capture.json
```

## Module Design

### watcher.js
- Exports `createWatcher(dir, { onAdd, onChange, onRemove })`
- Uses chokidar with `{ ignoreInitial: false, awaitWriteFinish: true }`
- `awaitWriteFinish` prevents reading partial writes (critical for large captures)
- Filters to `*.json` files only
- Returns watcher instance for cleanup on shutdown

### indexer.js
- Exports `createIndexer({ maxCaptures })`
- Methods: `add(filename, metadata)`, `remove(filename)`, `get(filename)`,
  `list({ limit, urlFilter, sortBy })`, `getLatest(urlFilter)`
- Stores a `Map<filename, metadata>` internally
- Eviction: when size exceeds `maxCaptures`, delete oldest by timestamp
- Metadata shape: `{ filename, url, title, timestamp, viewport, nodeCount, captureMode, hasAnnotations }`

### parsers/viewgraph-v2.js
- Exports `parseCapture(jsonString)` → full parsed capture object
- Exports `parseMetadata(jsonString)` → metadata only (fast, for indexing)
- Exports `parseSummary(jsonString)` → summary extraction for get_page_summary
- Section delimiters: `====METADATA====`, `====NODES====`, etc.
- Returns `{ ok: true, data }` or `{ ok: false, error }` — never throws

### tools/*.js
Each tool module exports a `register(server, indexer, capturesDir)` function
that calls `server.tool(name, description, schema, handler)`.

Tool descriptions are written for the LLM — they include when to use the tool,
what the output looks like, and error conditions.

## Data Flow

```
Startup:
  chokidar scans dir → for each .json → parseMetadata → indexer.add

New file arrives:
  chokidar 'add' event → parseMetadata → indexer.add

Kiro calls list_captures:
  tool handler → indexer.list({ limit, urlFilter }) → return metadata array

Kiro calls get_capture:
  tool handler → validate path → fs.readFile → return full JSON

Kiro calls get_page_summary:
  tool handler → validate path → fs.readFile → parseSummary → return summary
```

## Security

Path validation function shared across all tools:

```javascript
function validateCapturePath(filename, capturesDir) {
  const resolved = path.resolve(capturesDir, path.basename(filename));
  if (!resolved.startsWith(path.resolve(capturesDir))) {
    throw new McpError(ErrorCode.InvalidParams, 'Path traversal not allowed');
  }
  return resolved;
}
```

Key: `path.basename(filename)` strips any directory components, then we resolve
and verify it's still within the captures dir.

## Response Size Management

- `get_capture`: returns full JSON. If > 100KB, tool description tells the LLM
  to use `get_page_summary` instead for an overview.
- `get_latest_capture`: if full JSON > 100KB, automatically returns summary
  with a note: "Full capture is X KB. Use get_capture for the complete data."
- `list_captures`: returns only metadata, always small.
