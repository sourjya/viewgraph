# M15.2 Regression Baselines - Design

## Overview

Save a "golden" capture per page URL. After code changes, compare the latest
capture against the baseline to detect structural regressions: missing elements,
added elements, layout shifts, testid changes, interactive element count changes.

Visual regression testing without screenshots - purely structural.

## Storage

Baselines live in `.viewgraph/baselines/` alongside `.viewgraph/captures/`.
Each baseline is a copy of a capture file, keyed by a normalized URL hash.

```
.viewgraph/
  captures/          (existing - all captures)
  baselines/         (new - one per URL)
    localhost-3000--login.json
    localhost-3000--dashboard.json
```

**Filename convention:** `{host}--{path-slugified}.json`

URL normalization: strip protocol, strip query params and hash, replace `/`
with `-`, collapse multiple `-`. This means `http://localhost:3000/login` and
`https://localhost:3000/login?foo=1` map to the same baseline key.

**Why copy, not symlink:** baselines must be immutable snapshots. If we
symlinked to the captures dir, the file could be overwritten by a new capture.

## MCP Tools

### set_baseline

Promotes a capture to baseline for its URL.

```
Input:  { filename: string }
Output: { ok: true, baselineKey: string, url: string }
```

Copies the capture file to `.viewgraph/baselines/{key}.json`. Overwrites
any existing baseline for that URL.

### compare_baseline

Compares the latest capture for a URL against its baseline.

```
Input:  { url?: string, filename?: string }
Output: {
  hasBaseline: boolean,
  baselineFile: string,
  captureFile: string,
  diff: {
    added: [{ id, tag, text, selector }],
    removed: [{ id, tag, text, selector }],
    layoutShifts: [{ id, tag, dx, dy, dw, dh }],
    testidChanges: [{ id, tag, oldTestid, newTestid }],
    interactiveCount: { baseline: number, current: number, delta: number },
  },
  summary: string
}
```

If no baseline exists, returns `{ hasBaseline: false }`.

Uses the existing `capture-diff.js` module for the structural comparison.

### list_baselines

Lists all stored baselines.

```
Input:  { url_filter?: string }
Output: [{ key: string, url: string, timestamp: string, nodeCount: number }]
```

## HTTP Endpoints (for extension)

### GET /baselines

Returns list of baselines with metadata. Extension uses this to show
baseline indicators in the Inspect tab.

### POST /baselines

Body: `{ filename: string }` - promotes a capture to baseline.
Extension calls this when user clicks "Set as Baseline".

### GET /baselines/compare?url={url}

Returns diff of latest capture vs baseline for the given URL.
Extension calls this to populate the diff section in Inspect tab.

## Extension UI

### Inspect Tab - Captures Section

Shows recent captures for the current page URL, fetched from the server.
Each entry shows timestamp and node count. The baseline capture has a
star icon. Actions per entry:

- **Set as Baseline** (star outline -> filled star)
- **Compare** (only if baseline exists, shows diff inline)

### Inspect Tab - Diff Section

When a comparison is active, shows below the captures list:

```
DIFF vs BASELINE
+3 elements added
-1 element removed
~2 layout shifts
1 testid changed
Interactive: 12 -> 11 (-1)
```

Each line is expandable to show the specific elements.

## Implementation Order

1. Server: baseline storage module (save/load/list/normalize URL)
2. Server: set_baseline MCP tool
3. Server: compare_baseline MCP tool
4. Server: list_baselines MCP tool
5. Server: HTTP endpoints (/baselines GET, POST, /baselines/compare)
6. Extension: Inspect tab captures section (fetch from server)
7. Extension: Set as Baseline button
8. Extension: Compare action + diff display
