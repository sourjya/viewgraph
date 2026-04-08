# Extension Core - Requirements

## Overview

Build the core capture pipeline: user clicks a button in the popup, the
extension traverses the DOM, scores salience, serializes to ViewGraph v2.1
JSON, and pushes the result to the MCP server's HTTP receiver.

## Functional Requirements

### FR-1: Content Script - DOM Traversal
- FR-1.1: Walk the full DOM tree starting from `document.body`
- FR-1.2: For each element, extract: tag, id, classes, data-testid, aria attributes, text content, bounding box, computed role
- FR-1.3: Build parent-child relationships using compact nid integers
- FR-1.4: Generate human-readable aliases (tag:testid > tag:id > tag:role-name > tag:nNNN)
- FR-1.5: Extract computed styles for visible elements (display, position, colors, fonts, spacing)
- FR-1.6: Skip invisible elements (display:none, visibility:hidden, zero-size)
- FR-1.7: Handle iframes gracefully (skip cross-origin, traverse same-origin)

### FR-2: Salience Scoring
- FR-2.1: Score each element based on: interactivity, visibility, semantic role, testid presence, size, viewport position
- FR-2.2: Classify into high/med/low tiers
- FR-2.3: High: interactive elements, elements with testid/aria, large visible elements
- FR-2.4: Med: elements with text content, semantic tags, moderate size
- FR-2.5: Low: wrappers, decorative elements, small/hidden elements

### FR-3: Serializer
- FR-3.1: Output ViewGraph v2.1 JSON with all required sections: metadata, summary, nodes, relations, details
- FR-3.2: Metadata includes: format, version, url, title, viewport, timestamp, stats, coordinate frame
- FR-3.3: Nodes grouped by salience tier then tag
- FR-3.4: Details include locators (testid, css selector), attributes, text, bbox, styles
- FR-3.5: Summary includes page overview, style palette, element counts

### FR-4: Popup UI
- FR-4.1: "Capture Page" button that triggers full-page capture
- FR-4.2: Status display showing capture progress
- FR-4.3: Success state showing filename and node count

### FR-5: Background Script - Capture Orchestration
- FR-5.1: Receive capture request from popup
- FR-5.2: Inject content script into active tab
- FR-5.3: Receive capture data from content script
- FR-5.4: POST capture JSON to MCP server HTTP receiver (localhost:9876/captures)
- FR-5.5: Handle errors gracefully (server not running, tab closed, etc.)

### FR-6: Screenshot
- FR-6.1: Capture visible tab screenshot via `chrome.tabs.captureVisibleTab`
- FR-6.2: Include screenshot filename in capture metadata

## Non-Functional Requirements

### NFR-1: Performance
- Capture should complete in <3 seconds for pages with <1000 elements
- Content script must not block the page's main thread for >100ms at a time

### NFR-2: Size Budget
- Output JSON should target <400KB (degrade gracefully for larger pages)

### NFR-3: Compatibility
- Must work in Chrome (dev) and Firefox (production)
- Use WXT for cross-browser builds
