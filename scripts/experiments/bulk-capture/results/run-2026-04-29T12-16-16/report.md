# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-29T12:17:41.928Z
Total sites: 50 | Clean (not blocked/failed): 37 | With accuracy data: 30
Excluded: 13 (bot-blocked: 8, CSP-blocked: 1, nav-failed: 4)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 91.0% | 92.8% | 71.2% | 98.8% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 95.9% | 100.0% | 83.3% | 100.0% |
| interactiveRecall | 20% | 93.5% | 99.3% | 48.5% | 100.0% |
| selectorAccuracy | 20% | 99.4% | 99.9% | 96.8% | 100.0% |
| bboxAccuracy | 15% | 100.0% | 100.0% | 100.0% | 100.0% |
| textAccuracy | 10% | 53.2% | 52.7% | 19.0% | 87.8% |
| semanticRecall | 10% | 79.4% | 83.3% | 33.3% | 100.0% |
| elementRecall | 5% | 99.4% | 99.9% | 96.8% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 30
Recall: median 79.1%, mean 75.8%, range 13.5%-100.0%
VG nodes: median 689, p95 1609
GT visible: median 873, p95 4019

## Bounding Box Accuracy

Within 5px: median 100.0%, mean 100.0%
Within 10px: median 100.0%, mean 100.0%
Mean deviation: median 0px, p95 0px

## Text Accuracy

Exact match: median 38.3%, mean 41.6%
Match (exact+prefix): median 52.7%, mean 53.2%
Elements with empty text in VG: 744

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1250 | 4933 | 64969 |
| visibleElements | 792 | 4019 | 37589 |
| hiddenElements | 414 | 3232 | 27380 |
| interactiveElements | 238 | 952 | 11441 |
| semanticElements | 16 | 406 | 1656 |
| elementsWithTestid | 0 | 180 | 2028 |
| elementsWithRole | 13 | 133 | 1091 |
| elementsWithAriaLabel | 18 | 168 | 1470 |
| elementsWithText | 677 | 3764 | 37638 |
| shadowRoots | 0 | 19 | 51 |

Visibility ratio (visible/total): median 62.9%, mean 56.6%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| i18n | 4 | 87.8% | 100.0% | 98.4% | 98.8% | 100.0% | 35.8% | 79.6% |
| spa | 1 | 88.9% | 100.0% | 71.2% | 99.8% | 100.0% | 56.1% | 90.5% |
| news | 4 | 89.5% | 94.4% | 96.7% | 99.6% | 100.0% | 32.7% | 58.6% |
| data | 4 | 90.3% | 100.0% | 91.8% | 99.0% | 100.0% | 41.0% | 81.8% |
| government | 3 | 92.1% | 100.0% | 100.0% | 100.0% | 100.0% | 43.0% | 85.7% |
| ecommerce | 3 | 92.3% | 100.0% | 97.4% | 100.0% | 100.0% | 53.2% | 75.0% |
| docs | 4 | 92.6% | 100.0% | 99.3% | 100.0% | 100.0% | 31.2% | 80.0% |
| media | 2 | 93.6% | 100.0% | 96.2% | 99.3% | 100.0% | 56.8% | 70.0% |
| tools | 3 | 95.3% | 100.0% | 100.0% | 100.0% | 100.0% | 74.8% | 94.7% |
| social | 2 | 96.5% | 100.0% | 100.0% | 99.7% | 100.0% | 71.8% | 93.8% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 10 | 90.3% | 100.0% | 98.4% | 99.7% | 100.0% |
| moderate | 19 | 92.9% | 100.0% | 99.3% | 99.9% | 100.0% |
| simple | 1 | 95.3% | 100.0% | 100.0% | 99.8% | 100.0% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| ssr | 16 | 92.1% | 99.7% | 100.0% | 98.4% |
| hybrid | 10 | 92.6% | 99.9% | 100.0% | 99.2% |
| static | 3 | 93.1% | 99.4% | 100.0% | 99.3% |
| csr | 1 | 94.3% | 100.0% | 100.0% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| latin | 28 | 92.6% | 51.6% | 99.9% |
| mixed | 1 | 93.6% | 56.8% | 99.3% |
| cjk | 1 | 95.3% | 73.0% | 98.8% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.theguardian.com | news | 68.3% | 98.3% | 100.0% | 32.7% | 30.3% |
| https://www.elpais.com | i18n | 71.2% | 99.7% | 100.0% | 19.0% | 98.4% |
| https://www.weather.gov | data | 80.2% | 96.8% | 100.0% | 79.3% | 48.5% |
| https://www.lemonde.fr | i18n | 87.8% | 94.3% | 100.0% | 35.8% | 96.3% |
| https://react.dev | docs | 88.1% | 100.0% | 100.0% | 51.6% | 97.8% |
| https://www.ebay.com | ecommerce | 88.7% | 97.7% | 100.0% | 41.5% | 94.7% |
| https://vercel.com | spa | 88.9% | 99.8% | 100.0% | 56.1% | 71.2% |
| https://www.nature.com | news | 89.5% | 99.9% | 100.0% | 18.9% | 100.0% |
| https://www.cdc.gov | government | 90.1% | 100.0% | 100.0% | 43.0% | 95.7% |
| https://ourworldindata.org | data | 90.3% | 99.0% | 100.0% | 30.9% | 91.8% |
| https://www.bbc.com | news | 90.8% | 99.9% | 100.0% | 61.1% | 99.5% |
| https://www.usa.gov | government | 92.1% | 100.0% | 100.0% | 27.7% | 100.0% |
| https://www.bookshop.org | ecommerce | 92.3% | 100.0% | 100.0% | 53.2% | 97.4% |
| https://tailwindcss.com/docs/installation | docs | 92.6% | 100.0% | 100.0% | 25.6% | 100.0% |
| https://nodejs.org/en/docs | docs | 92.8% | 99.4% | 100.0% | 31.2% | 99.3% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 46 | 92.0% |
| viewgraph | 37 | 74.0% |
| snapshot | 37 | 74.0% |
| screenshot | 45 | 90.0% |
| accuracy | 37 | 74.0% |
| allOk | 29 | 58.0% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 5233 | 20001 | 7103 |
| groundTruth | 43 | 235 | 133 |
| viewgraph | 198 | 470 | 236 |
| accuracy | 119 | 565 | 147 |
| snapshot | 122 | 448 | 225 |
| screenshot | 131 | 426 | 195 |

### Failures

| Category | Count | Examples |
|---|---|---|
| nav-timeout | 4 | Navigation timeout of 20000 ms exceeded |
| capture-crash | 16 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| bot-blocked | 8 | Likely blocked: captcha-iframe; Likely blocked: cloudflare-title |
| inject-error | 1 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| capture-empty | 1 | 0 nodes captured |

### Bot Detection

Blocked: 8 sites (16.0%)

| Signal | Count |
|---|---|
| captcha-iframe | 7 |
| cloudflare-title | 1 |

Blocked URLs: https://netlify.com, https://techcrunch.com, https://www.etsy.com, https://www.nationalgeographic.com, https://www.npr.org, https://www.producthunt.com, https://www.rei.com, https://www.reuters.com