# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T05:40:41.416Z
Total sites: 50 | With accuracy data: 39

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 79.4% | 79.2% | 59.6% | 100.0% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 94.7% | 100.0% | 0.0% | 100.0% |
| interactiveRecall | 20% | 93.9% | 99.2% | 44.6% | 100.0% |
| selectorAccuracy | 20% | 99.7% | 99.9% | 98.2% | 100.0% |
| bboxAccuracy | 15% | 19.6% | 12.1% | 4.2% | 100.0% |
| textAccuracy | 10% | 52.0% | 51.5% | 16.4% | 100.0% |
| semanticRecall | 10% | 86.7% | 93.3% | 33.3% | 100.0% |
| elementRecall | 5% | 99.7% | 99.9% | 98.2% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 39
Recall: median 98.8%, mean 92.1%, range 21.5%-100.0%
VG nodes: median 887, p95 2400
GT visible: median 911, p95 3826

## Bounding Box Accuracy

Within 5px: median 12.1%, mean 19.6%
Within 10px: median 12.1%, mean 19.6%
Mean deviation: median 2310.6px, p95 10537.3px

## Text Accuracy

Exact match: median 34.6%, mean 38.9%
Match (exact+prefix): median 51.5%, mean 52.0%
Elements with empty text in VG: 3461

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1563 | 5552 | 94767 |
| visibleElements | 865 | 2478 | 48409 |
| hiddenElements | 456 | 3332 | 46358 |
| interactiveElements | 240 | 1213 | 17203 |
| semanticElements | 16 | 185 | 1940 |
| elementsWithTestid | 0 | 107 | 2030 |
| elementsWithRole | 13 | 133 | 2095 |
| elementsWithAriaLabel | 18 | 176 | 2316 |
| elementsWithText | 777 | 3704 | 55578 |
| shadowRoots | 0 | 1 | 50 |

Visibility ratio (visible/total): median 60.0%, mean 58.9%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| spa | 2 | 75.1% | 100.0% | 71.9% | 99.8% | 9.6% | 52.7% | 90.5% |
| news | 8 | 77.2% | 100.0% | 99.2% | 99.7% | 7.9% | 40.5% | 80.0% |
| data | 4 | 77.2% | 100.0% | 91.8% | 99.1% | 15.2% | 41.4% | 95.7% |
| i18n | 4 | 78.7% | 100.0% | 97.9% | 99.7% | 6.5% | 30.1% | 93.7% |
| docs | 4 | 78.9% | 100.0% | 99.3% | 100.0% | 9.2% | 32.1% | 100.0% |
| government | 3 | 79.2% | 100.0% | 100.0% | 100.0% | 12.5% | 38.5% | 93.3% |
| media | 3 | 79.6% | 100.0% | 96.2% | 99.6% | 8.7% | 53.3% | 88.2% |
| ecommerce | 5 | 79.8% | 100.0% | 97.0% | 100.0% | 13.0% | 43.9% | 93.8% |
| social | 3 | 83.8% | 100.0% | 100.0% | 99.9% | 18.2% | 67.8% | 93.8% |
| tools | 3 | 83.8% | 100.0% | 97.9% | 100.0% | 28.4% | 75.3% | 90.9% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 15 | 78.7% | 100.0% | 99.5% | 99.8% | 9.9% |
| moderate | 23 | 79.2% | 100.0% | 99.2% | 99.9% | 12.5% |
| simple | 1 | 81.2% | 100.0% | 97.9% | 99.9% | 14.2% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| ssr | 20 | 78.7% | 99.7% | 11.2% | 97.9% |
| hybrid | 14 | 79.4% | 100.0% | 9.9% | 99.9% |
| static | 3 | 79.6% | 99.5% | 8.7% | 99.3% |
| csr | 2 | 79.9% | 100.0% | 12.7% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| latin | 37 | 79.2% | 51.4% | 99.9% |
| mixed | 1 | 79.6% | 53.3% | 99.5% |
| cjk | 1 | 81.5% | 57.6% | 99.3% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.elpais.com | i18n | 55.9% | 99.7% | 6.6% | 14.1% | 95.9% |
| https://www.nationalgeographic.com | media | 59.6% | 99.6% | 5.4% | 51.4% | 95.5% |
| https://www.theguardian.com | news | 60.9% | 98.8% | 18.3% | 43.1% | 30.6% |
| https://www.weather.gov | data | 69.0% | 97.6% | 28.9% | 80.2% | 44.6% |
| https://apnews.com | news | 73.7% | 99.7% | 4.2% | 40.5% | 99.2% |
| https://vercel.com | spa | 75.1% | 99.8% | 9.6% | 52.7% | 71.9% |
| https://www.ebay.com | ecommerce | 75.5% | 98.2% | 8.7% | 43.9% | 95.2% |
| https://react.dev | docs | 76.0% | 100.0% | 12.1% | 51.5% | 97.8% |
| https://www.bbc.com | news | 77.0% | 99.8% | 5.4% | 54.7% | 99.5% |
| https://ourworldindata.org | data | 77.2% | 99.1% | 9.9% | 29.8% | 91.8% |
| https://www.npr.org | news | 77.2% | 99.7% | 13.0% | 33.9% | 88.6% |
| https://www.rei.com | ecommerce | 77.3% | 99.8% | 5.8% | 38.6% | 91.7% |
| https://www.nature.com | news | 77.8% | 99.9% | 7.9% | 16.4% | 100.0% |
| https://techcrunch.com | news | 78.6% | 99.3% | 6.4% | 37.7% | 100.0% |
| https://www.lemonde.fr | i18n | 78.7% | 100.0% | 11.2% | 30.1% | 97.9% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 48 | 96.0% |
| viewgraph | 39 | 78.0% |
| snapshot | 39 | 78.0% |
| screenshot | 46 | 92.0% |
| accuracy | 39 | 78.0% |
| allOk | 29 | 58.0% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 3825 | 17025 | 5357 |
| groundTruth | 20 | 105 | 36 |
| viewgraph | 111 | 629 | 156 |
| accuracy | 103 | 935 | 175 |
| snapshot | 104 | 389 | 138 |
| screenshot | 119 | 236 | 139 |

### Failures

| Category | Count | Examples |
|---|---|---|
| capture-crash | 14 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| bot-blocked | 10 | Likely blocked: captcha-iframe; Likely blocked: cloudflare-title |
| inject-error | 2 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| nav-timeout | 2 | Navigation timeout of 20000 ms exceeded |

### Bot Detection

Blocked: 10 sites (20.0%)

| Signal | Count |
|---|---|
| captcha-iframe | 9 |
| cloudflare-title | 1 |

Blocked URLs: https://netlify.com, https://techcrunch.com, https://www.bbc.com, https://www.etsy.com, https://www.nationalgeographic.com, https://www.npr.org, https://www.producthunt.com, https://www.rei.com, https://www.reuters.com, https://www.timeanddate.com