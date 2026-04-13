# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T10:26:37.163Z
Total sites: 48 | Clean (not blocked/failed): 35 | With accuracy data: 28
Excluded: 13 (bot-blocked: 8, CSP-blocked: 2, nav-failed: 3)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 77.4% | 78.5% | 58.6% | 87.8% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 96.6% | 100.0% | 87.5% | 100.0% |
| interactiveRecall | 20% | 87.1% | 97.8% | 26.7% | 100.0% |
| selectorAccuracy | 20% | 98.8% | 99.7% | 94.9% | 100.0% |
| bboxAccuracy | 15% | 19.4% | 12.6% | 4.4% | 53.5% |
| textAccuracy | 10% | 51.6% | 53.1% | 21.6% | 88.4% |
| semanticRecall | 10% | 79.2% | 88.2% | 0.0% | 100.0% |
| elementRecall | 5% | 98.8% | 99.7% | 94.9% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 28
Recall: median 98.1%, mean 86.6%, range 0.3%-100.0%
VG nodes: median 600, p95 1991
GT visible: median 771, p95 1997

## Bounding Box Accuracy

Within 5px: median 12.6%, mean 19.4%
Within 10px: median 12.6%, mean 19.5%
Mean deviation: median 1633.3px, p95 4539.3px

## Text Accuracy

Exact match: median 35.2%, mean 38.9%
Match (exact+prefix): median 53.1%, mean 51.6%
Elements with empty text in VG: 2032

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1231 | 3086 | 47708 |
| visibleElements | 697 | 1997 | 29171 |
| hiddenElements | 331 | 1854 | 18537 |
| interactiveElements | 198 | 766 | 8957 |
| semanticElements | 9 | 51 | 653 |
| elementsWithTestid | 0 | 79 | 1503 |
| elementsWithRole | 23 | 239 | 2153 |
| elementsWithAriaLabel | 18 | 83 | 1192 |
| elementsWithText | 580 | 2562 | 27460 |
| shadowRoots | 0 | 48 | 168 |

Visibility ratio (visible/total): median 69.0%, mean 67.5%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| government | 2 | 71.9% | 100.0% | 58.7% | 97.4% | 12.5% | 30.1% | 67.9% |
| ecommerce | 2 | 75.1% | 100.0% | 95.2% | 97.0% | 4.4% | 40.5% | 62.0% |
| docs | 2 | 76.1% | 100.0% | 97.8% | 100.0% | 11.1% | 19.5% | 44.4% |
| spa | 3 | 76.4% | 100.0% | 82.5% | 100.0% | 20.9% | 70.9% | 75.0% |
| data | 4 | 77.2% | 100.0% | 77.8% | 100.0% | 9.9% | 30.2% | 95.7% |
| i18n | 3 | 77.8% | 100.0% | 97.8% | 98.2% | 7.2% | 59.6% | 92.9% |
| tools | 2 | 78.5% | 100.0% | 97.9% | 99.9% | 14.2% | 47.0% | 66.7% |
| media | 3 | 79.5% | 100.0% | 96.2% | 99.7% | 12.6% | 53.1% | 75.0% |
| social | 1 | 79.8% | 100.0% | 98.5% | 99.9% | 7.1% | 58.5% | 81.8% |
| news | 2 | 80.1% | 100.0% | 100.0% | 96.1% | 19.4% | 31.7% | 100.0% |
| webcomponents | 1 | 81.5% | 100.0% | 96.9% | 95.7% | 27.4% | 41.3% | 100.0% |
| static | 3 | 83.9% | 100.0% | 100.0% | 97.7% | 29.4% | 59.4% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 12 | 77.2% | 100.0% | 91.8% | 100.0% | 9.9% |
| moderate | 9 | 79.2% | 100.0% | 97.8% | 99.2% | 12.1% |
| simple | 7 | 81.3% | 100.0% | 100.0% | 99.5% | 21.6% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| hybrid | 4 | 76.1% | 98.3% | 9.9% | 95.2% |
| csr | 8 | 76.4% | 100.0% | 15.7% | 77.8% |
| ssr | 8 | 79.2% | 98.2% | 7.2% | 97.9% |
| static | 8 | 80.1% | 99.5% | 19.4% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| cyrillic | 1 | 77.8% | 65.2% | 98.2% |
| latin | 25 | 78.5% | 53.0% | 99.9% |
| mixed | 1 | 79.5% | 53.1% | 99.5% |
| cjk | 1 | 81.9% | 59.6% | 99.2% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 51.3% | 100.0% | 43.5% | 73.4% | 26.7% |
| https://www.artstation.com | media | 58.6% | 99.7% | 15.7% | 29.9% | 41.9% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.who.int | government | 71.9% | 97.4% | 16.6% | 65.6% | 58.7% |
| https://www.ebay.com | ecommerce | 75.1% | 98.3% | 8.1% | 40.5% | 95.2% |
| https://doc.rust-lang.org/book/ | docs | 76.1% | 100.0% | 11.1% | 19.5% | 100.0% |
| https://react.dev | docs | 76.1% | 100.0% | 12.1% | 53.0% | 97.8% |
| https://www.canva.com | spa | 76.4% | 100.0% | 6.2% | 56.4% | 82.5% |
| https://ourworldindata.org | data | 77.2% | 99.1% | 9.9% | 30.2% | 91.8% |
| https://www.lemonde.fr | i18n | 77.3% | 94.9% | 8.3% | 34.9% | 97.8% |
| https://lenta.ru | i18n | 77.8% | 98.2% | 4.0% | 65.2% | 86.9% |
| https://earthquake.usgs.gov/earthquakes/map/ | data | 78.3% | 100.0% | 18.3% | 51.7% | 77.8% |
| https://www.worldometers.info | data | 78.4% | 100.0% | 5.1% | 26.3% | 100.0% |
| https://regex101.com | tools | 78.5% | 100.0% | 14.3% | 47.0% | 100.0% |
| https://excalidraw.com | spa | 78.8% | 100.0% | 20.9% | 70.9% | 92.9% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 45 | 93.8% |
| viewgraph | 36 | 75.0% |
| snapshot | 36 | 75.0% |
| screenshot | 43 | 89.6% |
| accuracy | 36 | 75.0% |
| allOk | 28 | 58.3% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 4208 | 20000 | 5871 |
| groundTruth | 23 | 62 | 28 |
| viewgraph | 132 | 471 | 160 |
| accuracy | 95 | 589 | 171 |
| snapshot | 101 | 352 | 109 |
| screenshot | 105 | 254 | 131 |

### Failures

| Category | Count | Examples |
|---|---|---|
| capture-crash | 14 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| nav-timeout | 3 | Navigation timeout of 20000 ms exceeded |
| inject-error | 2 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| bot-blocked | 8 | Likely blocked: cloudflare-title; Likely blocked: captcha-iframe |

### Bot Detection

Blocked: 8 sites (16.7%)

| Signal | Count |
|---|---|
| captcha-iframe | 7 |
| cloudflare-title | 1 |

Blocked URLs: https://validator.w3.org, https://www.aljazeera.net, https://www.bbc.com, https://www.chosun.com, https://www.nationalgeographic.com, https://www.reddit.com, https://www.target.com, https://www.theverge.com