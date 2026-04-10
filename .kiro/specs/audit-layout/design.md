# audit_layout - Design

## Architecture

Follows the same pattern as existing M2 analysis tools:
1. Validate filename via `validateCapturePath`
2. Read and parse capture with `parseCapture`
3. Run layout analysis on parsed data
4. Return structured JSON result

```
server/src/analysis/
  layout-analysis.js       (new - overlap/overflow detection logic)

server/src/tools/
  audit-layout.js          (new - MCP tool handler)

server/tests/unit/analysis/
  layout-analysis.test.js  (new - unit tests for analysis logic)

server/tests/unit/tools/
  audit-layout.test.js     (new - integration test for MCP tool)
```

## Layout Analysis Module: layout-analysis.js

Pure functions operating on parsed capture data. No file I/O.

### Data Structures

```javascript
// Input: parsed capture from parseCapture()
// - parsed.nodes: { high: [...], med: [...], low: [...] }
// - parsed.relations.parentChild: [{ parent, child }, ...]
// - parsed.metadata.viewport: { width, height }

// Output:
{
  overflows: [
    {
      childId, childTag, childText, childSelector,
      parentId, parentTag,
      overflow: { top: 0, right: 12, bottom: 0, left: 0 }
    }
  ],
  overlaps: [
    {
      elementA: { id, tag, text, selector },
      elementB: { id, tag, text, selector },
      parentId,
      overlapRect: { x, y, w, h },
      overlapArea: 480  // px squared
    }
  ],
  viewportOverflows: [
    {
      id, tag, text, selector,
      overflow: { top: 0, right: 40, bottom: 0, left: 0 }
    }
  ],
  summary: { overflows: 2, overlaps: 1, viewportOverflows: 1 }
}
```

### Core Functions

```javascript
// Build a lookup map: nodeId -> node (with bbox)
buildNodeMap(flatNodes) -> Map<string, Node>

// Build parent -> children[] map from relations
buildChildrenMap(relations) -> Map<string, string[]>

// Detect children overflowing their parent bbox
detectOverflows(nodeMap, childrenMap, tolerance = 1) -> Overflow[]

// Detect overlapping siblings within each parent
detectOverlaps(nodeMap, childrenMap, tolerance = 2) -> Overlap[]

// Detect elements extending beyond viewport
detectViewportOverflows(nodeMap, viewport, tolerance = 1) -> ViewportOverflow[]

// Main entry: runs all detections, returns full result
analyzeLayout(parsed) -> LayoutResult
```

### Overflow Detection Algorithm

For each parent-child pair in `childrenMap`:
1. Get parent bbox `{ x, y, w, h }`
2. Get child bbox
3. Compute overflow per edge:
   - top: `max(0, parentBbox.y - childBbox.y)`
   - left: `max(0, parentBbox.x - childBbox.x)`
   - bottom: `max(0, (childBbox.y + childBbox.h) - (parentBbox.y + parentBbox.h))`
   - right: `max(0, (childBbox.x + childBbox.w) - (parentBbox.x + parentBbox.w))`
4. If any edge > tolerance, report as overflow

### Overlap Detection Algorithm

For each parent in `childrenMap`:
1. Get all children with bboxes
2. For each pair of siblings (i, j) where j > i:
   - Compute intersection rect
   - If intersection area > tolerance^2, report as overlap

Intersection rect:
```
ix = max(a.x, b.x)
iy = max(a.y, b.y)
iw = min(a.x + a.w, b.x + b.w) - ix
ih = min(a.y + a.h, b.y + b.h) - iy
overlaps = iw > tolerance && ih > tolerance
```

### Viewport Overflow Algorithm

For each node with a bbox:
1. Compare against `{ x: 0, y: 0, w: viewport.width, h: viewport.height }`
2. Same edge computation as parent overflow
3. Report if any edge > tolerance

## MCP Tool: audit-layout.js

Standard tool registration following existing patterns.

### Tool Description (LLM prompt)

```
Audit a ViewGraph capture for layout issues: elements overflowing their
parent container, sibling elements that overlap, and elements extending
beyond the viewport. Returns issues with element IDs, selectors, and
overflow/overlap measurements in pixels.
```

### Zod Schema

```javascript
{ filename: z.string().describe("Capture filename") }
```

## Registration

Add to `server/index.js` alongside existing M2 tools.
Update tool count in README (15 -> 16).
