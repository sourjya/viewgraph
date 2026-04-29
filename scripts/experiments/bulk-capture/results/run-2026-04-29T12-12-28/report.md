# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-29T12:13:50.389Z
Total sites: 47 | Clean (not blocked/failed): 38 | With accuracy data: 28
Excluded: 9 (bot-blocked: 6, CSP-blocked: 2, nav-failed: 1)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 88.9% | 91.2% | 70.0% | 95.3% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 96.6% | 100.0% | 87.5% | 100.0% |
| interactiveRecall | 20% | 87.3% | 97.8% | 26.7% | 100.0% |
| selectorAccuracy | 20% | 98.6% | 99.5% | 94.4% | 100.0% |
| bboxAccuracy | 15% | 100.0% | 100.0% | 100.0% | 100.0% |
| textAccuracy | 10% | 53.2% | 51.6% | 21.6% | 88.4% |
| semanticRecall | 10% | 72.2% | 80.0% | 0.0% | 100.0% |
| elementRecall | 5% | 98.6% | 99.5% | 94.4% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 28
Recall: median 76.9%, mean 71.5%, range 0.2%-100.0%
VG nodes: median 445, p95 1343
GT visible: median 767, p95 1763

## Bounding Box Accuracy

Within 5px: median 100.0%, mean 100.0%
Within 10px: median 100.0%, mean 100.0%
Mean deviation: median 0px, p95 0px

## Text Accuracy

Exact match: median 37.6%, mean 41.1%
Match (exact+prefix): median 51.6%, mean 53.2%
Elements with empty text in VG: 1019

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 984 | 3724 | 49564 |
| visibleElements | 566 | 1763 | 29655 |
| hiddenElements | 332 | 2003 | 19909 |
| interactiveElements | 184 | 903 | 9664 |
| semanticElements | 10 | 53 | 658 |
| elementsWithTestid | 0 | 180 | 1612 |
| elementsWithRole | 26 | 239 | 2224 |
| elementsWithAriaLabel | 20 | 84 | 1302 |
| elementsWithText | 566 | 2558 | 29015 |
| shadowRoots | 0 | 75 | 248 |

Visibility ratio (visible/total): median 68.2%, mean 64.5%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| government | 2 | 84.8% | 100.0% | 57.3% | 97.0% | 100.0% | 26.5% | 67.9% |
| docs | 2 | 88.1% | 100.0% | 97.8% | 100.0% | 100.0% | 16.2% | 33.3% |
| i18n | 3 | 88.8% | 100.0% | 96.4% | 97.7% | 100.0% | 55.3% | 63.6% |
| ecommerce | 2 | 88.8% | 99.8% | 94.8% | 96.3% | 100.0% | 41.7% | 61.9% |
| spa | 3 | 89.9% | 100.0% | 87.8% | 100.0% | 100.0% | 78.5% | 75.0% |
| data | 4 | 90.3% | 100.0% | 77.8% | 100.0% | 100.0% | 30.9% | 91.3% |
| webcomponents | 1 | 90.4% | 100.0% | 96.9% | 95.6% | 100.0% | 41.7% | 80.0% |
| tools | 2 | 91.9% | 100.0% | 100.0% | 99.8% | 100.0% | 51.9% | 66.7% |
| news | 2 | 92.0% | 100.0% | 100.0% | 95.4% | 100.0% | 31.6% | 80.0% |
| media | 3 | 93.6% | 100.0% | 96.2% | 99.5% | 100.0% | 56.8% | 70.0% |
| social | 1 | 93.6% | 100.0% | 98.5% | 99.9% | 100.0% | 57.0% | 81.8% |
| static | 3 | 94.2% | 100.0% | 100.0% | 97.7% | 100.0% | 59.1% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 12 | 89.9% | 100.0% | 91.8% | 99.9% | 100.0% |
| moderate | 9 | 91.9% | 100.0% | 97.8% | 98.8% | 100.0% |
| simple | 7 | 93.1% | 100.0% | 100.0% | 99.5% | 100.0% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| hybrid | 4 | 88.8% | 97.9% | 100.0% | 94.8% |
| csr | 8 | 89.9% | 100.0% | 100.0% | 77.8% |
| ssr | 8 | 92.0% | 97.7% | 100.0% | 98.5% |
| static | 8 | 92.3% | 99.3% | 100.0% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| cyrillic | 1 | 88.8% | 55.3% | 97.7% |
| latin | 25 | 91.2% | 51.5% | 99.8% |
| mixed | 1 | 93.6% | 56.8% | 99.3% |
| cjk | 1 | 95.3% | 73.0% | 98.8% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 57.5% | 100.0% | 100.0% | 78.5% | 26.7% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.artstation.com | media | 72.2% | 99.5% | 100.0% | 39.7% | 41.9% |
| https://www.who.int | government | 84.8% | 97.0% | 100.0% | 73.2% | 57.3% |
| https://www.lemonde.fr | i18n | 87.8% | 94.4% | 100.0% | 35.7% | 96.4% |
| https://react.dev | docs | 88.1% | 100.0% | 100.0% | 51.6% | 97.8% |
| https://lenta.ru | i18n | 88.8% | 97.7% | 100.0% | 55.3% | 88.0% |
| https://www.ebay.com | ecommerce | 88.8% | 97.9% | 100.0% | 41.7% | 94.8% |
| https://doc.rust-lang.org/book/ | docs | 89.1% | 100.0% | 100.0% | 16.2% | 100.0% |
| https://www.canva.com | spa | 89.9% | 100.0% | 100.0% | 40.4% | 87.8% |
| https://earthquake.usgs.gov/earthquakes/map/ | data | 90.3% | 100.0% | 100.0% | 51.4% | 77.8% |
| https://ourworldindata.org | data | 90.3% | 99.0% | 100.0% | 30.9% | 91.8% |
| https://shoelace.style | webcomponents | 90.4% | 95.6% | 100.0% | 41.7% | 96.9% |
| https://excalidraw.com | spa | 91.2% | 99.0% | 100.0% | 78.5% | 92.9% |
| https://regex101.com | tools | 91.9% | 100.0% | 100.0% | 51.9% | 100.0% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 46 | 97.9% |
| viewgraph | 33 | 70.2% |
| snapshot | 32 | 68.1% |
| screenshot | 42 | 89.4% |
| accuracy | 33 | 70.2% |
| allOk | 28 | 59.6% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 5222 | 15684 | 6377 |
| groundTruth | 33 | 133 | 48 |
| viewgraph | 125 | 743 | 226 |
| accuracy | 117 | 689 | 159 |
| snapshot | 104 | 607 | 162 |
| screenshot | 137 | 1229 | 374 |

### Failures

| Category | Count | Examples |
|---|---|---|
| capture-crash | 19 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| inject-error | 2 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| bot-blocked | 6 | Likely blocked: cloudflare-title; Likely blocked: captcha-iframe |
| timeout | 2 | Timeout after 20000ms for https://www.chosun.com; Timeout after 20000ms for https://www.globo.com |
| nav-timeout | 1 | Navigation timeout of 20000 ms exceeded |

### Bot Detection

Blocked: 6 sites (12.8%)

| Signal | Count |
|---|---|
| captcha-iframe | 5 |
| cloudflare-title | 1 |

Blocked URLs: https://validator.w3.org, https://www.bbc.com, https://www.nationalgeographic.com, https://www.reddit.com, https://www.target.com, https://www.theverge.com