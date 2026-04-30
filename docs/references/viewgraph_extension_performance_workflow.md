# ViewGraph Extension Performance Workflow with Chrome DevTools MCP

Generated: 30 Apr 2026

## Purpose

This document captures the recommended workflow for profiling a Chrome or Firefox browser extension like ViewGraph, where the extension displays a side panel and lets the user annotate on-screen elements.

The core constraint is simple: Chrome DevTools MCP is excellent at analyzing a browser session, but it should not be treated as the thing that installs, launches, configures, and exercises your extension from zero. For extension performance work, the better boundary is:

```text
Browser launched with the extension already loaded
        ↓
Chrome DevTools MCP attaches to that debuggable browser
        ↓
A repeatable test page triggers annotation mode and side panel flows
        ↓
Extension-internal telemetry explains what DevTools traces cannot see cleanly
```

In plain English: do not ask the agent to open a naked browser and then somehow build a circus tent inside it. Start the circus already assembled, then let the agent inspect the acrobatics.

## Recommended architecture

```text
Chrome DevTools MCP
  Browser trace, console logs, network activity, screenshots, long tasks, layout, paint, memory hints

Custom extension perf collector
  Content script timings, side panel render timings, background/service-worker timings, message latency, annotation count, memory snapshots

Puppeteer or Playwright harness
  Repeatable scenarios, CI regression budgets, deterministic test pages

Firefox tooling
  web-ext run, about:debugging, Firefox Profiler, extension sidebar debugger
```

## Why this architecture is the right boundary

Chrome DevTools MCP can start Chrome automatically when a tool needs a browser, but its own documentation also supports connecting to a running Chrome instance using `--browser-url=http://127.0.0.1:9222` or automatic connection where available. That running-browser approach matters for extension work because you need the extension preloaded, user gesture paths available, and a stable profile for repeated scenarios. The MCP documentation also warns that enabling the remote debugging port lets local applications control that browser, and recommends a non-default user data directory for the remote debugging session.

For extension performance, this gives you three useful separations:

1. **Setup ownership:** your scripts launch the browser, profile, and extension.
2. **Observation ownership:** Chrome DevTools MCP inspects the browser runtime.
3. **Extension truth ownership:** your extension emits internal telemetry that traces alone cannot reliably attribute.

## Chrome workflow

### 1. Build the extension

Use your normal production-like build, preferably without dev hot reload code:

```bash
npm run build
```

Assume the built extension is in:

```text
./dist
```

### 2. Launch Chrome manually with the extension preloaded

#### Windows

```bat
set EXT=C:\path\to\viewgraph\dist
set PROF=%TEMP%\viewgraph-perf-profile

"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%PROF%" ^
  --disable-extensions-except="%EXT%" ^
  --load-extension="%EXT%"
```

#### macOS

```bash
EXT="$PWD/dist"
PROF="/tmp/viewgraph-perf-profile"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$PROF" \
  --disable-extensions-except="$EXT" \
  --load-extension="$EXT"
```

#### Linux

```bash
EXT="$PWD/dist"
PROF="/tmp/viewgraph-perf-profile"

/usr/bin/google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$PROF" \
  --disable-extensions-except="$EXT" \
  --load-extension="$EXT"
```

### 3. Configure Chrome DevTools MCP to attach to that browser

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browser-url=http://127.0.0.1:9222"
      ]
    }
  }
}
```

### 4. Use auto-connect only when it fits the job

Where supported, Chrome DevTools MCP can connect to a running Chrome profile using `--autoConnect`. This is useful when you want to alternate between manual testing and agent-assisted debugging. It is less controlled than the dedicated profile approach because the MCP server may access the active profile and open windows. For extension performance work, prefer the dedicated debug profile unless you specifically need the currently running browser session.

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--autoConnect"]
    }
  }
}
```

## Add a dev-only performance mode inside the extension

DevTools traces can show expensive script, style, layout, paint, and memory behavior, but extension code crosses contexts: content script, side panel page, background/service worker, storage, and message passing. Add a dev-only perf collector so the agent can correlate external symptoms with internal extension events.

### Recommended perf zones

| Zone | What to measure | Why it matters |
|---|---|---|
| Content script | Injection cost, DOM scanning, hover detection, element detection, scroll impact | This is the code closest to the host page and most likely to hurt the page. |
| Annotation overlay | Layout reads, overlay writes, paint cost, pointer-move workload | This is where annotation UX becomes janky if reads and writes are mixed. |
| Side panel | First render, state hydration, list rendering, previews, image decoding | Side panel slowness feels like product slowness, even if page code is fine. |
| Background or service worker | Wake-up cost, storage writes, message fan-out, event handling | MV3 service workers can shut down and lose globals, so state and timing must be explicit. |
| Cross-context messaging | Message count, payload size, p50/p95 latency, dropped messages | Annotation tools often accidentally spam messages during hover and scroll. |

### Minimal marker helper

```js
export function measureSync(name, fn) {
  const start = `${name}:start`;
  const end = `${name}:end`;
  performance.mark(start);
  try {
    return fn();
  } finally {
    performance.mark(end);
    performance.measure(name, start, end);
  }
}
```

Example:

```js
measureSync('vg:hover-hit-test', () => {
  const el = document.elementFromPoint(lastPointer.x, lastPointer.y);
  updateHoverTarget(el);
});
```

### Dev-only telemetry object

```js
window.__VG_PERF__ = {
  marks: [],
  measures: [],
  longTasks: [],
  messages: [],
  observerEvents: [],
  memorySamples: []
};
```

### Long task collector

```js
if ('PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__VG_PERF__?.longTasks.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration
        });
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // Long task timing is not available everywhere.
  }
}
```

## Deterministic test pages

Do not begin on random websites. First create hostile but repeatable pages. Random production sites are a debugging swamp with prettier fonts.

```text
/perf/simple-page.html
/perf/large-dom-10000-elements.html
/perf/deep-nested-layout.html
/perf/scroll-heavy-page.html
/perf/mutation-storm.html
/perf/iframe-shadow-dom.html
/perf/fixed-sticky-elements.html
/perf/animated-page.html
/perf/long-text-and-images.html
```

### What each page should expose

| Test page | Main risk being tested |
|---|---|
| `simple-page.html` | Baseline injection, side panel opening, and annotation startup. |
| `large-dom-10000-elements.html` | DOM scan cost, selector strategy, bounding-box calculation cost. |
| `deep-nested-layout.html` | Layout and reflow risk from measurement-heavy code. |
| `scroll-heavy-page.html` | Scroll listener throttling, overlay repaint, passive listener behavior. |
| `mutation-storm.html` | MutationObserver callback volume and queue pressure. |
| `iframe-shadow-dom.html` | Hit testing, cross-frame limits, shadow root traversal rules. |
| `fixed-sticky-elements.html` | Overlay z-index, clipping, stacking context, fixed element interference. |
| `animated-page.html` | Overlay paint and compositing cost under animation pressure. |
| `long-text-and-images.html` | Side panel preview rendering, image blob cleanup, memory behavior. |

## Opening the side panel in performance tests

Chrome side panel opening is user-gesture constrained. Chrome documents that `sidePanel.open()` can be triggered through extension user gestures such as action icon clicks, extension page interaction, or content script interaction. For performance tests, add a reliable dev-only trigger.

### Option A: keyboard command

```json
{
  "commands": {
    "open-viewgraph-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y"
      },
      "description": "Open ViewGraph panel"
    }
  }
}
```

### Option B: dev-only test button

```html
<button id="vg-open-panel">Open ViewGraph Panel</button>
```

The MCP agent can click that button during the scenario, satisfying the gesture path.

### Option C: side panel UI isolation

For side panel UI performance alone, open the panel page directly:

```text
chrome-extension://<extension-id>/sidepanel.html
```

This does not perfectly reproduce the browser side panel container, but it is excellent for testing UI bundle cost, React or Angular render performance, list virtualization, image preview decoding, and memory cleanup.

## MCP agent scenario template

Use a prompt like this:

```text
Connect to the running Chrome instance. Open http://localhost:5173/perf/large-dom-10000-elements.html. Start a performance trace. Trigger ViewGraph annotation mode using the dev button. Scroll the page five times, hover over twenty visible elements, create five annotations, open the side panel, then stop the trace.

Analyze:
1. Long tasks over 50 ms
2. Layout and style recalculation spikes
3. Paint and composite cost from the overlay
4. Message latency between content script, side panel, and background
5. Memory growth after annotations
6. Specific extension files or functions likely responsible
7. Concrete patches with expected impact
```

## CI and regression testing

Do not make MCP your test runner. Make MCP the performance analyst.

Use Puppeteer or Playwright for repeatable execution:

```text
Puppeteer or Playwright
  Launch browser with extension
  Run fixed scenario
  Export metrics JSON or trace

MCP or LLM
  Inspect trace
  Explain bottlenecks
  Propose patches
  Compare against previous budgets
```

### Suggested first performance budgets

Treat these as starting budgets, not gospel. The browser will not file a complaint, but users will.

| Area | Initial budget |
|---|---:|
| Content script initial activation | under 50 ms on simple page |
| Annotation mode activation | under 100 ms on simple page |
| Pointer move handler | under 2 ms average, no long tasks |
| Scroll handler work | under 3 ms per animation frame |
| Layout measurement pass | under 8 ms for typical viewport |
| Side panel first usable render | under 300 ms after gesture |
| Message latency p95 | under 30 ms local |
| Long tasks during annotation | zero above 50 ms in common flows |
| Memory growth after 50 annotations | stable after cleanup and GC opportunity |

## Firefox workflow

Chrome DevTools MCP is Chromium-focused. For Firefox, use Firefox-native tooling.

```text
web-ext run
about:debugging
Firefox extension Toolbox
Firefox Profiler
```

Firefox Extension Workshop documents debugging through `about:debugging`, including background scripts, options pages, popups, sidebars, content scripts, and developer tool panels. Mozilla's Firefox Profiler is designed to capture and analyze performance profiles for Firefox and Gecko, and Mozilla also provides a Chrome extension for importing Chrome traces into Firefox Profiler for cross-browser comparison.

### Firefox-specific steps

1. Run the extension using `web-ext run`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click `Inspect` next to the extension.
4. Open the sidebar or panel.
5. Use the Debugger and Console for extension-side code.
6. Use Firefox Profiler for runtime performance investigation.
7. Compare behavior with Chrome traces only after the deterministic test pages are stable.

## Most likely performance wins for ViewGraph

### 1. Do not scan the full DOM on every mouse move

Use `document.elementFromPoint()` for hover target detection. Only run broader DOM scans when entering annotation mode, on navigation, or on controlled invalidation.

```js
let lastEvent = null;
let rafPending = false;

window.addEventListener('pointermove', (event) => {
  lastEvent = event;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const target = document.elementFromPoint(lastEvent.clientX, lastEvent.clientY);
    updateHoverTarget(target);
  });
}, { passive: true });
```

### 2. Avoid layout thrashing

Never alternate DOM writes and layout reads in a loop.

Bad:

```js
for (const el of elements) {
  el.classList.add('vg-highlight');
  const rect = el.getBoundingClientRect();
  drawRect(rect);
}
```

Better:

```js
const rects = elements.map((el) => ({ el, rect: el.getBoundingClientRect() }));
for (const item of rects) {
  drawRect(item.rect);
}
```

### 3. Use one overlay layer

Prefer one fixed overlay root using SVG or canvas. Avoid many absolutely positioned DOM nodes unless they are virtualized.

```html
<div id="vg-overlay-root" style="position:fixed;inset:0;pointer-events:none;z-index:2147483647"></div>
```

### 4. Disable observers when annotation mode is off

Observers are powerful. Left running forever, they become the office printer of performance problems: always humming, always suspicious.

```js
let mutationObserver = null;

function enableAnnotationObservers() {
  if (mutationObserver) return;
  mutationObserver = new MutationObserver(handleMutationsBatched);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function disableAnnotationObservers() {
  mutationObserver?.disconnect();
  mutationObserver = null;
}
```

### 5. Batch extension messages

Do not send one extension message per hover, rect, or pixel nudge.

```js
const queue = [];
let flushTimer = null;

function queueExtensionMessage(message) {
  queue.push(message);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    const batch = queue.splice(0, queue.length);
    flushTimer = null;
    chrome.runtime.sendMessage({ type: 'VG_BATCH', batch });
  }, 50);
}
```

### 6. Lazy-load the side panel

Load expensive modules only after the panel is open and only when the related tab is visible.

```js
async function showAnnotationHistory() {
  const { AnnotationHistory } = await import('./AnnotationHistory.js');
  render(<AnnotationHistory />);
}
```

### 7. Virtualize large panel lists

If the side panel shows hundreds or thousands of annotations, render only visible rows. Full rendering is a tax on success. Great product, slow list. Classic trap.

### 8. Clean up aggressively

On navigation, tab change, annotation-mode exit, or side-panel close:

```text
Remove event listeners
Disconnect MutationObserver and ResizeObserver
Cancel requestAnimationFrame and timers
Clear overlay DOM or canvas
Release object URLs
Drop references to DOM nodes
Flush or discard message queues
```

### 9. Keep content scripts idle by default

Use dynamic content scripts, runtime injection, or a dormant bootstrapper. The content script should do almost nothing until the user activates ViewGraph.

### 10. Measure before and after every change

Every optimization PR should include:

```text
Scenario tested
Before metric
After metric
Tradeoff introduced
Risk area
Rollback plan
```

## Minimal perf instrumentation checklist

```text
[ ] content script activation time
[ ] annotation mode activation time
[ ] pointermove handler duration
[ ] scroll handler duration
[ ] number of active observers
[ ] number of extension messages per second
[ ] p50 and p95 message latency
[ ] side panel first render time
[ ] side panel list render time
[ ] annotation overlay repaint count
[ ] memory sample before and after annotation session
[ ] cleanup confirmation on navigation and annotation exit
```

## References

1. Chrome DevTools MCP README, running browser connection and remote debugging notes: https://github.com/ChromeDevTools/chrome-devtools-mcp
2. Chrome DevTools MCP tool reference, performance trace: https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md
3. Chrome DevTools MCP active browser connection article: https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session
4. Chrome Extensions content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
5. Chrome Extensions messaging: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
6. Chrome extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
7. Chrome Side Panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
8. Microsoft Edge extension page-load impact guidance: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/minimize-page-load-time-impact
9. Firefox Extension Workshop debugging guide: https://extensionworkshop.com/documentation/develop/debugging/
10. Mozilla Firefox Profiler for Chrome traces: https://blog.mozilla.org/performance/2024/12/12/introducing-the-chrome-extension-for-the-firefox-profiler/
11. web.dev layout thrashing guidance: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
12. web.dev long tasks guidance: https://web.dev/articles/optimize-long-tasks
13. MDN MutationObserver: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
14. MDN requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
15. Chrome DevTools memory problems: https://developer.chrome.com/docs/devtools/memory-problems
