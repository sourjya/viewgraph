# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-12T05:38:40.444Z
Total sites: 50 | With accuracy data: 33

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 79.2% | 79.0% | 68.5% | 91.6% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 96.7% | 100.0% | 87.2% | 100.0% |
| interactiveRecall | 20% | 86.5% | 97.8% | 0.0% | 100.0% |
| selectorAccuracy | 20% | 99.6% | 100.0% | 98.2% | 100.0% |
| bboxAccuracy | 15% | 25.1% | 14.3% | 2.1% | 100.0% |
| textAccuracy | 10% | 53.5% | 51.6% | 24.2% | 100.0% |
| semanticRecall | 10% | 85.4% | 95.7% | 38.9% | 100.0% |
| elementRecall | 5% | 99.6% | 100.0% | 98.2% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 33
Recall: median 97.2%, mean 85.0%, range 0.3%-100.0%
VG nodes: median 637, p95 4626
GT visible: median 734, p95 4832

## Bounding Box Accuracy

Within 5px: median 14.3%, mean 25.1%
Within 10px: median 14.3%, mean 25.2%
Mean deviation: median 1913.4px, p95 10442.6px

## Text Accuracy

Exact match: median 35.6%, mean 43.3%
Match (exact+prefix): median 51.6%, mean 53.5%
Elements with empty text in VG: 2638

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1340 | 4450 | 63276 |
| visibleElements | 734 | 3415 | 41544 |
| hiddenElements | 377 | 1299 | 21732 |
| interactiveElements | 156 | 626 | 9335 |
| semanticElements | 8 | 65 | 1044 |
| elementsWithTestid | 0 | 113 | 1357 |
| elementsWithRole | 21 | 106 | 1371 |
| elementsWithAriaLabel | 16 | 128 | 1484 |
| elementsWithText | 553 | 2886 | 33943 |
| shadowRoots | 0 | 1 | 70 |

Visibility ratio (visible/total): median 68.2%, mean 64.2%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| news | 1 | 73.0% | 100.0% | 100.0% | 98.7% | 5.0% | 25.9% | 50.0% |
| ecommerce | 1 | 75.6% | 100.0% | 98.4% | 98.9% | 8.4% | 24.2% | 75.0% |
| data | 7 | 78.3% | 100.0% | 91.8% | 100.0% | 18.9% | 34.0% | 100.0% |
| tools | 2 | 78.3% | 100.0% | 100.0% | 100.0% | 14.3% | 44.5% | 66.7% |
| spa | 10 | 78.7% | 100.0% | 89.3% | 100.0% | 9.8% | 56.1% | 90.5% |
| i18n | 7 | 79.0% | 100.0% | 98.8% | 99.6% | 4.2% | 51.6% | 87.5% |
| webcomponents | 1 | 81.5% | 100.0% | 96.9% | 95.7% | 27.4% | 40.8% | 100.0% |
| media | 1 | 82.6% | 100.0% | 100.0% | 100.0% | 19.3% | 47.0% | 100.0% |
| social | 3 | 82.8% | 100.0% | 100.0% | 100.0% | 59.1% | 72.7% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| complex | 23 | 78.4% | 100.0% | 96.9% | 100.0% | 10.7% |
| moderate | 10 | 81.8% | 100.0% | 100.0% | 99.9% | 14.3% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| static | 1 | 77.6% | 100.0% | 5.1% | 100.0% |
| csr | 18 | 78.7% | 100.0% | 25.0% | 92.9% |
| ssr | 7 | 79.0% | 99.6% | 5.9% | 98.8% |
| hybrid | 7 | 79.4% | 99.7% | 9.9% | 96.9% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| cjk | 2 | 76.2% | 29.8% | 99.3% |
| arabic | 2 | 77.8% | 41.6% | 99.4% |
| cyrillic | 1 | 77.9% | 65.3% | 98.2% |
| latin | 27 | 79.2% | 50.0% | 100.0% |
| indic | 1 | 80.0% | 51.6% | 99.6% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 50.9% | 100.0% | 43.8% | 68.2% | 26.7% |
| https://trello.com | spa | 68.5% | 99.5% | 9.4% | 29.7% | 73.1% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.theverge.com | news | 73.0% | 98.7% | 5.0% | 25.9% | 100.0% |
| https://vercel.com | spa | 75.1% | 99.8% | 9.6% | 53.1% | 71.9% |
| https://www.target.com | ecommerce | 75.6% | 98.9% | 8.4% | 24.2% | 98.4% |
| https://www.chosun.com | i18n | 76.2% | 99.7% | 2.1% | 29.8% | 99.2% |
| https://www.canva.com | spa | 76.4% | 100.0% | 6.2% | 56.1% | 82.5% |
| https://ourworldindata.org | data | 77.2% | 99.1% | 9.9% | 29.8% | 91.8% |
| https://www.worldometers.info | data | 77.6% | 100.0% | 5.1% | 18.0% | 100.0% |
| https://arabic.cnn.com | i18n | 77.8% | 99.4% | 9.1% | 81.9% | 96.9% |
| https://lenta.ru | i18n | 77.9% | 98.2% | 4.0% | 65.3% | 87.6% |
| https://data.worldbank.org | data | 78.3% | 99.1% | 17.8% | 34.0% | 87.4% |
| https://regex101.com | tools | 78.3% | 100.0% | 14.3% | 44.5% | 100.0% |
| https://earthquake.usgs.gov/earthquakes/map/ | data | 78.4% | 100.0% | 18.9% | 51.9% | 77.8% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 45 | 90.0% |
| viewgraph | 34 | 68.0% |
| snapshot | 34 | 68.0% |
| screenshot | 41 | 82.0% |
| accuracy | 33 | 66.0% |
| allOk | 20 | 40.0% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 4591 | 20505 | 7287 |
| groundTruth | 21 | 71 | 26 |
| viewgraph | 71 | 637 | 146 |
| accuracy | 68 | 1002 | 192 |
| snapshot | 63 | 349 | 98 |
| screenshot | 127 | 280 | 143 |

### Failures

| Category | Count | Examples |
|---|---|---|
| bot-blocked | 14 | Likely blocked: captcha-iframe; Likely blocked: cloudflare-title; Likely blocked: perimeterx |
| capture-crash | 14 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| nav-timeout | 5 | Navigation timeout of 20000 ms exceeded |
| inject-error | 4 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| capture-empty | 2 | 0 nodes captured |
| gt-crash | 1 | Cannot read properties of undefined (reading 'toLowerCase') |

### Bot Detection

Blocked: 14 sites (28.0%)

| Signal | Count |
|---|---|
| captcha-iframe | 11 |
| cloudflare-title | 2 |
| perimeterx | 1 |

Blocked URLs: https://arabic.cnn.com, https://caniuse.com, https://medium.com, https://netlify.com, https://timesofindia.indiatimes.com, https://trello.com, https://www.aljazeera.net, https://www.chosun.com, https://www.flickr.com/explore, https://www.producthunt.com, https://www.speedtest.net, https://www.target.com, https://www.theverge.com, https://www.wayfair.com