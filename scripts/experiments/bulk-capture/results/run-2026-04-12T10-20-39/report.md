# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T10:22:38.905Z
Total sites: 48 | Clean (not blocked/failed): 36 | With accuracy data: 28
Excluded: 12 (bot-blocked: 7, CSP-blocked: 2, nav-failed: 3)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 76.7% | 78.5% | 58.6% | 87.8% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 93.0% | 100.0% | 16.3% | 100.0% |
| interactiveRecall | 20% | 87.1% | 97.9% | 26.7% | 100.0% |
| selectorAccuracy | 20% | 99.1% | 99.9% | 96.1% | 100.0% |
| bboxAccuracy | 15% | 18.7% | 12.1% | 4.4% | 53.5% |
| textAccuracy | 10% | 51.7% | 53.1% | 21.6% | 88.4% |
| semanticRecall | 10% | 79.0% | 88.2% | 0.0% | 100.0% |
| elementRecall | 5% | 99.1% | 99.9% | 96.1% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 28
Recall: median 98.1%, mean 86.9%, range 0.3%-100.0%
VG nodes: median 619, p95 2380
GT visible: median 777, p95 2403

## Bounding Box Accuracy

Within 5px: median 12.1%, mean 18.7%
Within 10px: median 12.1%, mean 18.8%
Mean deviation: median 1638.2px, p95 7300.5px

## Text Accuracy

Exact match: median 34.3%, mean 37.8%
Match (exact+prefix): median 53.1%, mean 51.7%
Elements with empty text in VG: 2504

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1231 | 3500 | 51715 |
| visibleElements | 686 | 2403 | 31281 |
| hiddenElements | 431 | 1854 | 20434 |
| interactiveElements | 198 | 766 | 9416 |
| semanticElements | 10 | 52 | 719 |
| elementsWithTestid | 0 | 178 | 1602 |
| elementsWithRole | 23 | 239 | 2238 |
| elementsWithAriaLabel | 20 | 83 | 1294 |
| elementsWithText | 580 | 2562 | 29594 |
| shadowRoots | 0 | 74 | 196 |

Visibility ratio (visible/total): median 68.1%, mean 66.1%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| media | 4 | 59.4% | 100.0% | 96.0% | 99.6% | 8.7% | 49.7% | 75.0% |
| government | 2 | 71.9% | 100.0% | 58.7% | 97.4% | 11.4% | 29.4% | 67.9% |
| ecommerce | 2 | 75.1% | 100.0% | 95.1% | 97.0% | 4.4% | 41.0% | 62.0% |
| docs | 2 | 76.1% | 100.0% | 97.8% | 100.0% | 11.1% | 19.5% | 44.4% |
| spa | 3 | 76.4% | 100.0% | 82.5% | 100.0% | 20.9% | 70.9% | 75.0% |
| data | 4 | 77.2% | 100.0% | 77.8% | 100.0% | 9.9% | 30.2% | 95.7% |
| tools | 2 | 78.5% | 100.0% | 97.9% | 99.9% | 14.2% | 47.1% | 66.7% |
| i18n | 3 | 78.8% | 100.0% | 97.9% | 99.2% | 6.6% | 58.2% | 94.1% |
| social | 1 | 79.8% | 100.0% | 98.5% | 99.9% | 7.1% | 58.7% | 81.8% |
| news | 2 | 80.1% | 100.0% | 100.0% | 96.1% | 19.4% | 31.7% | 100.0% |
| static | 3 | 83.9% | 100.0% | 100.0% | 97.7% | 29.4% | 59.4% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 13 | 77.2% | 100.0% | 92.9% | 100.0% | 11.3% |
| moderate | 8 | 78.5% | 100.0% | 97.8% | 99.2% | 8.7% |
| simple | 7 | 81.3% | 100.0% | 100.0% | 99.5% | 21.6% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| hybrid | 3 | 76.1% | 99.1% | 9.9% | 95.1% |
| csr | 8 | 76.4% | 100.0% | 15.7% | 77.8% |
| ssr | 9 | 79.0% | 99.6% | 7.1% | 97.9% |
| static | 8 | 80.1% | 99.5% | 19.4% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| cyrillic | 1 | 77.9% | 65.4% | 98.2% |
| latin | 25 | 78.5% | 53.0% | 100.0% |
| mixed | 1 | 79.5% | 53.1% | 99.5% |
| cjk | 1 | 81.6% | 58.2% | 99.2% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 51.4% | 100.0% | 44.0% | 73.1% | 26.7% |
| https://www.artstation.com | media | 58.6% | 99.7% | 15.7% | 29.9% | 41.9% |
| https://www.nationalgeographic.com | media | 59.4% | 99.6% | 6.1% | 49.7% | 96.0% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.who.int | government | 71.9% | 97.4% | 16.6% | 65.6% | 58.7% |
| https://www.ebay.com | ecommerce | 75.1% | 98.1% | 8.5% | 41.0% | 95.1% |
| https://doc.rust-lang.org/book/ | docs | 76.1% | 100.0% | 11.1% | 19.5% | 100.0% |
| https://react.dev | docs | 76.1% | 100.0% | 12.1% | 53.0% | 97.8% |
| https://www.canva.com | spa | 76.4% | 100.0% | 6.2% | 56.4% | 82.5% |
| https://ourworldindata.org | data | 77.2% | 99.1% | 9.9% | 30.2% | 91.8% |
| https://lenta.ru | i18n | 77.9% | 98.2% | 4.0% | 65.4% | 87.4% |
| https://earthquake.usgs.gov/earthquakes/map/ | data | 78.3% | 100.0% | 18.4% | 51.7% | 77.8% |
| https://www.worldometers.info | data | 78.4% | 100.0% | 5.1% | 26.3% | 100.0% |
| https://regex101.com | tools | 78.5% | 100.0% | 14.5% | 47.1% | 100.0% |
| https://excalidraw.com | spa | 78.8% | 100.0% | 20.9% | 70.9% | 92.9% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 45 | 93.8% |
| viewgraph | 35 | 72.9% |
| snapshot | 35 | 72.9% |
| screenshot | 43 | 89.6% |
| accuracy | 35 | 72.9% |
| allOk | 28 | 58.3% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 3726 | 20002 | 6011 |
| groundTruth | 25 | 94 | 38 |
| viewgraph | 141 | 720 | 192 |
| accuracy | 109 | 700 | 196 |
| snapshot | 104 | 429 | 187 |
| screenshot | 105 | 310 | 145 |

### Failures

| Category | Count | Examples |
|---|---|---|
| capture-crash | 16 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| nav-timeout | 3 | Navigation timeout of 20000 ms exceeded |
| inject-error | 2 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| bot-blocked | 7 | Likely blocked: cloudflare-title; Likely blocked: captcha-iframe |

### Bot Detection

Blocked: 7 sites (14.6%)

| Signal | Count |
|---|---|
| captcha-iframe | 6 |
| cloudflare-title | 1 |

Blocked URLs: https://validator.w3.org, https://www.aljazeera.net, https://www.bbc.com, https://www.chosun.com, https://www.reddit.com, https://www.target.com, https://www.theverge.com