# Bulk Capture Experiment - Requirements

## Overview

Automated experiment that uses Puppeteer to load 150 diverse websites
and run ViewGraph's capture pipeline on each, producing 3 snapshot types
per site. Compares the outputs to measure capture reliability, coverage,
and performance across real-world DOM conditions.

The experiment reuses the extension's core modules (traverser, serializer,
html-snapshot, salience) directly in Puppeteer's page context via
`page.evaluate()` - no browser extension needed.

## Goals

1. Measure ViewGraph capture reliability across diverse real-world sites
2. Compare the 3 snapshot types for coverage and information density
3. Identify failure modes: sites that crash the traverser, produce empty
   captures, or exceed size limits
4. Produce a data-driven report with per-site and aggregate metrics

## The 3 Snapshot Types

| Type | Source | Format | What it captures |
|---|---|---|---|
| ViewGraph JSON | `traverser.js` + `salience.js` + `serializer.js` | `.json` | Structured DOM tree with salience scoring, styles, attributes, relations |
| HTML Snapshot | `html-snapshot.js` | `.html` | Serialized DOM clone with inline computed styles, scripts stripped |
| Screenshot | Puppeteer `page.screenshot()` | `.png` | Pixel-perfect visual rendering of the viewport |

## Functional Requirements

### FR-1: Site List
- FR-1.1: Curated list of 150 websites across 10+ categories
- FR-1.2: Categories: news, e-commerce, SPA, static/blog, government,
  i18n/non-Latin, social media, documentation, dashboards, media-heavy
- FR-1.3: Mix of complexity: simple static pages, heavy SPAs, data tables
- FR-1.4: All sites must be publicly accessible (no auth required)
- FR-1.5: Export as a JS module with URL, category, and expected complexity

### FR-2: Capture Runner
- FR-2.1: Launch Puppeteer with headless Chrome
- FR-2.2: For each site: navigate, wait for load, run all 3 captures
- FR-2.3: ViewGraph JSON: inject traverser + salience + serializer into
  page context via `page.evaluate()`, return the capture object
- FR-2.4: HTML Snapshot: inject `html-snapshot.js` logic into page
  context, return the HTML string
- FR-2.5: Screenshot: use `page.screenshot({ fullPage: false })` for
  viewport-only PNG
- FR-2.6: Timeout per site: 30 seconds (navigation + capture combined)
- FR-2.7: Record per-site timing: navigation time, capture time per type
- FR-2.8: Record errors: navigation failures, capture crashes, timeouts
- FR-2.9: Save all outputs to `results/{hostname}/` subdirectories
- FR-2.10: Concurrency: 3 parallel browser pages (configurable)

### FR-3: Analysis Module
- FR-3.1: For each site, compute:
  - ViewGraph JSON: node count, capture size (bytes), salience distribution
  - HTML Snapshot: element count, size (bytes)
  - Screenshot: file size (bytes), dimensions
  - Timing: ms per capture type
  - Error status per capture type
- FR-3.2: Cross-type comparison per site:
  - Element coverage: VG nodes vs HTML elements (fidelity ratio)
  - Information density: VG JSON size vs HTML size vs PNG size
  - Capture success rate per type
- FR-3.3: Aggregate statistics:
  - Success rate per capture type across all sites
  - Median/p95 capture time per type
  - Median/p95 capture size per type
  - Failure breakdown by error category
  - Category-level breakdown (e.g., SPAs vs static sites)
- FR-3.4: Output a JSON report + human-readable markdown summary

### FR-4: Orchestrator
- FR-4.1: CLI entry point: `node scripts/experiments/bulk-capture/run.js`
- FR-4.2: Options: `--sites N` (limit), `--concurrency N`, `--category X`
- FR-4.3: Resume support: skip sites that already have results
- FR-4.4: Progress output to stderr
- FR-4.5: Final report written to `results/report.json` and `results/report.md`

## Non-Functional Requirements

### NFR-1: Isolation
- Experiment lives in `scripts/experiments/bulk-capture/` - not in
  `server/` or `extension/`
- Own `package.json` with puppeteer as the only external dependency
- Imports extension modules directly from `../../extension/lib/`

### NFR-2: Robustness
- One site failure must not stop the experiment
- All errors captured in the results, never thrown to top level
- Graceful cleanup: close all browser pages on SIGINT

### NFR-3: Reproducibility
- Results directory timestamped: `results/run-YYYY-MM-DDTHH-MM-SS/`
- Site list is deterministic (no randomization unless seeded)
- All config (timeout, concurrency, viewport) recorded in results metadata
