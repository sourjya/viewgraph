# Project Roadmap

## Current Version

v0.6.0

## Status Summary

**Shipped:** 39 MCP tools, 11 prompt templates, 17 enrichment collectors, 1788 tests (1244 extension + 544 server)

**All major features complete.** Remaining work is optimization experiments, polish, and launch prep.

## Active Ideas (Experiment-First)

These require experiments to validate before implementation. Each has a detailed idea doc with design options, token impact analysis, and experiment designs.

| Idea | Category | Gate Experiment | Result | Idea Doc |
|------|----------|-----------------|--------|----------|
| Provenance Metadata | Capture Format | >15% non-measured fields | **PASS (28.3%)** | [provenance-metadata.md](../ideas/provenance-metadata.md) |
| CDP Accessibility Tree | Capture Accuracy | >20% false positive rate | **PASS (35%)** | [cdp-accessibility-tree.md](../ideas/cdp-accessibility-tree.md) |
| JSON Patch Diffs | Token Efficiency | Agent comprehension >90% | Pending | [json-patch-incremental-diffs.md](../ideas/json-patch-incremental-diffs.md) |
| Style Dedup Table | Token Efficiency | >30% dedup rate | **PASS (50%)** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |
| Default Value Omission | Token Efficiency | >25% default rate | **PASS (41.8%)** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |
| Enrichment Opt-In | Token Efficiency | ≥3 sections >70% empty | **FAIL (2/10)** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |
| Selector Stability | Capture Quality | >90% stability | **PASS (97.2%)** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |

## Remaining Polish

| Item | Effort | Description |
|------|--------|-------------|
| Extension onboarding | Low | Welcome page on install with feature walkthrough |
| Performance optimization | Medium | Lazy-load heavy modules, optimize DOM traversal for large pages |
| Extensible init (M8.1) | Done | AGENT_SETUP registry pattern in viewgraph-init.js |
| Capture history (M9.1) | Done | get_capture_history MCP tool (#39) |
| Smart alerts (F10) | Done | Auto-audit results wired to collapsed strip badge |
| Transport auto-detection (F16 P2) | Done | 3-way: native host, stdio pipe, TTY |

## Other Ideas (Backlog)

| Idea | Status | Doc |
|------|--------|-----|
| Panic Capture | Evaluate | [panic-capture.md](../ideas/panic-capture.md) |
| Rolling Archive | Done | [rolling-archive.md](../ideas/rolling-archive.md) |
| Live Annotation Status | Evaluate | [live-annotation-status.md](../ideas/live-annotation-status.md) |
| Extended Enrichment | Evaluate | [extended-capture-enrichment.md](../ideas/extended-capture-enrichment.md) |
| Themed Tooltip | Evaluate | [themed-tooltip-component.md](../ideas/themed-tooltip-component.md) |
| Chrome DevTools MCP Testing | Active | [chrome-devtools-mcp-testing.md](../ideas/chrome-devtools-mcp-testing.md) |

## Launch Prep (M18)

| Task | Description |
|------|-------------|
| Documentation site | GitBook IA, MCP tool reference, workflow guides |
| Demo video | 3-5 min walkthrough: install, annotate, fix |
| README polish | Current feature set, getting started, badges |
| Launch narrative | Product Hunt / HN story arc |

## Security Reviews

| SRR | Date | Scope | Report |
|-----|------|-------|--------|
| SRR-007 | 2026-04-27 | Tier 3 sprint-end | [Report](../security/SRR-007-2026-04-27-T3.md) |
| SRR-006 | 2026-04-24 | Tier 3 sprint-end | [Report](../security/SRR-006-2026-04-24-T3.md) |

## Maintainability Reviews

| MRR | Date | Report |
|-----|------|--------|
| MRR-005 | 2026-04-27 | [Report](../reviews/MRR-005-2026-04-27.md) |
