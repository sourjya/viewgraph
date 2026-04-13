# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T10:29:58.969Z
Total sites: 48 | Clean (not blocked/failed): 34 | With accuracy data: 26
Excluded: 14 (bot-blocked: 8, CSP-blocked: 2, nav-failed: 4)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 89.4% | 92.1% | 70.0% | 96.4% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 96.3% | 100.0% | 87.5% | 100.0% |
| interactiveRecall | 20% | 86.8% | 97.9% | 26.7% | 100.0% |
| selectorAccuracy | 20% | 99.0% | 99.7% | 96.1% | 100.0% |
| bboxAccuracy | 15% | 100.0% | 100.0% | 100.0% | 100.0% |
| textAccuracy | 10% | 51.8% | 53.1% | 21.6% | 88.4% |
| semanticRecall | 10% | 78.2% | 88.2% | 0.0% | 100.0% |
| elementRecall | 5% | 99.0% | 99.7% | 96.1% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 26
Recall: median 98.1%, mean 87.5%, range 0.3%-100.0%
VG nodes: median 600, p95 1975
GT visible: median 771, p95 1982

## Bounding Box Accuracy

Within 5px: median 100.0%, mean 100.0%
Within 10px: median 100.0%, mean 100.0%
Mean deviation: median 0px, p95 0px

## Text Accuracy

Exact match: median 34.3%, mean 38.9%
Match (exact+prefix): median 53.1%, mean 51.8%
Elements with empty text in VG: 1951

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1028 | 3499 | 46607 |
| visibleElements | 566 | 1982 | 27535 |
| hiddenElements | 378 | 1854 | 19072 |
| interactiveElements | 191 | 766 | 8691 |
| semanticElements | 10 | 51 | 663 |
| elementsWithTestid | 0 | 178 | 1601 |
| elementsWithRole | 16 | 239 | 2057 |
| elementsWithAriaLabel | 18 | 83 | 1164 |
| elementsWithText | 571 | 2569 | 26351 |
| shadowRoots | 0 | 74 | 196 |

Visibility ratio (visible/total): median 67.8%, mean 65.7%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| spa | 2 | 70.0% | 87.5% | 0.0% | 100.0% | 100.0% | 70.9% | 0.0% |
| government | 2 | 84.4% | 100.0% | 58.7% | 97.4% | 100.0% | 30.1% | 67.9% |
| ecommerce | 2 | 89.2% | 99.8% | 95.2% | 97.0% | 100.0% | 44.3% | 62.0% |
| docs | 2 | 89.3% | 100.0% | 97.8% | 100.0% | 100.0% | 19.5% | 44.4% |
| tools | 2 | 90.5% | 100.0% | 95.9% | 99.9% | 100.0% | 47.0% | 66.7% |
| data | 4 | 90.5% | 100.0% | 77.8% | 100.0% | 100.0% | 30.2% | 95.7% |
| i18n | 3 | 92.2% | 100.0% | 97.9% | 99.2% | 100.0% | 58.2% | 94.1% |
| news | 2 | 92.2% | 100.0% | 100.0% | 96.1% | 100.0% | 31.7% | 100.0% |
| media | 3 | 93.1% | 100.0% | 96.2% | 99.7% | 100.0% | 53.1% | 75.0% |
| social | 1 | 93.6% | 100.0% | 98.5% | 99.3% | 100.0% | 59.0% | 81.8% |
| static | 3 | 94.5% | 100.0% | 100.0% | 97.7% | 100.0% | 59.4% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 11 | 90.7% | 100.0% | 92.9% | 100.0% | 100.0% |
| moderate | 8 | 92.2% | 100.0% | 96.2% | 99.2% | 100.0% |
| simple | 7 | 94.1% | 100.0% | 100.0% | 99.5% | 100.0% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| hybrid | 3 | 89.3% | 99.1% | 100.0% | 95.2% |
| csr | 7 | 90.5% | 100.0% | 100.0% | 77.8% |
| ssr | 8 | 92.3% | 99.2% | 100.0% | 97.9% |
| static | 8 | 92.6% | 99.5% | 100.0% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| latin | 23 | 92.0% | 53.0% | 100.0% |
| cyrillic | 1 | 92.2% | 65.2% | 98.2% |
| mixed | 1 | 93.2% | 53.1% | 99.5% |
| cjk | 1 | 95.6% | 58.2% | 99.2% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 59.8% | 100.0% | 100.0% | 73.6% | 26.7% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.artstation.com | media | 71.3% | 99.7% | 100.0% | 29.9% | 41.9% |
| https://www.who.int | government | 84.4% | 97.4% | 100.0% | 65.6% | 58.7% |
| https://www.ebay.com | ecommerce | 89.2% | 98.2% | 100.0% | 44.3% | 95.2% |
| https://react.dev | docs | 89.3% | 100.0% | 100.0% | 53.0% | 97.8% |
| https://doc.rust-lang.org/book/ | docs | 89.4% | 100.0% | 100.0% | 19.5% | 100.0% |
| https://earthquake.usgs.gov/earthquakes/map/ | data | 90.5% | 100.0% | 100.0% | 51.6% | 77.8% |
| https://regex101.com | tools | 90.5% | 100.0% | 100.0% | 47.0% | 95.9% |
| https://excalidraw.com | spa | 90.7% | 100.0% | 100.0% | 70.9% | 92.9% |
| https://ourworldindata.org | data | 90.7% | 99.1% | 100.0% | 30.2% | 91.8% |
| https://danluu.com | static | 92.0% | 99.5% | 100.0% | 21.6% | 100.0% |
| https://www.lemonde.fr | i18n | 92.1% | 100.0% | 100.0% | 30.7% | 97.9% |
| https://lenta.ru | i18n | 92.2% | 98.2% | 100.0% | 65.2% | 86.9% |
| https://news.ycombinator.com | news | 92.2% | 96.1% | 100.0% | 31.7% | 100.0% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 44 | 91.7% |
| viewgraph | 34 | 70.8% |
| snapshot | 34 | 70.8% |
| screenshot | 42 | 87.5% |
| accuracy | 34 | 70.8% |
| allOk | 26 | 54.2% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 4112 | 20000 | 6453 |
| groundTruth | 23 | 103 | 35 |
| viewgraph | 114 | 504 | 161 |
| accuracy | 98 | 527 | 188 |
| snapshot | 101 | 312 | 103 |
| screenshot | 103 | 263 | 137 |

### Failures

| Category | Count | Examples |
|---|---|---|
| capture-crash | 16 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| nav-timeout | 4 | Navigation timeout of 20000 ms exceeded |
| inject-error | 2 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| bot-blocked | 8 | Likely blocked: cloudflare-title; Likely blocked: captcha-iframe |

### Bot Detection

Blocked: 8 sites (16.7%)

| Signal | Count |
|---|---|
| captcha-iframe | 7 |
| cloudflare-title | 1 |

Blocked URLs: https://validator.w3.org, https://www.aljazeera.net, https://www.bbc.com, https://www.chosun.com, https://www.nationalgeographic.com, https://www.reddit.com, https://www.target.com, https://www.theverge.com