# Bulk Capture Accuracy Experiment

Automated accuracy measurement for ViewGraph's DOM capture pipeline. Uses Puppeteer to load 150 diverse websites, run ViewGraph's capture engine, and compare the output against live DOM ground truth across 7 accuracy dimensions.

## Quick Start

```bash
cd scripts/experiments/bulk-capture
npm install

# Run one experiment set (50 sites, ~2 min)
node run.js --set a          # breadth: max diversity
node run.js --set b          # depth: hardest patterns (SPAs, RTL, shadow DOM)
node run.js --set c          # real-world: traffic-weighted

# Run all 3 sets
node run.js --all-sets

# Quick smoke test
node run.js --set a --sites 5
```

## Accuracy Dimensions

Each site is measured across 7 dimensions, weighted into a composite score:

| Dimension | Weight | What it measures |
|---|---|---|
| Testid recall | 20% | Did VG capture all `data-testid` elements? |
| Interactive recall | 20% | Did VG capture all buttons, links, inputs? |
| Selector accuracy | 20% | Do VG's CSS selectors resolve to real DOM elements? |
| Bbox accuracy | 15% | Are bounding boxes preserved through serialization? |
| Text accuracy | 10% | Does VG's `visibleText` match the element's real text? |
| Semantic recall | 10% | Did VG capture landmark elements (nav, main, header)? |
| Element recall | 5% | What fraction of visible elements did VG capture? |

## Diversity Axes

Every site is tagged across 5 axes for slicing accuracy data:

- **category**: news, ecommerce, spa, static, government, i18n, docs, social, data, media, tools, webcomponents
- **complexity**: simple, moderate, complex
- **rendering**: static, ssr, csr, hybrid
- **script**: latin, cjk, arabic, cyrillic, indic, mixed
- **a11y**: high, medium, low

## Experiment Sets

| Set | Sites | Hypothesis | Profile |
|---|---|---|---|
| A (Breadth) | 48 | Does VG work across the full spectrum? | Max diversity: 12 categories, 4 rendering types, 6 scripts |
| B (Depth) | 50 | Where does VG break? | Hard patterns: 56% CSR, 74% complex, all RTL/CJK |
| C (Real-world) | 50 | What accuracy would a typical user see? | Traffic-weighted: 50% SSR, 54% moderate |

## Latest Results

See [results/index.json](./results/index.json) for the full run history.

## Output Structure

```
results/
  index.json                          # All runs with timestamps for comparison
  run-2026-04-12T10-27-53/
    metadata.json                     # Run config (set, concurrency, viewport)
    report.json                       # Full accuracy report (machine-readable)
    report.md                         # Full accuracy report (human-readable)
    sites/
      www-bbc-com/
        capture.json                  # ViewGraph JSON capture
        snapshot.html                 # HTML snapshot
        screenshot.png                # Viewport screenshot
        metrics.json                  # Per-site accuracy + ground truth
```

## CLI Options

```
node run.js [options]

  --set X          Experiment set: a, b, c
  --all-sets       Run all 3 sets sequentially
  --sites N        Limit to first N sites
  --concurrency N  Parallel browser pages (default: 3)
  --category X     Filter to one category
  --resume         Skip sites with existing results
  --timeout N      Per-site timeout in seconds (default: 30)
  --analyze-only   Re-run analysis on existing results
  --run-dir PATH   Use specific results directory
```
