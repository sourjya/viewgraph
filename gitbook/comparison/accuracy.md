# Capture Accuracy

ViewGraph's capture accuracy is measured automatically against diverse real-world websites using a [bulk capture experiment](https://github.com/sourjya/viewgraph/tree/main/scripts/experiments/bulk-capture).

## Latest Results

Set A (Breadth) - 48 sites across 12 categories, 4 rendering types, 6 writing systems:

| Dimension | Median | What it measures |
|---|---|---|
| **Composite** | **92.1%** | Weighted combination of all dimensions |
| Selector accuracy | 99.7% | VG's CSS selectors resolve to real DOM elements |
| Testid recall | 100.0% | All `data-testid` elements captured |
| Interactive recall | 97.9% | Buttons, links, inputs captured |
| Bbox accuracy | 100.0% | Bounding boxes preserved through serialization |
| Semantic recall | 88.2% | Landmark elements (nav, main, header) captured |
| Text match | 53.1% | `visibleText` matches element text |

Text match is lower by design - VG truncates text to 200 characters to keep captures within LLM context windows.

## Experiment Sets

Three sets test different hypotheses:

| Set | Focus | Sites | Composite |
|---|---|---|---|
| A (Breadth) | Max diversity across all axes | 48 | 92.1% |
| B (Depth) | Hardest patterns: SPAs, RTL, shadow DOM | 50 | 79.0%* |
| C (Real-world) | Traffic-weighted, typical usage | 50 | 79.2%* |

*Sets B and C were run before measurement fixes and include bot-blocked sites in the denominator.

## Methodology

Accuracy is measured by injecting ViewGraph's capture modules (traverser, salience scorer, serializer) into real websites via Puppeteer and comparing the output against live DOM ground truth collected in the same browser session.

For each site:
1. A ground-truth collector walks the DOM and counts all visible elements, interactive elements, `data-testid` elements, semantic landmarks, and text content
2. The VG capture runs immediately after
3. A measurement function matches every VG element back to the live DOM by selector to verify correctness
4. Bounding boxes are validated by comparing serialized output against the traverser's original values

Sites that block headless browsers (bot detection) or reject script injection (strict CSP) are excluded from accuracy calculations. In our test pool, ~20% of sites fall into this category.

Each run is recorded in a timestamped index so accuracy can be tracked across code changes. Sites are tagged across 5 diversity axes (category, complexity, rendering type, writing system, accessibility maturity).

## No Competitor Publishes Equivalent Metrics

Browser automation MCP servers (Playwright MCP, Browser Use) operate on accessibility trees or screenshots rather than structured DOM, so there is no directly comparable recall/precision measurement. ViewGraph is the only tool that produces structured, agent-consumable DOM captures and measures their fidelity against ground truth.

Full experiment code and results: [scripts/experiments/bulk-capture/](https://github.com/sourjya/viewgraph/tree/main/scripts/experiments/bulk-capture)
