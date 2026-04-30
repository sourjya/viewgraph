# Browser Extension Performance Pitfalls for Chrome and Firefox

Generated: 30 Apr 2026

## Scope

This document summarizes common performance problems reported or documented across official browser documentation, developer forums, GitHub issues, Stack Overflow threads, Mozilla resources, Chrome and Edge extension documentation, web performance articles, and general JavaScript performance guidance.

It is written for an extension like ViewGraph: a Chrome and Firefox extension with a side panel or sidebar, content scripts, on-page annotation overlays, element hit-testing, DOM inspection, screenshot or capture work, and cross-context messaging.

This is not a replacement for profiling. It is a prevention guide. The aim is to avoid the predictable potholes before setting up a full performance lab.

## Executive summary

The highest-risk extension performance problems are usually not exotic. They are boring, repetitive, and expensive:

1. Content scripts that run too much code on every page load.
2. Full-DOM scans triggered by mouse movement, scroll, or every mutation.
3. Forced synchronous layout from mixing DOM writes and layout reads.
4. MutationObservers or ResizeObservers left running across the whole document.
5. Message spam between content scripts, side panels, and background workers.
6. Side panel UI rendering too much state, too many rows, or too many image previews.
7. Memory leaks from retained DOM nodes, object URLs, listeners, timers, observers, and arrays.
8. MV3 service workers treated like persistent background pages.
9. Excessive logging, especially on high-event pages.
10. Cross-browser differences hidden until late testing.

If you fix only one principle, fix this one: **extension code should be dormant until the user asks it to do work.**

## Quick risk table

| Pitfall | Common symptom | Most likely fix |
|---|---|---|
| Always-on content script | Page load slows on every website | Use dynamic injection or tiny bootstrapper |
| Full DOM scan on hover | Mouse feels sticky | Use `elementFromPoint()` plus `requestAnimationFrame` |
| Layout thrashing | Jank, red long tasks, slow annotation boxes | Batch reads, then writes |
| Whole-page MutationObserver | CPU spikes on SPAs and chat apps | Observe narrow targets, batch, disconnect when idle |
| Message spam | Side panel lags, service worker wakes constantly | Batch payloads and use ports only where useful |
| Heavy side panel render | Panel opens slowly | Lazy-load, virtualize, defer previews |
| Detached DOM leaks | Browser slows over time | Remove listeners and drop DOM references |
| MV3 global state | Random state loss or rehydration cost | Persist state, design for worker shutdown |
| Storage overuse | Janky saves, quota issues | Debounce writes and use bulk operations |
| Logging flood | UI blocking and high memory usage | Dev-only logs, sampling, rate limits |

## 1. Always-injected content scripts

### What happens

A content script runs in the context of web pages and can read or modify the page DOM. Browser extension docs warn that content scripts can noticeably affect page performance, especially when they run a lot of code during page load.

### Why it hurts

Every matched page pays the cost, even when the user never opens the extension. If the content script loads a framework, scans the DOM, attaches many listeners, or initializes overlay state immediately, the extension becomes a silent tax on browsing.

### Avoid it

- Use a tiny content script bootstrapper.
- Use dynamic content script registration or runtime script injection when possible.
- Defer all annotation logic until user activation.
- Avoid loading UI frameworks inside content scripts unless genuinely required.
- Scope host permissions and match patterns tightly.

### Cheap code review checks

```text
content_scripts matches <all_urls>
large imports in content script entry
React, Vue, Angular, lodash, highlight.js, or parser libraries in content script bundle
DOM scan during module import
listeners registered at top level without activation gate
```

## 2. Full-DOM scans during pointer movement

### What happens

Annotation extensions often need to identify the element under the cursor. The naive version scans many nodes, calls `querySelectorAll('*')`, computes rectangles, and compares the pointer coordinates on every `mousemove` or `pointermove`.

### Why it hurts

Pointer events can fire at high frequency. A full scan plus layout reads turns a simple hover into a browser treadmill.

### Avoid it

Use `document.elementFromPoint(x, y)` for the hot path. Fall back to deeper inspection only when needed.

```js
let lastPointer = null;
let scheduled = false;

window.addEventListener('pointermove', (event) => {
  lastPointer = event;
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const el = document.elementFromPoint(lastPointer.clientX, lastPointer.clientY);
    updateHover(el);
  });
}, { passive: true });
```

### Cheap code review checks

```text
querySelectorAll('*') inside mousemove or pointermove
getBoundingClientRect inside pointermove loop
Array.from(document.body.querySelectorAll(...)) in hover path
mousemove listener without requestAnimationFrame gate
```

## 3. Layout thrashing and forced reflow

### What happens

Layout or reflow is where the browser calculates element geometry. In Chrome and Edge this is called layout. In Firefox the equivalent process is called reflow. Layout cost grows with DOM size and layout complexity.

The common bug is alternating DOM writes and layout reads:

```js
el.classList.add('selected');
const rect = el.getBoundingClientRect();
```

That pattern can force the browser to calculate layout synchronously before JavaScript can continue.

### Why it hurts

web.dev warns that layout directly affects interaction latency and that forced synchronous layouts and layout thrashing should be avoided. webperf.tips also shows how calling `getBoundingClientRect()` after invalidating layout can cause synchronous reflow and extend the JavaScript task.

### Avoid it

- Batch all reads first.
- Batch all writes second.
- Prefer CSS transforms and opacity for overlay movement.
- Do not change geometric properties like width, height, top, left inside high-frequency handlers.
- Cache stable rectangles within a frame.

```js
const rects = targets.map((el) => ({ el, rect: el.getBoundingClientRect() }));
requestAnimationFrame(() => {
  for (const { rect } of rects) drawOverlayRect(rect);
});
```

### Cheap code review checks

```text
getBoundingClientRect after classList.add/remove
offsetHeight, offsetWidth, scrollTop, getComputedStyle after style mutation
style.top/left/width/height in pointermove or scroll path
```

## 4. MutationObserver on the whole document

### What happens

MutationObserver is a standard way to observe DOM changes. It is powerful, but observing `document.body` with `subtree: true` on complex SPAs, chat apps, dashboards, and infinite-scroll pages can generate huge callback volume.

A long-running Stack Overflow thread asks directly about the performance of watching the entire DOM with MutationObserver, reflecting how common this concern is among developers.

### Why it hurts

A whole-page observer on an active app can become a permanent background job. If the callback scans added nodes, computes styles, or emits messages, the extension can slow the host page even when the user is doing normal page work.

### Avoid it

- Enable observers only in annotation mode.
- Observe the narrowest node possible.
- Use `childList` only unless attributes or character data are truly needed.
- Filter mutations before doing expensive work.
- Batch callback work into `requestAnimationFrame` or a short debounce.
- Call `disconnect()` when annotation mode exits.

```js
const observer = new MutationObserver((records) => {
  pendingRecords.push(...records);
  scheduleMutationProcessing();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### Cheap code review checks

```text
MutationObserver created at module top level
observe(document.body, { subtree: true, attributes: true, characterData: true })
querySelectorAll inside mutation callback
runtime.sendMessage inside every mutation callback
no observer.disconnect path
```

## 5. Scroll, wheel, and touch listeners that block scrolling

### What happens

Touch and wheel listeners can delay scrolling because the browser may need to wait to see whether the listener calls `preventDefault()`. Chrome's Lighthouse guidance explains that passive listeners tell the browser the listener will not prevent scrolling.

### Why it hurts

Annotation overlays often track scroll to reposition boxes. If that work is synchronous, layout-heavy, or non-passive, scrolling can become visibly rough.

### Avoid it

- Use `{ passive: true }` unless you truly need to cancel the event.
- Do minimal work in the event handler.
- Schedule visual updates with `requestAnimationFrame`.
- Use IntersectionObserver for visibility rather than polling rectangles on every scroll.

```js
let scrollScheduled = false;

window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    repaintVisibleAnnotations();
  });
}, { passive: true });
```

### Cheap code review checks

```text
scroll listener doing DOM queries directly
wheel or touch listener without passive option
preventDefault in wheel or touch path
getBoundingClientRect for many nodes on every scroll event
```

## 6. Intersection detection by polling rectangles

### What happens

Older visibility code often loops through elements and calls `getBoundingClientRect()` to check if each one is visible. MDN notes that IntersectionObserver was created for cases like lazy loading, infinite scrolling, visibility reporting, and deciding whether to do work only when the result can be seen.

### Why it hurts

Repeated rectangle polling runs on the main thread and often duplicates the same work across multiple libraries or features.

### Avoid it

- Use IntersectionObserver for visibility checks.
- Use it to lazy-load side panel previews and on-page annotation metadata.
- Stop observing when elements are removed or annotation mode exits.

### Cheap code review checks

```text
isInViewport function called from scroll
getBoundingClientRect visibility checks over many elements
manual lazy loading based on scrollTop
```

## 7. Long tasks in content scripts and panels

### What happens

A long task is a main-thread task that runs for 50 ms or more. MDN lists delayed interactivity, variable input latency, delayed event handling, janky animation, and janky scrolling as consequences. web.dev recommends breaking long tasks into smaller tasks so the browser can respond to higher-priority work sooner.

### Why it hurts

A content script that performs one large analysis pass can make the host page feel frozen. A side panel that hydrates a large state tree in one synchronous block can feel broken even if it eventually renders.

### Avoid it

- Split large DOM analysis into chunks.
- Yield between chunks using `scheduler.yield()` where available or `setTimeout` as a fallback.
- Do heavy parsing or summarization away from pointer and scroll paths.
- Defer non-visible panel sections.

```js
async function processInChunks(items, processItem, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    for (const item of items.slice(i, i + chunkSize)) {
      processItem(item);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
```

### Cheap code review checks

```text
large for loops in activation path
JSON.parse of large payloads during render
synchronous image or canvas processing on main thread
large DOM snapshot generation in one task
```

## 8. Overlay design that causes excessive layout and paint

### What happens

Annotation tools often draw boxes, labels, arrows, tooltips, badges, and handles on top of the page. The slow version creates many DOM nodes and updates their geometric styles individually.

### Why it hurts

Many overlay nodes increase style, layout, paint, and memory overhead. Updating `top`, `left`, `width`, and `height` repeatedly can trigger layout work. A single overlay root, SVG, or canvas often performs better.

### Avoid it

- Use one fixed overlay root.
- Prefer CSS transforms for movement.
- Use SVG or canvas for many rectangles.
- Keep overlay DOM outside the host page's layout flow.
- Add `pointer-events: none` unless the overlay needs to capture interaction.
- Avoid transitions on box geometry during inspection.

### Cheap code review checks

```text
one DOM node per visible element
style.top and style.left updated every frame
overlay inserted inside page layout instead of fixed root
many labels rendered even outside viewport
```

## 9. Side panel or sidebar UI bloat

### What happens

Chrome side panels and Firefox sidebars are extension pages. They can still become slow web apps: heavy framework bundles, big state hydration, unvirtualized lists, preview images, syntax highlighting, markdown rendering, or embedded screenshots.

### Why it hurts

The panel is user-facing. If it opens slowly, the extension feels slow even when the content script is efficient.

### Avoid it

- Code-split panel routes and heavy components.
- Virtualize annotation history and event logs.
- Lazy-load screenshots and previews.
- Avoid rendering hidden tabs of the panel.
- Use memoized selectors and stable props.
- Keep debug panels disabled in production builds.

### Cheap code review checks

```text
rendering every annotation in a map with no virtualization
large base64 images stored in state
syntax highlighter loaded on first panel paint
markdown renderer loaded before it is visible
console logging in render path
```

## 10. Message spam between extension contexts

### What happens

Chrome extension contexts can communicate with one-time messages or long-lived ports. Chrome docs describe `runtime.connect()` and `tabs.connect()` for reusable long-lived channels.

### Why it hurts

If the content script sends a message per hover event, mutation, overlay rect, or scroll update, message overhead, serialization, side panel state updates, and service worker wake-ups all pile up.

Chrome also documented BFCache behavior changes involving active extension message ports. Long-lived ports are useful, but they should be deliberate, not default duct tape.

### Avoid it

- Batch messages.
- Use typed payloads.
- Send diffs instead of full snapshots.
- Add backpressure or drop stale hover updates.
- Use ports for sessions, not for every small event.
- Close ports when annotation mode ends.

### Cheap code review checks

```text
sendMessage inside pointermove, mousemove, scroll, MutationObserver
large DOM snapshots sent through extension messaging
port opened without disconnect handling
side panel state update for every hover frame
```

## 11. MV3 service worker lifecycle mistakes

### What happens

Chrome MV3 extension service workers are not persistent background pages. Chrome normally terminates a service worker after inactivity, after long-running requests, or when fetch responses take too long. Chrome docs state that globals are lost when the service worker shuts down and recommend saving values to storage instead.

### Why it hurts

If the extension assumes a persistent process, it will either lose state or rebuild state repeatedly. Developers also report that debugging can be confusing because opening DevTools changes service worker behavior by keeping it active.

### Avoid it

- Treat the service worker as event-driven.
- Persist state explicitly.
- Keep event handlers short.
- Do not use service worker globals as durable source of truth.
- Avoid keep-alive hacks unless absolutely required.
- Measure wake-up and rehydration cost.

### Cheap code review checks

```text
critical state stored only in global variables
long-running loops in service worker
open port only to keep worker alive
large rehydration on every message
DevTools-only behavior not reproduced in headless runs
```

## 12. Storage misuse

### What happens

Chrome's extension storage API is asynchronous, supports bulk reads and writes, and has quotas. Chrome's docs warn that storing data has performance costs and storage can take time to complete. MDN documents `storage.sync` quotas for WebExtensions.

### Why it hurts

Annotation tools may store screenshots, serialized DOM metadata, event logs, and settings. Frequent writes during hover or scroll can create latency and quota pressure.

### Avoid it

- Keep hot state in memory for the active session.
- Debounce persistent writes.
- Use bulk writes.
- Store large blobs outside sync storage.
- Store references to images instead of base64 blobs where possible.
- Separate settings, session state, and capture artifacts.

### Cheap code review checks

```text
chrome.storage.set inside pointermove or scroll
storage.sync used for large annotation data
base64 screenshot strings in storage.sync
write per annotation field instead of one batched object
```

## 13. Memory leaks from DOM references, listeners, timers, and object URLs

### What happens

Chrome DevTools memory guidance identifies memory leaks, memory bloat, frequent garbage collection, detached DOM trees, and detached elements retained by JavaScript references as common memory problems. MDN also notes that memory leaks can be introduced by not unregistering event listeners, not closing workers, and accumulating objects in arrays.

Older extension-specific documentation also highlights failure to clean up event listeners as a common extension leak pattern.

### Why it hurts

Annotation extensions naturally collect DOM nodes, rectangles, labels, screenshots, and history. If these references survive navigation or annotation-mode exit, memory grows with every session.

### Avoid it

- Never store raw DOM nodes in long-lived global structures.
- Store stable descriptors, not elements.
- Remove listeners with the exact same options used when adding them.
- Disconnect observers.
- Clear intervals and timeouts.
- Revoke object URLs.
- Release canvas and image references after use.

### Cheap code review checks

```text
Map<Element, ...> without cleanup
array of DOM nodes outside active mode
URL.createObjectURL without URL.revokeObjectURL
setInterval without clearInterval
addEventListener without matching removeEventListener
```

## 14. Excessive logging

### What happens

A GitHub issue for a Firefox sidebar extension reported an endless stream of logs on a chat app, causing UI blocking and high memory usage, and confirmed that disabling the extension fixed the issue.

### Why it hurts

Logging is synchronous enough to matter when it happens thousands of times. Console entries also retain object references in some debugging scenarios, making memory symptoms worse.

### Avoid it

- Compile out verbose logs in production.
- Rate-limit logs in dev.
- Log counts and summaries instead of full objects.
- Never log on every pointer event, mutation, or scroll frame.
- Add a debug flag with sampling.

### Cheap code review checks

```text
console.log inside pointermove, scroll, MutationObserver, ResizeObserver
logging full DOM nodes
logging screenshot blobs or large payloads
```

## 15. Screenshot and canvas capture overhead

### What happens

Extensions that capture screenshots or serialize rendered UI can generate large blobs. If those are converted to base64, copied through messaging, stored in panel state, and rendered in lists, memory and CPU costs multiply.

### Why it hurts

The data is large, and every conversion creates more copies. The side panel can accidentally become a museum of unreleased blobs.

### Avoid it

- Prefer Blob URLs for previews.
- Revoke object URLs on removal.
- Downscale thumbnails.
- Store only one full-size capture per selected item.
- Avoid sending large images through frequent extension messages.
- Use separate artifact storage for captures.

### Cheap code review checks

```text
canvas.toDataURL for frequent captures
base64 screenshots in React state
image previews for all hidden list rows
object URLs not revoked
```

## 16. Heavy CSS and style recalculation

### What happens

Global CSS injected into the page can affect selector matching, style recalculation, and host page behavior. Overlay styles that use expensive selectors or animate layout properties add more work.

### Why it hurts

The extension runs on unknown pages. A harmless-looking selector can become expensive on a huge DOM, or collide with page CSS.

### Avoid it

- Prefix all extension classes.
- Use a shadow root for overlay UI where appropriate.
- Avoid global selectors.
- Avoid `*` selectors.
- Avoid layout-affecting animation.
- Use CSS containment carefully for panel internals.

### Cheap code review checks

```text
injected CSS with * selectors
unprefixed classes like .button or .panel
animations on width, height, top, left
style tags injected repeatedly
```

## 17. Unbounded annotation history in the panel

### What happens

Every annotation, hover candidate, debug event, and capture may be appended to an array and rendered in the side panel.

### Why it hurts

Small arrays become large arrays. Then every state update becomes a large render, and every large render becomes another reason to blame the browser unfairly.

### Avoid it

- Cap debug event history.
- Virtualize long lists.
- Aggregate repeated hover and mutation events.
- Store full details only for selected records.
- Use pagination or lazy loading for old sessions.

### Cheap code review checks

```text
setEvents([...events, newEvent]) with unbounded events
render all history rows
store full payload for every hover
debug timeline enabled by default
```

## 18. SPA navigation without cleanup

### What happens

Modern sites often change views without full page reload. Content scripts that only clean up on unload miss route changes.

### Why it hurts

Old overlay state, DOM references, observers, and event handlers remain attached to stale content. The extension slowly becomes haunted. Not spooky. Just slow.

### Avoid it

- Detect URL changes via history patching or periodic lightweight check.
- Clear overlay and cached rects on route change.
- Revalidate active target nodes.
- Disconnect and reconnect observers when necessary.

### Cheap code review checks

```text
cleanup only on beforeunload
no handling for pushState or popstate
cached elements assumed valid forever
```

## 19. Cross-browser extension-context differences

### What happens

Chrome and Firefox both support WebExtensions concepts, but behavior differs in content script isolation, APIs, side panel or sidebar support, service worker maturity, debugging tools, and profiler workflows. MDN documents content scripts for WebExtensions, and Firefox Extension Workshop documents separate debugging paths for background scripts, options pages, popups, sidebars, content scripts, and panels.

### Why it hurts

A performance fix in Chrome can expose a Firefox-specific issue, especially around sidebars, Xray wrappers, object references, and debugging visibility.

### Avoid it

- Keep browser-specific API adapters small and explicit.
- Test sidebar and side panel rendering separately.
- Do not assume MV3 lifecycle behavior is identical across browsers.
- Maintain a shared perf checklist with browser-specific notes.

### Cheap code review checks

```text
direct chrome.* calls without adapter in shared code
Chrome-only sidePanel assumptions in Firefox path
Firefox sidebar not tested with long annotation history
```

## 20. Declarative rules vs blocking request logic

### What happens

Chromium moved away from blocking Web Request patterns toward Declarative Net Request in MV3. Chromium's blog explains that blocking webRequest requires persistent or long-running processing, serialization, inter-process communication, and processing of extension responses.

### Why it hurts

If an extension intercepts many requests or does heavy request-time logic, it can hurt browsing performance. ViewGraph may not need this path, but if future features inspect network failures, keep this in mind.

### Avoid it

- Prefer declarative rules where the behavior is known ahead of time.
- Avoid request-time blocking logic unless unavoidable.
- Keep network diagnostics opt-in and session-scoped.

### Cheap code review checks

```text
blocking webRequest listeners
network interception enabled globally
request body inspection outside explicit debug mode
```

## 21. DevTools changes the thing being measured

### What happens

Developers report confusion when profiling MV3 service workers because opening DevTools can keep the worker active, hiding shutdown and wake-up behavior.

### Why it hurts

You can optimize a behavior that users never experience, or miss the real behavior users do experience.

### Avoid it

- Measure with and without DevTools open.
- Add internal wake-up counters and timestamps.
- Use automated harnesses for lifecycle-sensitive scenarios.
- Keep a traceable startup log in extension storage for dev builds.

### Cheap code review checks

```text
service worker lifecycle behavior only tested with DevTools open
no wake-up counter
no persisted last-start timestamp
```

## 22. Firefox profiling workflow friction

### What happens

Mozilla Discourse includes developer discussion about the difficulty of running performance analysis directly on WebExtensions when the Performance tab is not available for the current toolbox target. Firefox Extension Workshop still provides debugging paths, and Mozilla recommends Firefox Profiler for deeper profiling.

### Why it hurts

Teams may skip Firefox performance work until late. That is how browser-specific bugs reach users wearing tiny disguises.

### Avoid it

- Treat Firefox as its own profiling target.
- Use `about:debugging` and the extension Toolbox for extension code.
- Use Firefox Profiler for runtime profiles.
- Use the same deterministic pages as Chrome.
- Compare Chrome and Firefox only after each browser has a clean baseline.

## ViewGraph-specific prevention rules

### Hot path rules

```text
[ ] No DOM-wide scans inside pointermove, mousemove, scroll, wheel, touchmove, or mutation callbacks.
[ ] All pointer and scroll UI updates are requestAnimationFrame-gated.
[ ] Reads and writes are batched.
[ ] Overlay is one root, not hundreds of independent layout participants.
[ ] Observers run only while annotation mode is active.
[ ] Extension messages are batched and typed.
[ ] Side panel list rendering is virtualized.
[ ] Screenshots are thumbnailed and object URLs are revoked.
[ ] Cleanup runs on annotation exit, tab change, route change, and navigation.
[ ] MV3 service worker has no critical global-only state.
```

### Default architecture choices

| Area | Recommended default |
|---|---|
| Content script | Dormant bootstrapper, activate on user action |
| Hover detection | `elementFromPoint()` plus rAF throttle |
| Overlay | One fixed root, SVG or canvas for many boxes |
| Observers | Narrow scope, batched, disconnected by default |
| Messaging | Batched diffs, backpressure, no hover spam |
| Side panel | Lazy modules, virtualized lists, image thumbnails |
| Storage | Debounced bulk writes, no large sync payloads |
| Service worker | Event-driven, persisted state, short handlers |
| Debug logs | Dev-only, sampled, rate-limited |
| Firefox | Separate sidebar profiling path |

## Static review checklist without complicated testing

Search the codebase for these strings and inspect every hit:

```text
querySelectorAll('*')
getBoundingClientRect(
offsetHeight
offsetWidth
getComputedStyle(
MutationObserver
ResizeObserver
addEventListener('scroll'
addEventListener('wheel'
addEventListener('touchmove'
addEventListener('mousemove'
addEventListener('pointermove'
chrome.runtime.sendMessage
browser.runtime.sendMessage
runtime.connect
tabs.connect
chrome.storage
browser.storage
console.log
setInterval
URL.createObjectURL
canvas.toDataURL
```

For each hit, ask:

```text
Is this in a hot path?
Is it gated by annotation mode?
Is it batched?
Is it cleaned up?
Can it run on every website?
Can it run hundreds of times per second?
Can the payload grow without a cap?
Does it behave differently in Chrome and Firefox?
```

## Suggested minimum telemetry before serious profiling

```text
content_script_activation_ms
annotation_mode_activation_ms
hover_handler_ms
scroll_update_ms
mutation_records_per_second
observer_active_count
extension_messages_per_second
extension_message_payload_bytes
message_latency_p50_ms
message_latency_p95_ms
side_panel_first_render_ms
side_panel_visible_rows
annotation_count
screenshot_blob_count
object_url_count
memory_sample_mb
cleanup_completed_boolean
service_worker_wakeup_count
service_worker_rehydrate_ms
```

## References

1. Chrome DevTools MCP README: https://github.com/ChromeDevTools/chrome-devtools-mcp
2. Chrome DevTools MCP performance trace tool: https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md
3. Chrome active browser connection for MCP: https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session
4. Chrome Extensions content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
5. Microsoft Edge guidance on minimizing extension page-load impact: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/minimize-page-load-time-impact
6. Chrome Extensions message passing: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
7. Chrome extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
8. Chrome Side Panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
9. Chrome storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
10. Chrome BFCache and extension message ports: https://developer.chrome.com/blog/bfcache-extension-messaging-changes
11. Chromium blog on Web Request and Declarative Net Request: https://blog.chromium.org/2019/06/web-request-and-declarative-net-request.html
12. Firefox Extension Workshop debugging guide: https://extensionworkshop.com/documentation/develop/debugging/
13. MDN WebExtensions content scripts: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
14. Mozilla blog on Firefox Profiler for Chrome traces: https://blog.mozilla.org/performance/2024/12/12/introducing-the-chrome-extension-for-the-firefox-profiler/
15. Mozilla Discourse on WebExtension performance analysis: https://discourse.mozilla.org/t/how-to-run-a-performance-analysis-on-a-webextension/109710
16. Stack Overflow discussion on whole-DOM MutationObserver performance: https://stackoverflow.com/questions/31659567/performance-of-mutationobserver-to-detect-nodes-in-entire-dom
17. GitHub issue on Firefox sidebar logging performance: https://github.com/karlicoss/promnesia/issues/335
18. Stack Overflow discussion on MV3 service worker profiling difficulty: https://stackoverflow.com/questions/71267201/debugging-and-performance-profiling-manifestv3-extension-service-worker
19. web.dev on layout thrashing: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
20. webperf.tips on forced reflow: https://webperf.tips/tip/layout-thrashing/
21. web.dev on long tasks: https://web.dev/articles/optimize-long-tasks
22. MDN PerformanceLongTaskTiming: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
23. MDN requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
24. MDN MutationObserver: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
25. MDN IntersectionObserver: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
26. Chrome passive event listener guidance: https://developer.chrome.com/docs/lighthouse/best-practices/uses-passive-event-listeners
27. Chrome DevTools memory problems: https://developer.chrome.com/docs/devtools/memory-problems
28. MDN memory measurement and common leak causes: https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory
29. MDN JavaScript performance optimization: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript
30. Historical Mozilla extension memory leak patterns: https://udn.realityripple.com/docs/Extensions/Common_causes_of_memory_leaks_in_extensions
