# audit_layout - Requirements

## Overview

Layout analysis tool that detects overlap and overflow issues from ViewGraph
capture data. Uses bounding boxes, parent-child relations, and viewport
dimensions to identify elements that overflow their parent container or
overlap sibling elements.

Motivated by agent feedback: layout bugs are the hardest to debug without
seeing the page. Pre-computed overlap/overflow data lets agents fix CSS
issues immediately instead of manually computing bbox intersections.

## Functional Requirements

### FR-1: Overflow Detection
- FR-1.1: Detect elements whose bbox extends beyond their parent's bbox
- FR-1.2: Report overflow direction (top, right, bottom, left) and amount in px
- FR-1.3: Use parentChild relations to determine parent-child pairs
- FR-1.4: Skip root-level elements (no parent) - they can't overflow
- FR-1.5: Ignore overflow of 1px or less (sub-pixel rendering tolerance)

### FR-2: Overlap Detection
- FR-2.1: Detect sibling elements whose bounding boxes intersect
- FR-2.2: Report overlap area in px (width x height of intersection rect)
- FR-2.3: Siblings are elements sharing the same parent in parentChild relations
- FR-2.4: Ignore overlap of 2px or less (border/shadow tolerance)
- FR-2.5: Only check siblings within the same parent - not all element pairs

### FR-3: Viewport Overflow
- FR-3.1: Detect elements whose bbox extends beyond viewport bounds
- FR-3.2: Report which edge is exceeded and by how much
- FR-3.3: Use viewport dimensions from capture metadata

### FR-4: MCP Tool Interface
- FR-4.1: Tool name: `audit_layout`
- FR-4.2: Accept `filename` parameter (required)
- FR-4.3: Return structured JSON with `overflows`, `overlaps`, `viewportOverflows` arrays
- FR-4.4: Each issue includes element id, tag, text, selector, and issue-specific data
- FR-4.5: Return empty arrays (not errors) when no issues found
- FR-4.6: Return `summary` with total counts per category

## Non-Functional Requirements

### NFR-1: Performance
- Respond in <500ms for captures up to 500 nodes

### NFR-2: Response Size
- Cap at ~100KB. Truncate with metadata if exceeded.

### NFR-3: Error Handling
- Invalid filename: `isError: true` with guidance
- Missing file: `isError: true` suggesting list_captures
