# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T05:32:50.255Z
Total sites: 2 | With accuracy data: 2

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 78.6% | 77.0% | 77.0% | 80.2% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 97.2% | 94.3% | 94.3% | 100.0% |
| interactiveRecall | 20% | 99.8% | 99.5% | 99.5% | 100.0% |
| selectorAccuracy | 20% | 98.0% | 96.1% | 96.1% | 99.8% |
| bboxAccuracy | 15% | 12.4% | 5.4% | 5.4% | 19.4% |
| textAccuracy | 10% | 43.4% | 32.1% | 32.1% | 54.7% |
| semanticRecall | 10% | 85.0% | 70.0% | 70.0% | 100.0% |
| elementRecall | 5% | 98.0% | 96.1% | 96.1% | 99.8% |

## Element Recall (VG captured / ground-truth visible)

Sites: 2
Recall: median 82.8%, mean 91.4%, range 82.8%-100.0%
VG nodes: median 771, p95 1709
GT visible: median 771, p95 2064

## Bounding Box Accuracy

Within 5px: median 5.4%, mean 12.4%
Within 10px: median 5.4%, mean 12.4%
Mean deviation: median 525.3px, p95 5650.7px

## Text Accuracy

Exact match: median 27.3%, mean 32.7%
Match (exact+prefix): median 32.1%, mean 43.4%
Elements with empty text in VG: 135

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 802 | 2307 | 3109 |
| visibleElements | 771 | 2064 | 2835 |
| hiddenElements | 31 | 243 | 274 |
| interactiveElements | 229 | 402 | 631 |
| semanticElements | 5 | 30 | 35 |
| elementsWithTestid | 0 | 1380 | 1380 |
| elementsWithRole | 0 | 4 | 4 |
| elementsWithAriaLabel | 0 | 96 | 96 |
| elementsWithText | 580 | 1392 | 1972 |
| shadowRoots | 0 | 0 | 0 |

Visibility ratio (visible/total): median 89.5%, mean 92.8%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| news | 2 | 77.0% | 94.3% | 99.5% | 96.1% | 5.4% | 32.1% | 70.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 1 | 77.0% | 94.3% | 99.5% | 99.8% | 5.4% |
| simple | 1 | 80.2% | 100.0% | 100.0% | 96.1% | 19.4% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| ssr | 1 | 77.0% | 99.8% | 5.4% | 99.5% |
| static | 1 | 80.2% | 96.1% | 19.4% | 100.0% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.bbc.com | news | 77.0% | 99.8% | 5.4% | 54.7% | 99.5% |
| https://news.ycombinator.com | news | 80.2% | 96.1% | 19.4% | 32.1% | 100.0% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 2 | 100.0% |
| viewgraph | 2 | 100.0% |
| snapshot | 2 | 100.0% |
| screenshot | 2 | 100.0% |
| accuracy | 2 | 100.0% |
| allOk | 1 | 50.0% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 1572 | 4660 | 3116 |
| groundTruth | 15 | 31 | 23 |
| viewgraph | 117 | 235 | 176 |
| accuracy | 82 | 220 | 151 |
| snapshot | 32 | 114 | 73 |
| screenshot | 51 | 107 | 79 |

### Failures

| Category | Count | Examples |
|---|---|---|
| bot-blocked | 1 | Likely blocked: captcha-iframe |

### Bot Detection

Blocked: 1 sites (50.0%)

| Signal | Count |
|---|---|
| captcha-iframe | 1 |

Blocked URLs: https://www.bbc.com