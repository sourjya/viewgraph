# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T05:35:53.673Z
Total sites: 48 | With accuracy data: 37

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 76.4% | 78.4% | 52.9% | 88.4% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 93.0% | 100.0% | 16.3% | 100.0% |
| interactiveRecall | 20% | 88.4% | 97.9% | 26.7% | 100.0% |
| selectorAccuracy | 20% | 98.8% | 99.7% | 94.6% | 100.0% |
| bboxAccuracy | 15% | 17.3% | 11.2% | 2.8% | 57.1% |
| textAccuracy | 10% | 49.5% | 53.3% | 18.0% | 74.4% |
| semanticRecall | 10% | 78.3% | 87.5% | 0.0% | 100.0% |
| elementRecall | 5% | 98.8% | 99.7% | 94.6% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 37
Recall: median 98.1%, mean 87.8%, range 0.3%-100.0%
VG nodes: median 857, p95 3370
GT visible: median 902, p95 3415

## Bounding Box Accuracy

Within 5px: median 11.2%, mean 17.3%
Within 10px: median 11.2%, mean 17.3%
Mean deviation: median 2009.2px, p95 7199.8px

## Text Accuracy

Exact match: median 34.8%, mean 36.9%
Match (exact+prefix): median 53.3%, mean 49.5%
Elements with empty text in VG: 4595

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1557 | 4505 | 82498 |
| visibleElements | 825 | 2534 | 49553 |
| hiddenElements | 528 | 1971 | 32945 |
| interactiveElements | 229 | 766 | 13735 |
| semanticElements | 13 | 65 | 1059 |
| elementsWithTestid | 0 | 177 | 3963 |
| elementsWithRole | 30 | 196 | 2722 |
| elementsWithAriaLabel | 29 | 128 | 2403 |
| elementsWithText | 677 | 2557 | 43680 |
| shadowRoots | 0 | 74 | 412 |

Visibility ratio (visible/total): median 66.6%, mean 64.8%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| social | 2 | 52.9% | 44.4% | 54.7% | 84.4% | 7.0% | 56.8% | 37.5% |
| media | 4 | 59.6% | 100.0% | 95.5% | 99.6% | 8.7% | 51.4% | 75.0% |
| government | 2 | 71.9% | 100.0% | 58.7% | 97.4% | 12.5% | 29.8% | 67.9% |
| docs | 2 | 75.6% | 100.0% | 97.8% | 100.0% | 11.1% | 14.5% | 44.4% |
| ecommerce | 3 | 75.6% | 100.0% | 98.4% | 98.2% | 8.4% | 43.7% | 75.0% |
| spa | 3 | 76.4% | 100.0% | 82.5% | 100.0% | 20.9% | 70.4% | 75.0% |
| news | 4 | 77.0% | 100.0% | 100.0% | 98.7% | 5.4% | 32.1% | 70.0% |
| data | 4 | 77.2% | 100.0% | 77.8% | 100.0% | 9.9% | 29.8% | 95.7% |
| i18n | 7 | 78.8% | 100.0% | 97.9% | 99.5% | 6.5% | 55.5% | 90.0% |
| tools | 3 | 81.2% | 100.0% | 97.9% | 100.0% | 14.2% | 53.9% | 90.9% |
| static | 3 | 82.8% | 100.0% | 100.0% | 97.7% | 29.5% | 47.7% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 21 | 77.0% | 100.0% | 95.5% | 99.7% | 8.7% |
| moderate | 8 | 77.9% | 100.0% | 96.2% | 99.3% | 8.7% |
| simple | 8 | 81.2% | 100.0% | 100.0% | 99.5% | 21.6% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| csr | 10 | 75.6% | 100.0% | 15.7% | 77.8% |
| hybrid | 5 | 76.0% | 99.1% | 8.7% | 97.8% |
| ssr | 13 | 78.8% | 99.6% | 6.5% | 97.9% |
| static | 9 | 80.3% | 99.5% | 21.6% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| cjk | 2 | 76.2% | 29.8% | 99.3% |
| latin | 31 | 77.6% | 51.9% | 99.9% |
| cyrillic | 1 | 77.9% | 65.1% | 98.2% |
| arabic | 1 | 78.8% | 41.4% | 99.6% |
| indic | 1 | 79.2% | 67.8% | 99.5% |
| mixed | 1 | 79.6% | 53.3% | 99.5% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 50.9% | 100.0% | 43.8% | 68.2% | 26.7% |
| https://www.reddit.com | social | 52.9% | 84.4% | 17.0% | 56.8% | 54.7% |
| https://www.artstation.com | media | 58.6% | 99.7% | 15.7% | 29.9% | 41.9% |
| https://www.nationalgeographic.com | media | 59.6% | 99.6% | 5.4% | 51.4% | 95.5% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.who.int | government | 71.9% | 97.4% | 16.6% | 65.6% | 58.7% |
| https://www.theverge.com | news | 73.0% | 98.7% | 5.0% | 25.9% | 100.0% |
| https://www.ebay.com | ecommerce | 75.5% | 98.2% | 8.7% | 43.7% | 95.2% |
| https://doc.rust-lang.org/book/ | docs | 75.6% | 100.0% | 11.1% | 14.5% | 100.0% |
| https://www.target.com | ecommerce | 75.6% | 98.9% | 8.4% | 24.2% | 98.4% |
| https://react.dev | docs | 76.0% | 100.0% | 12.1% | 51.5% | 97.8% |
| https://www.chosun.com | i18n | 76.2% | 99.7% | 2.1% | 29.8% | 99.2% |
| https://www.canva.com | spa | 76.4% | 100.0% | 6.2% | 56.1% | 82.5% |
| https://www.bbc.com | news | 77.0% | 99.8% | 5.4% | 54.7% | 99.5% |
| https://ourworldindata.org | data | 77.2% | 99.1% | 9.9% | 29.8% | 91.8% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 47 | 97.9% |
| viewgraph | 37 | 77.1% |
| snapshot | 37 | 77.1% |
| screenshot | 45 | 93.8% |
| accuracy | 37 | 77.1% |
| allOk | 27 | 56.3% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 3772 | 15141 | 5771 |
| groundTruth | 27 | 72 | 30 |
| viewgraph | 96 | 371 | 150 |
| accuracy | 98 | 932 | 180 |
| snapshot | 100 | 345 | 114 |
| screenshot | 104 | 275 | 133 |

### Failures

| Category | Count | Examples |
|---|---|---|
| capture-crash | 16 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| nav-timeout | 1 | Navigation timeout of 20000 ms exceeded |
| inject-error | 2 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| bot-blocked | 10 | Likely blocked: cloudflare-title; Likely blocked: captcha-iframe |

### Bot Detection

Blocked: 10 sites (20.8%)

| Signal | Count |
|---|---|
| captcha-iframe | 9 |
| cloudflare-title | 1 |

Blocked URLs: https://validator.w3.org, https://www.aljazeera.net, https://www.bbc.com, https://www.chosun.com, https://www.globo.com, https://www.nationalgeographic.com, https://www.ndtv.com, https://www.reddit.com, https://www.target.com, https://www.theverge.com