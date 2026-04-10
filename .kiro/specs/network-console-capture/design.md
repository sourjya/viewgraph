# Network & Console Capture - Design

## Architecture

```
extension/lib/
  network-collector.js     (new - reads Performance API)
  console-collector.js     (new - intercepts console.error/warn)
  serializer.js            (modified - accepts network/console params)

server/src/parsers/
  viewgraph-v2.js          (modified - extracts NETWORK/CONSOLE sections)

server/src/tools/
  get-page-summary.js      (modified - includes network/console counts)
```

## Network Collector: network-collector.js

```javascript
// Collect network state from Performance API
export function collectNetworkState() -> {
  requests: [
    { url, initiatorType, duration, transferSize, startTime, failed }
  ],
  summary: { total, failed, byType: { fetch: N, xmlhttprequest: N, ... } }
}
```

Implementation:
1. `performance.getEntriesByType('resource')` returns all resource loads
2. Filter and map to our format
3. Detect failures: `transferSize === 0 && duration > 0` heuristic
4. Truncate URLs to 200 chars
5. Sort by startTime descending, cap at 100

## Console Collector: console-collector.js

```javascript
// Install interceptors (call once, early)
export function installConsoleInterceptor() -> void

// Get collected state
export function getConsoleState() -> {
  errors: [{ message, stack, timestamp }],
  warnings: [{ message, stack, timestamp }],
  summary: { errors: N, warnings: N }
}
```

Implementation:
1. Save references to original `console.error` and `console.warn`
2. Replace with wrappers that store args + call original
3. `getConsoleState()` reads stored entries, truncates messages to 500 chars
4. Cap at 50 per level

## Serializer Changes

```javascript
// Updated signature
export function serialize(elements, relations, { network, console } = {}) {
  // ... existing code ...
  if (network) capture.network = network;
  if (console) capture.console = console;
  return capture;
}
```

## Server Parser Changes

In `parseCapture()`:
```javascript
// Add to parsed output (optional sections)
data.network = raw.network || null;
data.console = raw.console || null;
```

In `parseSummary()`:
```javascript
// Add counts to summary
data.networkSummary = raw.network?.summary || null;
data.consoleSummary = raw.console?.summary || null;
```

## Capture JSON Format (additive)

```json
{
  "metadata": { ... },
  "summary": { ... },
  "nodes": { ... },
  "relations": { ... },
  "details": { ... },
  "network": {
    "requests": [
      { "url": "/api/v1/pulse", "initiatorType": "fetch", "duration": 234, "transferSize": 1520, "startTime": 1200, "failed": false }
    ],
    "summary": { "total": 12, "failed": 1, "byType": { "fetch": 5, "script": 3, "stylesheet": 2, "img": 2 } }
  },
  "console": {
    "errors": [
      { "message": "No QueryClient set", "stack": "at App.tsx:12", "timestamp": "2026-04-10T15:30:00Z" }
    ],
    "warnings": [],
    "summary": { "errors": 1, "warnings": 0 }
  }
}
```
