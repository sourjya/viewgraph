# ViewGraph Bulk Capture - Accuracy Report

Generated: 2026-04-29T12:16:01.439Z
Total sites: 46 | Clean (not blocked/failed): 28 | With accuracy data: 22
Excluded: 18 (bot-blocked: 11, CSP-blocked: 3, nav-failed: 4)

## Overall Accuracy Score

| Metric | Mean | Median | p5 (worst) | p95 (best) |
|---|---|---|---|---|
| **Composite** | 89.0% | 90.9% | 70.0% | 97.1% |

## Accuracy by Dimension

| Dimension | Weight | Mean | Median | p5 | p95 |
|---|---|---|---|---|---|
| testidRecall | 20% | 95.6% | 100.0% | 87.5% | 100.0% |
| interactiveRecall | 20% | 82.2% | 92.9% | 0.0% | 100.0% |
| selectorAccuracy | 20% | 98.7% | 100.0% | 95.6% | 100.0% |
| bboxAccuracy | 15% | 100.0% | 100.0% | 100.0% | 100.0% |
| textAccuracy | 10% | 60.0% | 51.9% | 30.9% | 100.0% |
| semanticRecall | 10% | 78.1% | 83.3% | 11.1% | 100.0% |
| elementRecall | 5% | 98.7% | 100.0% | 95.6% | 100.0% |

## Element Recall (VG captured / ground-truth visible)

Sites: 22
Recall: median 78.2%, mean 67.1%, range 0.2%-100.0%
VG nodes: median 445, p95 1390
GT visible: median 758, p95 1763

## Bounding Box Accuracy

Within 5px: median 100.0%, mean 100.0%
Within 10px: median 100.0%, mean 100.0%
Mean deviation: median 0px, p95 0px

## Text Accuracy

Exact match: median 42.3%, mean 51.3%
Match (exact+prefix): median 51.9%, mean 60.0%
Elements with empty text in VG: 520

## Ground Truth DOM Summary

| Metric | Median | p95 | Total |
|---|---|---|---|
| totalElements | 1315 | 2802 | 40989 |
| visibleElements | 758 | 1763 | 26041 |
| hiddenElements | 441 | 1280 | 14948 |
| interactiveElements | 140 | 446 | 5271 |
| semanticElements | 10 | 53 | 822 |
| elementsWithTestid | 0 | 520 | 1629 |
| elementsWithRole | 30 | 133 | 1097 |
| elementsWithAriaLabel | 16 | 121 | 912 |
| elementsWithText | 553 | 1613 | 21181 |
| shadowRoots | 0 | 48 | 148 |

Visibility ratio (visible/total): median 67.9%, mean 65.6%

## Accuracy by Category

| Category | Sites | Overall | Testid | Interactive | Selector | Bbox | Text | Semantic |
|---|---|---|---|---|---|---|---|---|
| social | 1 | 80.0% | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| spa | 8 | 89.9% | 100.0% | 90.9% | 100.0% | 100.0% | 56.1% | 75.0% |
| data | 5 | 90.3% | 100.0% | 87.4% | 100.0% | 100.0% | 37.1% | 95.7% |
| webcomponents | 1 | 90.4% | 100.0% | 96.9% | 95.6% | 100.0% | 41.7% | 80.0% |
| tools | 1 | 91.9% | 100.0% | 100.0% | 100.0% | 100.0% | 51.9% | 66.7% |
| i18n | 3 | 92.9% | 100.0% | 99.9% | 98.8% | 100.0% | 55.3% | 79.6% |
| media | 1 | 93.2% | 100.0% | 100.0% | 100.0% | 100.0% | 48.6% | 83.3% |
| ecommerce | 2 | 94.3% | 100.0% | 100.0% | 81.8% | 100.0% | 88.9% | 100.0% |

## Accuracy by Complexity

| Complexity | Sites | Overall | Testid | Interactive | Selector | Bbox |
|---|---|---|---|---|---|---|
| moderate | 6 | 90.4% | 100.0% | 96.9% | 98.8% | 100.0% |
| complex | 16 | 90.9% | 100.0% | 91.8% | 100.0% | 100.0% |

## Accuracy by Rendering Type

| Rendering | Sites | Overall | Selector | Bbox | Interactive |
|---|---|---|---|---|---|
| hybrid | 5 | 90.4% | 99.8% | 100.0% | 96.9% |
| csr | 13 | 90.9% | 100.0% | 100.0% | 90.9% |
| static | 1 | 92.3% | 100.0% | 100.0% | 100.0% |
| ssr | 3 | 95.3% | 98.8% | 100.0% | 100.0% |

## Accuracy by Writing System

| Script | Sites | Overall | Text | Selector |
|---|---|---|---|---|
| cyrillic | 1 | 88.8% | 55.3% | 97.7% |
| latin | 20 | 90.9% | 51.9% | 100.0% |
| cjk | 1 | 95.3% | 73.0% | 98.8% |

## Worst Accuracy Sites (investigation targets)

| URL | Category | Overall | Selector | Bbox | Text | Interactive |
|---|---|---|---|---|---|---|
| https://www.flightradar24.com | data | 57.5% | 100.0% | 100.0% | 78.5% | 26.7% |
| https://notion.so | spa | 70.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://www.quora.com | social | 80.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| https://codesandbox.io | spa | 88.0% | 99.3% | 100.0% | 49.4% | 90.9% |
| https://lenta.ru | i18n | 88.8% | 97.7% | 100.0% | 55.3% | 88.0% |
| https://vercel.com | spa | 88.9% | 99.8% | 100.0% | 56.1% | 71.2% |
| https://www.canva.com | spa | 89.9% | 100.0% | 100.0% | 40.3% | 87.9% |
| https://earthquake.usgs.gov/earthquakes/map/ | data | 90.3% | 100.0% | 100.0% | 51.9% | 77.8% |
| https://ourworldindata.org | data | 90.3% | 99.0% | 100.0% | 30.9% | 91.8% |
| https://shoelace.style | webcomponents | 90.4% | 95.6% | 100.0% | 41.7% | 96.9% |
| https://data.worldbank.org | data | 90.9% | 99.1% | 100.0% | 37.1% | 87.4% |
| https://excalidraw.com | spa | 91.4% | 100.0% | 100.0% | 78.7% | 92.9% |
| https://regex101.com | tools | 91.9% | 100.0% | 100.0% | 51.9% | 100.0% |
| https://gitlab.com/explore | spa | 92.3% | 100.0% | 100.0% | 56.4% | 100.0% |
| https://www.worldometers.info | data | 92.3% | 100.0% | 100.0% | 23.2% | 100.0% |

## Operational Metrics

### Success Rates

| Phase | Count | Rate |
|---|---|---|
| navigation | 42 | 91.3% |
| viewgraph | 30 | 65.2% |
| snapshot | 30 | 65.2% |
| screenshot | 38 | 82.6% |
| accuracy | 30 | 65.2% |
| allOk | 21 | 45.7% |

### Timing (ms)

| Phase | p50 | p95 | Mean |
|---|---|---|---|
| navigation | 6597 | 20000 | 7425 |
| groundTruth | 33 | 234 | 49 |
| viewgraph | 90 | 851 | 198 |
| accuracy | 96 | 861 | 259 |
| snapshot | 77 | 431 | 130 |
| screenshot | 135 | 452 | 164 |

### Failures

| Category | Count | Examples |
|---|---|---|
| bot-blocked | 11 | Likely blocked: captcha-iframe; Likely blocked: cloudflare-title |
| capture-crash | 16 | Cannot read properties of undefined (reading 'traverseDOM'); Cannot read properties of undefined (re |
| nav-error | 1 | net::ERR_CONNECTION_CLOSED at https://mastodon.social/explore |
| inject-error | 3 | Failed to set the 'text' property on 'HTMLScriptElement': This document requires 'TrustedScript' ass |
| nav-timeout | 3 | Navigation timeout of 20000 ms exceeded |
| capture-empty | 1 | 0 nodes captured |
| timeout | 1 | Timeout after 20000ms for https://www.wired.com |

### Bot Detection

Blocked: 11 sites (23.9%)

| Signal | Count |
|---|---|
| captcha-iframe | 9 |
| cloudflare-title | 2 |

Blocked URLs: https://caniuse.com, https://medium.com, https://netlify.com, https://trello.com, https://www.flickr.com/explore, https://www.producthunt.com, https://www.reddit.com, https://www.speedtest.net, https://www.target.com, https://www.theverge.com, https://www.virustotal.com