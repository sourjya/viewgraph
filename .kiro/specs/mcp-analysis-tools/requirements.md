# MCP Analysis Tools - Requirements

## Overview

Analysis tools query parsed ViewGraph captures to answer specific questions
about UI structure, accessibility, test coverage, and change detection.
They build on the core tools from M1 (which read/list/summarize captures)
by adding domain-specific analysis logic.

All tools read from the in-memory indexer + capture files on disk. None
modify captures. All return structured JSON via MCP text content.

## Functional Requirements

### FR-1: get_elements_by_role
- FR-1.1: Accept `filename` and `role` parameters
- FR-1.2: Role values: `button`, `link`, `input`, `heading`, `image`, `table`, `nav`, `form`
- FR-1.3: Return matching elements with id, tag, text, bbox, selector, attributes
- FR-1.4: Search across all salience tiers (high, med, low)
- FR-1.5: Return empty array (not error) when no elements match

### FR-2: get_interactive_elements
- FR-2.1: Accept `filename` parameter
- FR-2.2: Return all elements with actions (clickable, fillable, hoverable)
- FR-2.3: Include: id, tag, text, selector, actions, data-testid (if present), aria-label (if present)
- FR-2.4: Sort by salience (high first)

### FR-3: find_missing_testids
- FR-3.1: Accept `filename` parameter
- FR-3.2: Return interactive elements that lack `data-testid` attribute
- FR-3.3: Include: id, tag, text, selector, suggested testid
- FR-3.4: Suggested testid derived from tag + text content (kebab-case)

### FR-4: audit_accessibility
- FR-4.1: Accept `filename` parameter
- FR-4.2: Check for: missing aria-label on interactive elements, missing alt on images, missing form labels, buttons without accessible names
- FR-4.3: Return issues grouped by severity (error, warning)
- FR-4.4: Each issue includes: element id, tag, issue type, description, selector

### FR-5: compare_captures
- FR-5.1: Accept `file_a` and `file_b` parameters (two filenames)
- FR-5.2: Detect added elements (in B but not A)
- FR-5.3: Detect removed elements (in A but not B)
- FR-5.4: Detect layout changes (same element, different bbox)
- FR-5.5: Detect testid changes (added/removed data-testid attributes)
- FR-5.6: Match elements across captures by selector or id

### FR-6: get_annotations
- FR-6.1: Accept `filename` parameter
- FR-6.2: Return ANNOTATIONS section from review-mode captures
- FR-6.3: Return empty array for non-review captures (no error)
- FR-6.4: Each annotation includes: id, type, comment, selectedNodes, region, timestamp

### FR-7: get_annotated_capture
- FR-7.1: Accept `filename` and optional `annotation_id` parameters
- FR-7.2: Return capture filtered to only nodes referenced by annotations
- FR-7.3: Include full DETAILS for referenced nodes
- FR-7.4: Include the annotation comments alongside node data
- FR-7.5: If annotation_id provided, filter to that single annotation

## Non-Functional Requirements

### NFR-1: Performance
- All tools must respond in <500ms for captures up to 500 nodes

### NFR-2: Response Size
- Cap responses at ~100KB. Include truncation metadata if exceeded.

### NFR-3: Error Handling
- Invalid filenames: return `isError: true` with guidance message
- Missing files: return `isError: true` with suggestion to use list_captures
- Malformed captures: return `isError: true` with parse error details
