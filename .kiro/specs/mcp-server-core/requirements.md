# MCP Server Core Tools — Requirements

## Overview

The ViewGraph MCP server must read existing capture JSON files from a watched
directory and expose core query tools to Kiro (or any MCP host). This is the
foundation — all analysis tools, bidirectional communication, and extension
integration depend on this working reliably.

## Functional Requirements

### FR-1: File Watching
- FR-1.1: Watch `VIEWGRAPH_CAPTURES_DIR` for new `.json` files
- FR-1.2: Use chokidar (not `fs.watch`) for cross-platform reliability (WSL/Windows)
- FR-1.3: Detect new files, changed files, and deleted files
- FR-1.4: Ignore non-JSON files and temporary/partial writes

### FR-2: Capture Indexing
- FR-2.1: On startup, scan captures directory and index all existing `.json` files
- FR-2.2: Parse `====METADATA====` section from each capture to extract: url, title, timestamp, viewport, stats
- FR-2.3: Maintain in-memory index mapping filename → metadata
- FR-2.4: Update index when watcher detects changes
- FR-2.5: Cap index at `maxCapturesInMemory` (default 50), evict oldest first

### FR-3: ViewGraph v2 Parser
- FR-3.1: Parse all sections: METADATA, NODES, SUMMARY, RELATIONS, DETAILS, ANNOTATIONS
- FR-3.2: Handle malformed JSON gracefully — log error, skip file, don't crash
- FR-3.3: Validate format version field in METADATA

### FR-4: Tool — `list_captures`
- FR-4.1: Input: `{ limit?, url_filter? }`
- FR-4.2: Return array of `{ filename, url, title, timestamp, node_count }`
- FR-4.3: Sort by timestamp descending (newest first)
- FR-4.4: Default limit: 20, max limit: 100
- FR-4.5: url_filter matches as substring against capture URL

### FR-5: Tool — `get_latest_capture`
- FR-5.1: Input: `{ url_filter? }`
- FR-5.2: Return the most recent capture matching the filter
- FR-5.3: If capture JSON > 100KB, return summary instead of full JSON
- FR-5.4: Return error if no captures match

### FR-6: Tool — `get_capture`
- FR-6.1: Input: `{ filename }`
- FR-6.2: Return full ViewGraph JSON for the specified file
- FR-6.3: Validate filename against captures directory (no path traversal)
- FR-6.4: Return error if file not found

### FR-7: Tool — `get_page_summary`
- FR-7.1: Input: `{ filename }`
- FR-7.2: Extract and return: url, title, viewport, layout info, style summary, element counts by salience, cluster count
- FR-7.3: This is the lightweight alternative to get_capture — always small enough for LLM context

## Non-Functional Requirements

### NFR-1: Performance
- Startup index scan must complete in < 1s for 50 captures
- Tool responses must return in < 500ms for typical captures

### NFR-2: Security
- All file paths validated against VIEWGRAPH_CAPTURES_DIR root
- No path traversal via `../` or absolute paths in tool inputs

### NFR-3: Reliability
- Malformed captures must not crash the server
- File watcher must recover from transient filesystem errors

### NFR-4: Observability
- All errors logged to stderr with `[viewgraph]` prefix
- Startup logs: captures dir, number of indexed files, HTTP port (if enabled)
