# ADR-003: HTML Snapshot Capture via SingleFile Core

**Date:** 2026-04-08

**Status:** Accepted

**Deciders:** Project team

---

## Context

ViewGraph captures structured DOM data as JSON for agent consumption. This
format is optimized for machines - it discards visual rendering, inlined
resources, and non-semantic content. There is currently no way to:

1. Measure how much of the visible page the structured capture represents
2. Provide a human-readable visual reference alongside the agent-readable JSON
3. Create a ground truth artifact for validating capture fidelity over time

QA workflows also suffer: developers receive structured captures but have
no visual reference to compare against. Screenshots help but lose DOM
structure and are not self-contained.

## Decision

Produce HTML snapshots alongside ViewGraph JSON captures using a
two-tier approach:

1. **Internal fidelity measurement:** Our own lightweight HTML serializer
   (no external dependency, no license issues). Captures DOM + inline
   styles, strips scripts. Sufficient for element-level comparison.
2. **Full visual snapshots:** Recommend SingleFile as an optional
   companion extension. Users drop SingleFile HTML into `snapshots/`
   for full-fidelity visual reference.

Note: `single-file-core` is **AGPL-3.0** (not MIT as originally
assumed). Bundling it would require our extension to be AGPL. We avoid
this by building our own serializer for the core use case and treating
SingleFile as an optional external tool.

### Dual output model

One capture action produces two artifacts:

| Artifact | Format | Audience | Purpose |
|---|---|---|---|
| `viewgraph-{host}-{ts}.json` | ViewGraph v2.1 | Agents | Structured page context |
| `viewgraph-{host}-{ts}.html` | Self-contained HTML | Humans + fidelity tooling | Visual reference, ground truth |

### SingleFile Core as library, not fork

We use `single-file-core` as an npm dependency inside our content script,
not as a separate extension or fork. SingleFile Core:

- Serializes DOM + computed styles + images + fonts into one HTML file
- Handles shadow DOM, iframes, canvas, SVG
- Strips scripts (produces a static snapshot)
- Inlines all resources as data URIs
- Works in Chrome and Firefox
- MIT licensed, ~50KB minified

### Opt-in, not default

HTML snapshot capture is off by default. Users enable it via a toggle in
the popup or extension settings. Reasons:

- Snapshots are large (1-10MB with inlined images)
- Adds 1-5 seconds to capture time
- Not all users need the visual reference
- Keeps the default capture fast and lightweight

### Storage separation

HTML snapshots go in a `snapshots/` subdirectory, not mixed with JSON
captures. The JSON capture's metadata references the snapshot filename.

```
.viewgraph/
  captures/     viewgraph-localhost-20260408-120612.json
  snapshots/    viewgraph-localhost-20260408-120612.html
```

### Fidelity measurement (internal tooling)

When both artifacts exist for the same page, the server can compute a
fidelity report comparing them:

- Element coverage: % of HTML elements present in JSON capture
- TestID coverage: % of data-testid elements captured
- Text coverage: % of visible text captured
- Interactive coverage: % of interactive elements with locators

This becomes an internal quality metric for the traverser. If fidelity
drops below a threshold after a code change, we know something regressed.

## Alternatives Considered

### 1. Screenshot only (no HTML snapshot)

Screenshots are simpler but lose DOM structure. They can't be parsed to
compute element coverage. They also degrade at different zoom levels and
viewport sizes. Rejected because they don't serve the fidelity measurement
use case.

### 2. Fork SingleFile extension

Forking the full extension gives maximum control but creates a maintenance
burden. SingleFile has 50K+ lines of code, most of which we don't need
(PDF support, annotation UI, cloud sync). Using the core library gives us
the serialization engine without the baggage.

### 3. Build our own HTML serializer

We could serialize the DOM ourselves using `document.documentElement.outerHTML`
plus resource inlining. This is simpler but misses edge cases that
SingleFile has solved over years: shadow DOM, CSS @import chains, canvas
serialization, font subsetting, cross-origin resource handling. Not worth
reimplementing.

### 4. Use CDP Page.captureSnapshot (MHTML)

Chrome DevTools Protocol can produce MHTML snapshots. This requires the
`debugger` permission (scary permission prompt) and produces a format
that's harder to parse for fidelity comparison. Also not available in
Firefox. Rejected for permission and compatibility reasons.

## Consequences

### Positive

- Concrete fidelity metric for every capture
- Human-readable visual reference for QA workflows
- Ground truth for validating traverser improvements
- Leverages battle-tested serialization (SingleFile has 100K+ users)
- MIT license, no legal concerns

### Negative

- New dependency (~50KB added to extension bundle)
- Snapshot files are large (1-10MB), need storage management
- Parallel execution adds complexity to capture flow
- SingleFile Core API may change across versions

### Risks

- SingleFile Core maintenance: if the library is abandoned, we'd need to
  fork or replace it. Mitigated by the library being stable and widely used.
- Performance on large pages: SingleFile can be slow on pages with many
  images. Mitigated by making it opt-in and running in parallel with the
  ViewGraph traverser.

## Implementation Plan

1. **Phase 1 (M9):** Add `single-file-core` as dev dependency. Build
   internal fidelity measurement tool that compares HTML snapshots against
   ViewGraph captures. Run as a test/CI tool, not user-facing.
2. **Phase 2 (post-M9):** Add "Include HTML snapshot" toggle to extension
   popup. Run SingleFile Core in parallel with ViewGraph traverser.
3. **Phase 3 (future):** Fidelity report as an MCP tool
   (`get_fidelity_report`). Automated fidelity regression detection.
