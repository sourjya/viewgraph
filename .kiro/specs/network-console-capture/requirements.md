# Network & Console Capture - Requirements

## Overview

Enrich ViewGraph captures with network request state and console errors
present at snapshot time. These are the two highest-value context items
for AI agent debugging - they reveal root causes (failed API calls,
uncaught errors) that the DOM alone cannot show.

Both are extension-side capture enrichments that add new sections to the
existing ViewGraph JSON format. The MCP server surfaces them through
existing tools (`get_capture`, `get_page_summary`).

## FR-1: Network State Capture (M12.1)

### FR-1.1: Collect network requests
- Use `performance.getEntriesByType('resource')` to get completed requests
- Capture: URL, method (GET assumed for resource entries), status (from initiatorType),
  duration, transferSize, decodedBodySize, startTime
- Filter to XHR/fetch requests (initiatorType: 'xmlhttprequest', 'fetch')
- Also include document, script, stylesheet, img for full picture
- Cap at 100 entries (most recent)

### FR-1.2: Detect failed requests
- Use PerformanceObserver to watch for failed fetches (transferSize === 0 with duration > 0)
- Mark entries with `failed: true` when detectable
- Note: Performance API doesn't expose HTTP status codes directly

### FR-1.3: Capture format
- Add `NETWORK` section to capture JSON (sibling of NODES, DETAILS, etc.)
- Format: `{ requests: [...], summary: { total, failed, pending } }`
- Each request: `{ url, initiatorType, duration, transferSize, startTime, failed }`

### FR-1.4: Collector module
- `extension/lib/network-collector.js` - standalone module
- `collectNetworkState()` - returns network section data
- Must work in content script context (no service worker APIs)

## FR-2: Console Error Capture (M12.2)

### FR-2.1: Intercept console errors and warnings
- Override `console.error` and `console.warn` early in content script lifecycle
- Store intercepted messages with timestamp and stack trace
- Preserve original console behavior (call through to original)

### FR-2.2: Capture format
- Add `CONSOLE` section to capture JSON
- Format: `{ errors: [...], warnings: [...], summary: { errors, warnings } }`
- Each entry: `{ message, stack, timestamp }`
- Cap at 50 entries per level

### FR-2.3: Interceptor module
- `extension/lib/console-collector.js` - standalone module
- `installConsoleInterceptor()` - installs overrides, returns collector
- `getConsoleState()` - returns console section data
- Must be called as early as possible in content script

## FR-3: Integration

### FR-3.1: Wire into serializer
- `serialize()` accepts optional `network` and `console` parameters
- Adds them as top-level sections in the capture JSON

### FR-3.2: Server parser support
- `parseCapture()` extracts NETWORK and CONSOLE sections when present
- Backward compatible - old captures without these sections still parse

### FR-3.3: Surface in MCP tools
- `get_capture` returns full JSON including new sections (automatic)
- `get_page_summary` includes network/console summary counts

## Non-Functional Requirements

### NFR-1: Performance
- Network collection must complete in <50ms (reads from Performance API)
- Console interceptor must add <1ms overhead per console call

### NFR-2: Privacy
- Truncate request URLs to 200 chars (avoid leaking long query strings)
- Truncate console messages to 500 chars
- Never capture request/response bodies

### NFR-3: Backward Compatibility
- Captures without NETWORK/CONSOLE sections must continue to parse
- Format version stays at 2.2.0 (additive, non-breaking)
