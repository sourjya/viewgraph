# Project Metrics

Current stats as of v0.7.3 (April 2026).

## Code

| Metric | Count |
|---|---|
| MCP tools | 41 |
| Prompt templates | 12 |
| Enrichment collectors | 21 |
| Extension tests | 1,259 |
| Server unit tests | 536 |
| MCP smoke tests | 2 |
| Total tests | 1,795 |
| ESLint warnings | 0 |

## Capture Format

| Metric | Value |
|---|---|
| Format version | v2.3.0 |
| Median capture size | 665 KB (before optimization) |
| Style dedup rate | 50% (measured across 175 captures) |
| Default value waste | 41.8% of style values are browser defaults |
| Selector stability | 97.2% (testId: 100%, CSS: 96.8%) |
| A11y audit FP rate | 35% before name computation, <10% after |
| Provenance non-measured | 28.3% of fields are derived or inferred |

## Experiments

| Experiment | Dataset | Result |
|---|---|---|
| Provenance distribution | 175 captures, 1.7M fields | 28.3% non-measured - PASS |
| A11y false positive rate | 82 captures with axe-core | 35% FP rate - PASS |
| Style deduplication | 175 captures | 50% median dedup - PASS |
| Default value waste | 175 captures, 705K values | 41.8% defaults - PASS |
| Enrichment emptiness | 175 captures, 10 sections | 2/10 opt-in candidates - FAIL |
| Selector stability | 83 same-URL pairs | 97.2% stable - PASS |

## Extension

| Metric | Value |
|---|---|
| Content script bundle | 856 KB |
| Background script | 20 KB |
| Total extension size | 968 KB |
| Supported browsers | Chrome 116+, Firefox 115+ |
| Capture accuracy (composite) | 92.1% median across 48 sites |

## Security

| Metric | Count |
|---|---|
| Security reviews (SRR) | 7 |
| Maintainability reviews (MRR) | 5 |
| Threats modeled (STRIDE) | 9 |
| Mitigations implemented | 9 |
