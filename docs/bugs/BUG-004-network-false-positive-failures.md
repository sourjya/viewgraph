# BUG-004: Network Collector False-Positive Failures on Cached Resources

**ID:** BUG-004
**Severity:** Major
**Status:** FIXED
**Date:** 2026-04-10

## Description

The network collector's Inspect tab reported 21 failed requests on a standard
Vite dev server page. All flagged requests were successfully served - they
were Vite module chunks (`/node_modules/.vite/deps/...`) loaded from the dev
server's in-memory cache.

## Root Cause

The failure detection heuristic in `network-collector.js` was:

```js
const isFailed = e.transferSize === 0 && e.duration > 0;
```

This checks the Performance API's `transferSize` field. The assumption was
that a completed request (`duration > 0`) with zero bytes transferred must
have failed.

The assumption is wrong. The Performance Resource Timing API reports
`transferSize: 0` for any resource served from cache - browser disk cache,
memory cache, service worker cache, or a dev server's in-memory module
store. These are successful requests that simply didn't go over the network.

The key distinction is `decodedBodySize`:
- **Failed request:** `transferSize: 0` AND `decodedBodySize: 0` - the
  browser got nothing at all
- **Cached request:** `transferSize: 0` AND `decodedBodySize: > 0` - the
  browser got content, just not from the network

Per the [Resource Timing Level 2 spec](https://www.w3.org/TR/resource-timing-2/),
`decodedBodySize` represents the size of the payload body after decoding,
regardless of how it was delivered. A cached 200 response has
`decodedBodySize > 0` even with `transferSize: 0`.

## Fix

```js
// Before (false positives on cached resources)
const isFailed = e.transferSize === 0 && e.duration > 0;

// After (only flags truly empty responses)
const isFailed = e.transferSize === 0 && e.decodedBodySize === 0 && e.duration > 0;
```

## Impact

- Vite, Webpack, Parcel dev servers no longer show false failures
- Browser-cached resources (304 responses, service worker) no longer flagged
- Actual failures (network errors, CORS blocks, 0-byte responses) still detected
- The Inspect tab's "N failed" badge now reflects real problems

## Files Changed

- `extension/lib/network-collector.js` - failure detection heuristic

## Reproduction

1. Open any Vite dev server app in Chrome
2. Enter ViewGraph annotate mode
3. Click Inspect tab
4. Network section showed "21 failed" - all Vite module chunks
5. After fix: 0 failed (unless there are actual failures)
