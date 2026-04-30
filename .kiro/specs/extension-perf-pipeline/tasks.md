# Extension Performance Pipeline - Tasks

## Phase 1: Static Analysis + Unit Benchmarks (no browser needed)

### Task 1.1: Bundle size config and gate
- [ ] Create `extension/bundlesize.config.json` with content script (50KB) and background (30KB) budgets
- [ ] Add `bundlesize` as devDependency
- [ ] Add `npm run check:bundle` script that builds then runs bundlesize
- [ ] Verify current build passes budgets
- **Deliverable:** `npm run check:bundle` passes

### Task 1.2: Traverser benchmark
- [ ] Create `extension/tests/bench/traverser.bench.js`
- [ ] Generate 500-element mock DOM using jsdom
- [ ] Benchmark `traverseDOM()` with vitest bench
- [ ] Assert < 200ms median
- **Deliverable:** `npx vitest bench tests/bench/traverser.bench.js` runs and reports

### Task 1.3: Serializer benchmark
- [ ] Create `extension/tests/bench/serializer.bench.js`
- [ ] Use traverser output from Task 1.2 as input
- [ ] Benchmark `serialize()` with vitest bench
- [ ] Assert < 100ms median
- **Deliverable:** `npx vitest bench tests/bench/serializer.bench.js` runs and reports

### Task 1.4: Baseline and gate script
- [ ] Run benchmarks, capture output to `scripts/perf-baseline.json`
- [ ] Create `scripts/perf-gate.js` that compares current vs baseline (15% threshold)
- [ ] Add `npm run check:perf` script
- **Deliverable:** `npm run check:perf` passes on clean build

## Phase 2: E2E Extension Performance (Puppeteer + headless Chrome)

### Task 2.1: Puppeteer test harness
- [ ] Add `puppeteer` as devDependency
- [ ] Create `extension/tests/perf/extension-perf.test.js`
- [ ] Launch Chrome with `--headless=new --load-extension`
- [ ] Discover extension ID from service worker target
- [ ] Navigate to `docs/demo/index.html`
- **Deliverable:** Test launches extension and navigates without error

### Task 2.2: Sidebar open time measurement
- [ ] Trigger sidebar open via message to background script
- [ ] Wait for sidebar shadow host in DOM
- [ ] Assert open time < 500ms
- **Deliverable:** Test passes with timing output

### Task 2.3: Capture time measurement
- [ ] Trigger DOM capture via extension message
- [ ] Wait for capture completion event
- [ ] Assert capture time < 2000ms on demo page
- **Deliverable:** Test passes with timing output

### Task 2.4: Annotation render time
- [ ] Add `performance.mark`/`performance.measure` to annotation overlay code
- [ ] Measure annotation render via PerformanceObserver in Puppeteer
- [ ] Assert < 100ms per annotation
- **Deliverable:** Test passes with timing output

## Phase 3: CI Integration

### Task 3.1: GitHub Actions workflow
- [ ] Create `.github/workflows/perf.yml`
- [ ] Steps: checkout, setup node, install, build, bundle size, unit bench, E2E perf, gate
- [ ] Use `xvfb-run` for E2E step
- [ ] Upload `perf-results.json` as artifact
- **Deliverable:** Workflow runs on PR and reports pass/fail

### Task 3.2: Add perf checks to release.sh
- [ ] Add `npm run check:bundle` to release.sh pre-flight checks
- [ ] Add `npm run check:perf` to release.sh pre-flight checks
- [ ] Both must pass before version bump proceeds
- **Deliverable:** Release script blocks on perf regression

## Checkpoint

- [ ] All Phase 1 tasks pass locally
- [ ] All Phase 2 tasks pass locally
- [ ] CI workflow runs green on a test PR
- [ ] release.sh includes perf gates
- [ ] Baseline committed to repo
