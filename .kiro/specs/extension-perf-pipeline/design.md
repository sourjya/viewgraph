# Extension Performance Pipeline - Design

## Architecture

```
PR/Push
  |
  +-- [Layer 1: Static]     < 30s   bundlesize check (no browser)
  +-- [Layer 2: Unit Bench]  < 60s   vitest bench (no browser)
  +-- [Layer 3: E2E Perf]   ~3min   Puppeteer + headless Chrome
  +-- [Layer 4: Gate]                perf-gate.js aggregates pass/fail
```

## File Layout

```
scripts/
  perf-gate.js              # Budget gate aggregator
  perf-baseline.json        # Committed baseline metrics

extension/
  bundlesize.config.json    # Bundle size budgets
  tests/
    bench/
      traverser.bench.js    # DOM traversal benchmark
      serializer.bench.js   # Capture serialization benchmark
    perf/
      extension-perf.test.js  # Puppeteer E2E perf tests

.github/
  workflows/
    perf.yml                # GitHub Actions workflow
```

## Layer 1: Bundle Size

Use `bundlesize` npm package against wxt build output:

```json
{
  "files": [
    { "path": "extension/.output/chrome-mv3/content-scripts/content.js", "maxSize": "50kb" },
    { "path": "extension/.output/chrome-mv3/background.js", "maxSize": "30kb" }
  ]
}
```

The sidebar is injected via content script (not a separate HTML page), so the content script budget is the critical one.

## Layer 2: Unit Benchmarks

Vitest `bench` mode against real functions with mock DOM data:

- **traverser.bench.js**: `traverseDOM()` with jsdom document of 500 elements
- **serializer.bench.js**: `serialize()` with 500-element traversal output

Baseline stored in `scripts/perf-baseline.json`. Gate script compares current run against baseline with 15% threshold.

## Layer 3: E2E Performance

Puppeteer launches Chrome with `--headless=new --load-extension=./dist`:

1. Discover extension ID from service worker target
2. Navigate to `docs/demo/index.html` (controlled test page)
3. Trigger sidebar open via `chrome.runtime.sendMessage`
4. Measure: sidebar mount time, capture time, annotation render time
5. Assert against budgets

Key: the demo page is committed to the repo, so the test environment is deterministic.

## Layer 4: Budget Gate

`scripts/perf-gate.js` reads both JSON files, computes degradation percentage per metric, exits 1 if any exceed 15%.

## Integration with Existing Tests

- Bench tests live in `extension/tests/bench/` (separate from `unit/` and `integration/`)
- E2E perf tests live in `extension/tests/perf/`
- Neither directory is included in the default `vitest run` command
- Bench: `npx vitest bench`
- E2E perf: `npx jest tests/perf/` (Puppeteer, not vitest)

## ViewGraph-Specific Hot Spots to Benchmark

From the reference doc, mapped to ViewGraph code:

| Hot Spot | ViewGraph File | Benchmark |
|---|---|---|
| Annotation hit-test (mousemove) | `extension/lib/annotate.js` | findAnnotationTargets on 500 nodes |
| Overlay repaint on scroll | `extension/lib/overlay.js` | Scroll handler debounce timing |
| Content <-> background sync | `extension/entrypoints/content.js` | Message round-trip latency |
| DOM traversal | `extension/lib/capture/traverser.js` | traverseDOM on 500-element page |
| Serialization | `extension/lib/capture/serializer.js` | serialize 500 elements |
| MutationObserver scope | `extension/lib/session/continuous-capture.js` | Observer callback frequency |
