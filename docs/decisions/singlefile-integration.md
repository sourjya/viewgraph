# SingleFile Integration - HTML Snapshot Capture

**Date:** 2026-04-08

**Status:** Idea - to be evaluated for feasibility

**Source:** [SingleFile](https://github.com/nickerso/single-file-core) (MIT license)

---

## Two use cases

### 1. Internal: Capture fidelity measurement

Capture a SingleFile HTML snapshot alongside every ViewGraph JSON capture.
Compare them to measure how much of the visible page our structured format
actually represents.

**Metrics we can derive:**
- Element coverage: % of HTML elements present in ViewGraph capture
- Text coverage: % of visible text captured
- Style coverage: % of computed styles captured
- Interactive coverage: % of interactive elements with locators
- Visual fidelity: pixel-diff the SingleFile render vs original page

This gives us a concrete quality score for every capture and lets us
track improvement over time as we enhance the traverser.

### 2. User-facing: Dual capture mode

Offer "Save full page snapshot" as a secondary capture mode in the
extension. One click produces:

1. `viewgraph-localhost-20260408-120612.json` - structured, for agents
2. `viewgraph-localhost-20260408-120612.html` - visual, for humans

QA gets the machine-readable artifact AND the visual reference in one
action. The HTML snapshot serves as the "ground truth" that the agent's
understanding is measured against.

---

## Technical approach

### SingleFile Core library

SingleFile has a standalone core library (`single-file-core`) that can
run inside a content script without the full extension. It:

- Serializes DOM + computed styles + images + fonts into one HTML file
- Handles shadow DOM, iframes, canvas, SVG
- Removes scripts (static snapshot)
- Inlines all resources as data URIs
- Works in both Chrome and Firefox

### Integration in ViewGraph extension

```
Content Script
  ├── ViewGraph traverser (existing) -> JSON capture
  └── SingleFile core (new) -> HTML snapshot
```

Both run in the same content script context. The background script
receives both outputs and pushes them to the MCP server.

### Dependency

- `single-file-core` - MIT license, ~50KB minified
- No additional permissions needed (same content script access)
- Add as devDependency in extension/package.json

---

## MCP server changes

### New endpoint

`POST /snapshots` - accepts HTML snapshot alongside capture.

Or simpler: include the HTML filename in the capture metadata and write
both files to the captures directory.

### New tool (optional)

`get_snapshot({ filename })` - returns the HTML snapshot path so the
agent can reference it. Not high priority since agents work with the
JSON, but useful for "show me what the page looked like" workflows.

---

## Capture fidelity report

When both captures exist for the same page, the MCP server can generate
a fidelity report:

```json
{
  "fidelityReport": {
    "captureFile": "viewgraph-localhost-20260408-120612.json",
    "snapshotFile": "viewgraph-localhost-20260408-120612.html",
    "elementCoverage": 0.85,
    "testidCoverage": 0.97,
    "textCoverage": 0.92,
    "interactiveCoverage": 1.0,
    "missingElements": ["sidebar-close (hidden)", "svg:icon-3 (decorative)"]
  }
}
```

This becomes a quality gate: if fidelity drops below a threshold, we
know the traverser needs improvement.

---

## Roadmap placement

- **Phase 1 (M9):** Internal fidelity measurement tool. Run SingleFile
  core in a test harness, compare against ViewGraph captures, generate
  coverage reports.
- **Phase 2 (post-M9):** User-facing dual capture mode in the extension.
  "Capture Page" produces both JSON + HTML.
- **Phase 3 (future):** Fidelity report as an MCP tool.

---

## Open questions

1. **Size budget:** SingleFile snapshots can be 1-10MB (inlined images).
   Do we store them in the same captures directory or a separate
   `snapshots/` directory?
2. **Performance:** SingleFile core takes 1-5 seconds depending on page
   complexity. Do we run it in parallel with the ViewGraph traverser or
   sequentially?
3. **Always-on vs opt-in:** Should every capture include an HTML snapshot,
   or should it be a separate button/mode?
