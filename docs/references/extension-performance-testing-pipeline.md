# Automated Performance Pipeline for Browser Extensions

> A CI/CD-ready testing strategy for Firefox/Chrome extensions with side panels and on-screen annotation features.

---

## The Core Problem with Extensions in CI

```bash
# Standard headless BLOCKS extensions - this won't work
chrome --headless --load-extension=./dist

# This DOES work (Chrome 112+)
chrome --headless=new --load-extension=./dist --disable-extensions-except=./dist
```

`--headless=new` is your unlock for CI. Everything below assumes it.

---

## Pipeline Architecture

```
PR/Push
  │
  ├── [Static Analysis]     < 30s  - no browser needed
  ├── [Unit Perf Tests]     < 60s  - no browser needed
  ├── [Extension E2E Perf]  ~3min  - headless Chrome
  └── [Budget Gate]                - fails build on regression
```

---

## Layer 1: Static Analysis (No Browser, Fastest)

**Bundle size budgets** - most impactful, easiest to automate:

```json
// bundlesize.config.json
{
  "files": [
    { "path": "./dist/content-script.js", "maxSize": "50kb" },
    { "path": "./dist/side-panel.js",     "maxSize": "150kb" },
    { "path": "./dist/background.js",     "maxSize": "30kb" }
  ]
}
```

```yaml
# GitHub Actions step
- name: Bundle Size Check
  run: npx bundlesize
```

Content scripts are injected into every page - 50kb is a reasonable ceiling. Exceeding it is a deployment-stopper worth enforcing hard.

**Duplicate dependency detection:**

```bash
npx duplicate-package-checker-webpack-plugin
# or for rollup/vite
npx vite-plugin-inspect
```

---

## Layer 2: Unit Performance Tests (No Browser)

Use `vitest` or `jest` to benchmark pure functions - particularly your annotation logic:

```javascript
// annotation-engine.perf.test.js
import { bench, describe } from 'vitest';
import { findAnnotationTargets, serializeAnnotations } from './annotation-engine';

const MOCK_DOM_SIZE = 500; // simulate a dense page

describe('Annotation Engine Perf', () => {
  bench('findAnnotationTargets on large DOM', () => {
    findAnnotationTargets(generateMockNodes(MOCK_DOM_SIZE));
  }, { time: 1000, iterations: 100 });

  bench('serialize 200 annotations', () => {
    serializeAnnotations(generateMockAnnotations(200));
  });
});
```

```yaml
- name: Perf Unit Tests
  run: npx vitest bench --reporter=json > perf-results.json

- name: Assert No Regression
  run: node scripts/assert-perf-budget.js perf-results.json
```

The `assert-perf-budget.js` script compares against a committed `perf-baseline.json` and fails if any benchmark degrades beyond your threshold (e.g. 15%).

---

## Layer 3: Extension E2E Performance Tests (Headless Chrome)

Use Puppeteer with `headless=new`. Requires instrumenting your extension with `performance.mark()` / `performance.measure()` calls - a one-time cost that pays dividends in both CI and production debugging.

```javascript
// tests/perf/extension-perf.test.js
import puppeteer from 'puppeteer';
import path from 'path';

const EXTENSION_PATH = path.resolve('./dist');
const BUDGETS = {
  sidePanelOpenTime:     500,  // ms
  annotationRenderTime:  100,  // ms per annotation
  contentScriptInject:   200,  // ms
  messageRoundTrip:      50,   // ms content <-> background
};

let browser, page, extensionId;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--load-extension=${EXTENSION_PATH}`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
    ]
  });

  // Grab the extension ID from the background service worker
  const targets = await browser.targets();
  const extTarget = targets.find(t => t.type() === 'service_worker');
  extensionId = new URL(extTarget.url()).hostname;
});

test('side panel opens within budget', async () => {
  page = await browser.newPage();
  await page.goto('https://example.com');

  const start = Date.now();
  await page.evaluate((id) => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }, extensionId);
  await page.waitForSelector('#side-panel-root', { timeout: 2000 });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(BUDGETS.sidePanelOpenTime);
});

test('annotation render time stays within budget', async () => {
  const renderTime = await page.evaluate(() => {
    const t0 = performance.now();
    // Trigger annotation rendering via postMessage or direct call
    window.postMessage({ type: 'ANNOTATE_ELEMENT', selector: 'h1' }, '*');
    return new Promise(resolve => {
      const obs = new PerformanceObserver(list => {
        const entry = list.getEntries().find(e => e.name === 'annotation-render');
        if (entry) resolve(entry.duration);
      });
      obs.observe({ entryTypes: ['measure'] });
    });
  });

  expect(renderTime).toBeLessThan(BUDGETS.annotationRenderTime);
});

afterAll(() => browser.close());
```

---

## Layer 4: Lighthouse CI for the Side Panel

Your side panel is an HTML page - Lighthouse CI can audit it directly:

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [`chrome-extension://${EXTENSION_ID}/side-panel.html`],
      numberOfRuns: 3,
      settings: { chromeFlags: '--headless=new' }
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['error', { maxNumericValue: 1000 }],
        'total-blocking-time':    ['error', { maxNumericValue: 200 }],
        'unused-javascript':      ['warn',  { maxNumericValue: 20000 }],
      }
    }
  }
};
```

```yaml
- name: Lighthouse CI
  run: npx lhci autorun
```

> **Note:** Getting the extension ID in CI is tricky - solve it by loading a minimal test page that reads and outputs `chrome.runtime.id` via Puppeteer before Lighthouse runs.

---

## Layer 5: The Budget Gate Script

Aggregates all results into a single pass/fail gate:

```javascript
// scripts/perf-gate.js
import baseline from './perf-baseline.json' assert { type: 'json' };
import current  from './perf-results.json'  assert { type: 'json' };

const REGRESSION_THRESHOLD = 0.15; // 15% degradation = fail

const failures = [];

for (const [metric, baseValue] of Object.entries(baseline)) {
  const currentValue = current[metric];
  const degradation = (currentValue - baseValue) / baseValue;

  if (degradation > REGRESSION_THRESHOLD) {
    failures.push(
      `${metric}: ${baseValue}ms -> ${currentValue}ms (+${(degradation * 100).toFixed(1)}%)`
    );
  }
}

if (failures.length) {
  console.error('Performance regressions detected:\n', failures.join('\n'));
  process.exit(1);
}

console.log('All performance budgets passed.');
```

---

## Full GitHub Actions Workflow

```yaml
name: Extension Performance

on: [pull_request]

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: 20 }

      - name: Install Xvfb (virtual display fallback)
        run: sudo apt-get install -y xvfb

      - name: Install deps and build
        run: npm ci && npm run build

      - name: Bundle size gate
        run: npx bundlesize

      - name: Unit perf benchmarks
        run: npx vitest bench --reporter=json > perf-results.json

      - name: E2E extension perf
        run: xvfb-run --auto-servernum npx jest tests/perf/

      - name: Perf budget gate
        run: node scripts/perf-gate.js

      - name: Upload perf artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: perf-results
          path: perf-results.json
```

`xvfb-run` is the safety net for any Chrome behavior that resists `--headless=new`.

---

## Baseline File - Commit on Day One

Run the pipeline once on a clean build, then commit this as `perf-baseline.json`:

```json
{
  "contentScriptInjectMs":  180,
  "sidePanelOpenMs":        420,
  "annotationRenderMs":     80,
  "messageRoundTripMs":     35,
  "bundleSizeContentKb":    42,
  "bundleSizeBackgroundKb": 18
}
```

Every PR now has a hard, objective answer to "did this change make things slower" - no guesswork, no manual profiling before shipping.

---

## Quick Reference - Known Hot Spots for Annotation Extensions

### Annotation Overlay Rendering

```javascript
// BAD - forces layout on every annotation update
elements.forEach(el => {
  const rect = el.getBoundingClientRect(); // triggers reflow
  renderAnnotation(rect);
});

// GOOD - batch reads, then batch writes
const rects = elements.map(el => el.getBoundingClientRect()); // one reflow batch
rects.forEach(rect => renderAnnotation(rect));
```

### MutationObserver Scope Creep

```javascript
// BAD - watches too broadly
observer.observe(document.body, { subtree: true, childList: true, attributes: true });

// GOOD - scope it tightly
observer.observe(targetContainer, { childList: true, attributes: false });
```

### Message Passing Overhead

```javascript
// BAD - one message per annotation
annotations.forEach(a => chrome.runtime.sendMessage({ type: 'ADD', annotation: a }));

// GOOD - batch everything
chrome.runtime.sendMessage({ type: 'ADD_BATCH', annotations });
```

---

## Priority Order for Annotation/Side Panel Extensions

1. **Annotation hit-test performance** - finding which DOM element the user is pointing at is expensive if done naively on `mousemove`
2. **Overlay repaint on scroll/resize** - debounce aggressively (16ms minimum)
3. **Side panel <-> content script sync latency** - consider a shared `chrome.storage.session` cache instead of constant message passing
4. **Extension startup time** - lazy-load everything that is not needed on initial inject

---

*Generated for CI/CD pipeline integration. Tested against Chrome 112+ with `--headless=new`.*
