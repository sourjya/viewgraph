---
inclusion: auto
description: How to handle degraded, empty, or broken captures from hostile DOM conditions
---

# ViewGraph - Hostile DOM Handling

## Recognizing degraded captures

Not every capture is clean. Real-world pages have broken markup, massive DOM trees, script errors, and missing landmarks. When you see these signals, don't assume ViewGraph is broken - diagnose the page.

| Signal | Likely cause | What to do |
|---|---|---|
| `totalNodes: 0` | Empty page, SPA mid-navigation, or page not loaded | Ask user to reload and re-capture. Check `network` section for failed requests. |
| `totalNodes` very high (2000+) | Massive page (data tables, grids, feeds) | Use `get_page_summary` instead of `get_capture`. Focus on specific roles via `get_elements_by_role`. |
| `console.errors` > 0 | Page has JavaScript errors | Read the errors - they often explain the UI bug. Fix the JS error first, UI issue may resolve. |
| `network` has failed requests | API calls failing | Check if the UI bug is caused by missing data. Fix the API/endpoint, not the UI. |
| `landmarks.issues` not empty | Missing `<main>`, duplicate unlabeled navs | These are real a11y issues. Fix them - add `<main>`, add `aria-label` to duplicate landmarks. |
| `stacking.issues` not empty | Z-index conflicts between siblings | Use the stacking data to identify which elements overlap and fix z-index or positioning. |
| `focus.issues` not empty | Unreachable elements, empty focus traps | Check for `tabindex="-1"` on interactive elements, or modals without focusable children. |
| `components.framework` is `none` | Plain HTML, or framework not detected | Source linking via `find_source` still works (uses testid/label grep). Component names won't be available. |
| Capture JSON > 100KB | Large page with many elements | `get_latest_capture` auto-returns summary. Use targeted tools (`get_elements_by_role`, `get_interactive_elements`) instead of `get_capture`. |

## Common hostile DOM patterns and fixes

### Script errors on the page
The `console` section captures errors. Read them before fixing UI issues - a JavaScript error is often the root cause of a visual bug. If you see `TypeError: Cannot read properties of null`, the element doesn't exist yet (race condition or failed API call).

### Missing or broken accessibility
Run `audit_accessibility` first. Common patterns:
- `<img>` without `alt` - add descriptive alt text
- `<button>` with empty `aria-label=""` - remove the empty attribute (worse than no label) or add a real label
- `<input>` without associated `<label>` - add `<label for="id">` or `aria-label`
- Low contrast text - check the contrast ratio in the audit, adjust colors to meet WCAG AA (4.5:1)

### Empty captures (0 nodes)
Don't try to fix an empty capture. Ask the user:
1. "The capture shows 0 elements. Is the page fully loaded?"
2. "Can you reload the page and capture again?"
3. Check `network` for failed requests that might explain why the page is empty.

### Captures during page transitions
SPA navigation can produce captures mid-render. Signs: skeleton loaders in the DOM, React Suspense boundaries, very few elements compared to expected. Ask for a re-capture after the page settles.

## What ViewGraph does NOT capture

Be aware of these blind spots:
- **Cross-origin iframe content** - invisible to the content script. If the user reports an issue inside an iframe, you can't see it in the capture.
- **Closed shadow DOM** - web components with closed shadow roots are opaque. Open shadow roots are traversed.
- **Canvas/WebGL content** - games, charts rendered on canvas, map tiles. The capture sees the `<canvas>` element but not what's drawn on it.
- **Print stylesheets** - captures reflect screen styles, not print layout.
- **Hover/focus states** - captures are point-in-time snapshots. Hover effects and focus rings aren't captured unless the user triggers them before capturing.

When the user reports an issue in one of these blind spots, tell them you can't see that content in the capture and suggest alternative debugging approaches.
