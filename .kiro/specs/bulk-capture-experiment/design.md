# Bulk Capture Experiment - Design

## Architecture

```
Puppeteer (headless Chrome)
┌─────────────────────────────────────────────────┐
│  For each site:                                 │
│  1. page.goto(url, { waitUntil: 'networkidle2'})│
│  2. page.evaluate(() => {                       │
│       // Inject traverser + salience + serializer│
│       const { elements, relations } = traverseDOM()│
│       const scored = scoreAll(elements, viewport)│
│       return serialize(scored, relations)        │
│     })                                          │
│  3. page.evaluate(() => captureSnapshot())      │
│  4. page.screenshot({ fullPage: false })        │
└─────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    capture.json   snapshot.html   screenshot.png
         │              │              │
         └──────────────┼──────────────┘
                        ▼
                  analyze.js
                        │
                        ▼
              report.json + report.md
```

## Key Design Decision: Direct Module Injection

The extension's capture modules (`traverser.js`, `salience.js`,
`serializer.js`, `html-snapshot.js`) are designed to run in a page
context (they use `document`, `window`). Puppeteer's `page.evaluate()`
runs code in the page context too.

However, we can't use ES module imports inside `page.evaluate()`. The
approach is to:

1. Read the source files at startup
2. Bundle the needed functions into a single string
3. Use `page.addScriptTag({ content: bundledCode })` to inject
4. Then `page.evaluate()` to call the injected functions

This avoids needing a build step or bundler. We concatenate the
dependency chain manually since it's small and linear:
`visibility-collector.js` -> `traverser.js` -> `salience.js` ->
`serializer.js` (and separately `html-snapshot.js`).

## Directory Structure

```
scripts/experiments/bulk-capture/
├── package.json          # puppeteer dependency only
├── run.js                # CLI orchestrator
├── sites.js              # curated site list (150 URLs)
├── capture.js            # Puppeteer capture logic per site
├── analyze.js            # cross-type comparison + aggregation
├── bundle.js             # reads extension modules, builds injectable string
└── results/              # gitignored, created at runtime
    └── run-2026-04-12T12-00-00/
        ├── metadata.json
        ├── sites/
        │   ├── example-com/
        │   │   ├── capture.json
        │   │   ├── snapshot.html
        │   │   ├── screenshot.png
        │   │   └── metrics.json
        │   └── ...
        ├── report.json
        └── report.md
```

## Module Design

### bundle.js - Extension Code Bundler

Reads the extension source files and produces a single injectable
script string. Handles the dependency chain:

```
visibility-collector.js  (checkRendered)
       ↓
traverser.js             (traverseDOM)
       ↓
salience.js              (scoreAll, classifyTier, scoreElement)
       ↓
serializer.js            (serialize)

html-snapshot.js         (captureSnapshot) - independent
```

Each module's `export` statements are stripped and functions are
exposed on a `window.__vg` namespace for `page.evaluate()` access.

### capture.js - Per-Site Capture

```javascript
async function captureSite(page, url, outputDir) {
  const result = { url, status: 'ok', errors: [], timing: {} };

  // Navigate
  const navStart = Date.now();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  result.timing.navigation = Date.now() - navStart;

  // ViewGraph JSON capture
  const vgStart = Date.now();
  const capture = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const { elements, relations } = window.__vg.traverseDOM();
    const scored = window.__vg.scoreAll(elements, viewport);
    return window.__vg.serialize(scored, relations);
  });
  result.timing.viewgraph = Date.now() - vgStart;

  // HTML snapshot
  const htmlStart = Date.now();
  const html = await page.evaluate(() => window.__vg.captureSnapshot());
  result.timing.snapshot = Date.now() - htmlStart;

  // Screenshot
  const ssStart = Date.now();
  const screenshot = await page.screenshot({ fullPage: false });
  result.timing.screenshot = Date.now() - ssStart;

  // Write outputs
  await writeFile(join(outputDir, 'capture.json'), JSON.stringify(capture));
  await writeFile(join(outputDir, 'snapshot.html'), html);
  await writeFile(join(outputDir, 'screenshot.png'), screenshot);

  return result;
}
```

### analyze.js - Comparison Engine

Per-site metrics:
```json
{
  "url": "https://example.com",
  "category": "static",
  "viewgraph": {
    "nodeCount": 142,
    "sizeBytes": 89400,
    "salience": { "high": 12, "med": 45, "low": 85 },
    "interactiveCount": 8,
    "captureTimeMs": 340
  },
  "snapshot": {
    "elementCount": 198,
    "sizeBytes": 156000,
    "captureTimeMs": 120
  },
  "screenshot": {
    "sizeBytes": 245000,
    "width": 1280,
    "height": 720,
    "captureTimeMs": 80
  },
  "comparison": {
    "elementCoverage": 0.717,
    "sizeRatio": { "vgToHtml": 0.573, "vgToPng": 0.365 },
    "informationDensity": "VG captures 71.7% of elements in 57.3% of the space"
  },
  "status": "ok"
}
```

Aggregate report sections:
- Overall success rates per capture type
- Timing percentiles (p50, p95, p99)
- Size percentiles
- Category breakdown
- Failure analysis (grouped by error type)
- Top 10 largest captures, top 10 smallest
- Sites where VG coverage < 50% (investigation targets)

### run.js - Orchestrator

```
Usage: node run.js [options]

Options:
  --sites N        Capture first N sites (default: all)
  --concurrency N  Parallel browser pages (default: 3)
  --category X     Filter to one category
  --resume         Skip sites with existing results
  --timeout N      Per-site timeout in seconds (default: 30)
```

Flow:
1. Parse CLI args
2. Build injectable bundle from extension sources
3. Launch Puppeteer browser
4. Create worker pool (N pages)
5. Feed sites through workers
6. Collect results
7. Run analysis
8. Write report
9. Close browser

## Viewport and Browser Config

- Viewport: 1280x720 (standard desktop)
- User agent: default Puppeteer (headless Chrome)
- JavaScript enabled
- No ad blocker or content blocker
- Cookies/storage cleared between sites

## Error Categories

| Category | Example | Handling |
|---|---|---|
| `nav-timeout` | Site took >20s to load | Record error, skip captures |
| `nav-error` | DNS failure, SSL error, HTTP 4xx/5xx | Record error, skip captures |
| `capture-crash` | traverseDOM() threw | Record error, continue to next type |
| `capture-timeout` | evaluate() hung >10s | Record error, continue to next type |
| `capture-empty` | 0 nodes returned | Record as warning, save empty capture |
| `screenshot-fail` | captureVisibleTab failed | Record error, continue |
