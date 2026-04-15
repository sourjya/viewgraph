# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-15T09:30:51.101Z
Total sites: 3 | Clean (not blocked/failed): 1 | With accuracy data: 1
Excluded: 2 (bot-blocked: 2, CSP-blocked: 0, nav-failed: 0)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 92.2% | 92.2% | 92.2% | 92.2% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 100.0% | 100.0% | 100.0% | 100.0% |
| interactiveRecall | 20% | 100.0% | 100.0% | 100.0% | 100.0% |
| selectorAccuracy | 20% | 96.1% | 96.1% | 96.1% | 96.1% |
| bboxAccuracy | 15% | 100.0% | 100.0% | 100.0% | 100.0% |
| textAccuracy | 10% | 31.6% | 31.6% | 31.6% | 31.6% |
| semanticRecall | 10% | 100.0% | 100.0% | 100.0% | 100.0% |
| elementRecall | 5% | 96.1% | 96.1% | 96.1% | 96.1% |

## Element Recall (VG captured / ground-truth visible)

Sites: 1
Recall: median 100.0%, mean 100.0%, range 100.0%-100.0%
VG nodes: median 765, p95 765
GT visible: median 765, p95 765

## Bounding Box Accuracy

Within 5px: median 100.0%, mean 100.0%
Within 10px: median 100.0%, mean 100.0%
Mean deviation: median 0px, p95 0px

## Text Accuracy

Exact match: median 26.1%, mean 26.1%
Match (exact+prefix): median 31.6%, mean 31.6%
Elements with empty text in VG: 67

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 795 | 795 | 795 |
| visibleElements | 765 | 765 | 765 |
| hiddenElements | 30 | 30 | 30 |
| interactiveElements | 226 | 226 | 226 |
| semanticElements | 5 | 5 | 5 |
| elementsWithTestid | 0 | 0 | 0 |
| elementsWithRole | 0 | 0 | 0 |
| elementsWithAriaLabel | 0 | 0 | 0 |
| elementsWithText | 576 | 576 | 576 |
| shadowRoots | 0 | 0 | 0 |

Visibility ratio (visible/total): median 96.2%, mean 96.2%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| news | 1 | 92.2% | 100.0% | 100.0% | 96.1% | 100.0% | 31.6% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| simple | 1 | 92.2% | 100.0% | 100.0% | 96.1% | 100.0% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| static | 1 | 92.2% | 96.1% | 100.0% | 100.0% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://news.ycombinator.com | news | 92.2% | 96.1% | 100.0% | 31.6% | 100.0% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 3 | 100.0% |
| viewgraph | 3 | 100.0% |
| snapshot | 3 | 100.0% |
| screenshot | 3 | 100.0% |
| accuracy | 3 | 100.0% |
| allOk | 1 | 33.3% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 6449 | 13560 | 7252 |
| groundTruth | 39 | 42 | 39 |
| viewgraph | 421 | 509 | 385 |
| accuracy | 308 | 481 | 312 |
| snapshot | 147 | 319 | 174 |
| screenshot | 190 | 198 | 163 |

### Failures

| Category | Count | Examples |
|---|---|---|
| bot-blocked | 2 | Likely blocked: captcha-iframe |

### Bot Detection

Blocked: 2 sites (66.7%)

| Signal | Count |
|---|---|
| captcha-iframe | 2 |

Blocked URLs: https://www.bbc.com, https://www.theverge.com