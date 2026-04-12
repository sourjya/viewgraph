# Bulk Capture Experiment - Tasks

## Task 1: Create experiment directory and package.json
- [ ] Create `scripts/experiments/bulk-capture/` directory
- [ ] Create `package.json` with puppeteer dependency
- [ ] Add `.gitignore` for `results/` and `node_modules/`
- [ ] Verify `npm install` works

## Task 2: Build the site list module (sites.js)
- [ ] Create `sites.js` with 150 curated URLs
- [ ] 10+ categories with 10-20 sites each
- [ ] Each entry: `{ url, category, complexity }` where complexity is `simple|moderate|complex`
- [ ] Export `getSites(options)` function with category/limit filtering

## Task 3: Build the bundle module (bundle.js)
- [ ] Read extension source files: visibility-collector, traverser, salience, serializer, html-snapshot
- [ ] Strip ES module import/export syntax
- [ ] Resolve the dependency chain (checkRendered -> traverseDOM -> scoreAll -> serialize)
- [ ] Expose all functions on `window.__vg` namespace
- [ ] Export `buildBundle()` that returns the injectable script string

## Task 4: Build the capture runner (capture.js)
- [x] `captureSite(page, url, outputDir, bundle)` function
- [x] Inject bundle via `page.addScriptTag()`
- [x] Collect ground-truth DOM inventory via `page.evaluate(collectGroundTruth)`
- [x] Run ViewGraph JSON capture via `page.evaluate()`
- [x] Run deep accuracy measurement via `page.evaluate(measureAccuracy, capture)`
- [x] Run HTML snapshot capture via `page.evaluate()`
- [x] Run screenshot via `page.screenshot()`
- [x] Record timing for each phase (navigation, groundTruth, vg, accuracy, snapshot, screenshot)
- [x] Catch and categorize all errors (nav-timeout, capture-crash, gt-crash, accuracy-crash, etc.)
- [x] Write outputs to `outputDir/`
- [x] Return per-site result object with metrics, groundTruth, and accuracy

## Task 5: Build the analysis module (analyze.js)
- [x] `analyzeAll(resultsDir)` - aggregate across all sites
- [x] 7-dimension accuracy scorecard with configurable weights
- [x] Per-dimension deep dives: element recall, testid recall, interactive recall, selector accuracy, bbox accuracy, text accuracy, semantic recall
- [x] Ground truth summary from in-page DOM inventory
- [x] Accuracy breakdown by category and complexity
- [x] Worst/best sites for investigation
- [x] Operational metrics: timing, sizes, success rates, failures
- [x] Generate `report.json` (machine-readable) and `report.md` (human-readable)

## Task 6: Build the orchestrator (run.js)
- [ ] CLI arg parsing: --sites, --concurrency, --category, --resume, --timeout
- [ ] Create timestamped results directory
- [ ] Build injectable bundle
- [ ] Launch Puppeteer browser
- [ ] Worker pool: N concurrent pages processing sites
- [ ] Progress output to stderr
- [ ] Resume support: skip sites with existing results
- [ ] SIGINT handler: close browser gracefully
- [ ] Run analysis after all captures complete
- [ ] Write final report
