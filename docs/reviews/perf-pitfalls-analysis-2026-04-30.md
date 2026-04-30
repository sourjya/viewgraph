# Performance Pitfalls Analysis - ViewGraph Extension

Cross-reference of browser_extension_performance_pitfalls_research.md against actual ViewGraph codebase.

**Date:** 2026-04-30

## ✅ Already Good (No Action Needed)

| Pitfall | Status | Evidence |
|---|---|---|
| #1 Always-on content script | ✅ Good | Content script is 305KB (axe-core lazy loaded). Annotation logic deferred until `toggle-annotate` message. |
| #2 Full-DOM scans on hover | ✅ Good | No `querySelectorAll('*')` in hover path. `annotate.js` uses `elementFromPoint()` for hover detection. |
| #5 Scroll listeners blocking | ✅ Good | Scroll listener uses `{ passive: true }`. Wheel listener in annotate.js is `passive: false` but intentional (needs preventDefault for DOM walking). |
| #6 Intersection polling | ✅ Good | Uses `IntersectionObserver` in `intersection-collector.js`, not polling. |
| #8 Overlay design | ✅ Good | Sidebar uses shadow DOM (closed). Markers are individual elements but only created on annotation, not per-element. |
| #10 Message spam | ✅ Good | No sendMessage in mousemove/scroll/mutation paths. Messages only on explicit actions (capture, send-review, auto-capture). |
| #11 MV3 service worker | ✅ Good | State persisted to chrome.storage. Event-driven handlers. No keep-alive hacks. |
| #12 Storage misuse | ✅ Good | No storage writes in hot paths. Annotations saved on explicit user action. |
| #15 Screenshot overhead | ✅ Good | `createObjectURL` has matching `revokeObjectURL` in content.js. Screenshots only on explicit capture. |
| #16 Heavy CSS | ✅ Good | All sidebar CSS in shadow DOM. No global `*` selectors. Extension classes prefixed with `data-vg-`. |
| #20 Declarative rules | ✅ N/A | No network interception. |

## ⚠️ Minor Concerns (Low Priority)

| Pitfall | Finding | File | Severity |
|---|---|---|---|
| #3 Layout thrashing | `getBoundingClientRect` called 14 times in annotate.js, some after style mutations (marker creation). Not in a tight loop but could batch reads. | `annotate.js` | LOW |
| #9 Side panel bloat | Annotation list renders all items (no virtualization). Fine for <50 annotations but could lag with 100+. | `sidebar/review.js` | LOW |
| #14 Excessive logging | 5 `console.log` calls remain in extension source. Should be `console.error` (stderr) or removed. | Various | LOW |
| #17 Unbounded history | Annotation list is unbounded. No cap on rendered items. | `sidebar/review.js` | LOW |

## 🟡 Moderate Concerns (Should Fix)

| Pitfall | Finding | File | Severity |
|---|---|---|---|
| #4 MutationObserver scope | `continuous-capture.js` observes `document.body` with `subtree: true, attributes: true` including 5 attribute filters. Runs whenever auto-capture is enabled. Has debounce (2s) and rate limit (5s) but no disconnect on tab background. | `session/continuous-capture.js` | MEDIUM |
| #4 MutationObserver scope | `transient-collector.js` observes `document.body` with `childList: true, subtree: true`. Started by `startTransientObserver()` in sidebar create. Has 30s buffer limit but no disconnect on tab background. | `collectors/transient-collector.js` | MEDIUM |
| #4 MutationObserver scope | `tooltip.js` observes shadowRoot with `childList: true, subtree: true`. Runs continuously while sidebar is open. Scans for `[data-tooltip]` on every mutation. | `tooltip.js` | MEDIUM |
| #7 Long tasks | DOM traversal (`traverseDOM()`) is a single synchronous pass over the entire DOM. On a 2000+ node page, this could be a 50ms+ long task. No chunking. | `capture/traverser.js` | MEDIUM |
| #13 Memory leaks | `annotate.js` stores DOM element references in `annotations` array (`el` field). These survive until annotation mode exits. If the page mutates (SPA navigation), these become detached DOM references. | `annotate.js` | MEDIUM |
| #18 SPA cleanup | `annotate.js` listens for `popstate` but doesn't clear cached element references or marker positions on SPA navigation. Markers may point to stale elements. | `annotate.js` | MEDIUM |

## 🔴 Not Applicable

| Pitfall | Why |
|---|---|
| #19 Cross-browser differences | We test both Chrome and Firefox. WXT handles API differences. |
| #21 DevTools measurement | Documented in devtools-testing.md steering doc. |
| #22 Firefox profiling | Documented in the workflow doc you placed. |

## Recommended Fixes (Priority Order)

1. **Disconnect MutationObservers on tab background** - Add `visibilitychange` listener to `continuous-capture.js` and `transient-collector.js`. Disconnect when `document.hidden`, reconnect when visible. ~15 min.

2. **Store element descriptors instead of DOM refs in annotate.js** - Replace `el` reference with `{ selector, bbox, nid }` descriptor. Prevents detached DOM leaks on SPA navigation. ~1 hr.

3. **Add annotation list cap** - Limit rendered annotations to 50 in the sidebar list. Add "Show all" button for overflow. ~30 min.

4. **Remove remaining console.log** - Replace 5 console.log calls with console.error or remove. ~5 min.

5. **Chunk traverseDOM for large pages** - Use `scheduler.yield()` or setTimeout between chunks of 500 elements. Only needed for pages >1000 nodes. ~1 hr. (Deferred - needs profiling data to validate.)
