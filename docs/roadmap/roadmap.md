# Project Roadmap

## Current Version

v0.9.1

## Status Summary

**Shipped:** 41 MCP tools, 12 prompt templates, 21 enrichment collectors, 1797 tests (1259 extension + 538 server)

**All major features complete.** Current focus: experiment-validated optimizations and cross-tool integration.

## Active Ideas (Experiment-First)

These require experiments to validate before implementation. Each has a detailed idea doc with design options, token impact analysis, and experiment designs.

| Idea | Category | Gate Experiment | Result | Idea Doc |
|------|----------|-----------------|--------|----------|
| Provenance Metadata | Capture Format | >15% non-measured fields | **PASS (28.3%)** | [provenance-metadata.md](../ideas/provenance-metadata.md) |
| CDP Accessibility Tree | Capture Accuracy | >20% false positive rate | **PASS (35%)** | [cdp-accessibility-tree.md](../ideas/cdp-accessibility-tree.md) |
| JSON Patch Diffs | Token Efficiency | Agent comprehension >90% | **SHIPPED v0.7.3** | [json-patch-incremental-diffs.md](../ideas/json-patch-incremental-diffs.md) |
| Style Dedup Table | Token Efficiency | >30% dedup rate | **PASS (50%) → SHIPPED v0.7.0** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |
| Default Value Omission | Token Efficiency | >25% default rate | **PASS (41.8%) → SHIPPED v0.7.0** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |
| Enrichment Opt-In | Token Efficiency | ≥3 sections >70% empty | **FAIL (2/10)** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |
| Selector Stability | Capture Quality | >90% stability | **PASS (97.2%)** | [token-efficiency-experiments.md](../ideas/token-efficiency-experiments.md) |

## Recently Shipped (v0.9.1)

| Feature | Description |
|---------|-------------|
| Style dedup table | Shared style table in captures. 50% dedup rate → ~45% style data reduction |
| Default value omission | Filter browser defaults (visibility:visible, opacity:1, etc.). 41.8% waste eliminated |
| Heuristic name computation | W3C accessible name algorithm. Reduces a11y audit false positives from 35% to <10% |
| verify_fix tool (#40) | Composite smoke test: a11y + layout + console + network + regressions in one call |
| get_capture_history (#39) | Groups captures by URL into timelines with node count deltas |
| TracePulse bridge | Push frontend errors to TP's log collector for cross-stack correlation |
| @vg-verify prompt | Composite verify: verify_fix() + get_errors() for frontend+backend health |
| Async lifecycle guards | 3 critical null-guard fixes in annotation-sidebar.js |
| ESLint zero warnings | 40 warnings eliminated across entire codebase |
| M8.1 extensible init | AGENT_SETUP registry pattern in viewgraph-init.js |
| F10 smart alerts | Auto-audit results wired to collapsed strip badge |
| JSON Patch diffs (#41) | get_capture_diff - RFC 6902 patches, 50-1500x compression for sequential captures |
| Provenance metadata | Hybrid provenance table in captures - field-level source tagging (<2% overhead) |
| Background error watcher | Persistent console interceptor with real-time error notifications |
| Extension onboarding | Welcome page on first install with 3-step setup guide |
| Uninstall CLI | viewgraph-uninstall - guided project removal with data preservation option |
| v3 Action Manifest | Pre-joined flat index of interactive elements with short refs (e1-eN). 80-85% token reduction. |
| v3 Structural fingerprint | Topology hash for cache-hit detection between captures |
| v3 Error-to-node correlation | Console errors and failed requests linked to element refs |
| v3 GitBook marketing page | Token comparison charts, cost analysis ($3 vs $0.10 per task) |

## v3 Format Enhancement Roadmap

Based on [v3 Agentic Enhancements Research](../architecture/viewgraph-v3-agentic-enhancements.md). Goal: 97% token reduction for multi-step agent workflows.

### Phase 1 - v2.4 (High impact, low effort)

| # | Enhancement | Status | Token Impact |
|---|---|---|---|
| 1 | Action Manifest (pre-joined interactive index) | **Shipped v0.8.0** | 80-85% reduction on interactive queries |
| 2 | Stable short refs (@e1-@eN) | **Shipped v0.8.0** | Fewer tokens per tool call |
| 3 | Structural fingerprint in metadata | **Shipped v0.8.0** | Cache-hit detection for unchanged pages |
| 4 | Error-to-node correlation (correlatedRefs) | **Shipped v0.8.0** | Eliminates 200-500 tokens LLM reasoning per error |
| 5 | lastActionTarget in metadata | **Shipped v0.8.0** | Agent knows what it just acted on |
| 6 | Compact enum codec (compactCodec) | **Shipped v0.9.1** | 70-87% on repeated structures |
| 7 | Viewport-first node ordering | **Shipped v0.9.1** | 20-30% faster scan-to-first-match |

### Phase 2 - v3.0 (Medium effort)

| # | Enhancement | Status | Token Impact |
|---|---|---|---|
| 8 | File-backed capture receipts | **Shipped v0.9.0** | ~99.8% on capture transmission |
| 9 | Delta capture mode with changeSignal | **Shipped v0.9.0** | 90-99% on follow-up captures |
| 10 | D2Snap container merging | **Shipped v0.9.0** | 35-40% on nodes/details |
| 11 | TOON compact serialization | **Shipped v0.9.0** | 70-87% on uniform structures |
| 12 | observationDepth parameter | **Shipped v0.9.0** | ~96% at interactive-only depth |

### Phase 3 - v3.1 (Higher effort)

| # | Enhancement | Status | Token Impact |
|---|---|---|---|
| 13 | Set-of-Marks section | **Shipped v0.9.1** | Visual + text ref equivalence |
| 14 | Checkpoint/resume envelope | **Shipped v0.9.1** | Multi-step recovery |
| 15 | Spatial index quadtree | **Shipped v0.9.1** | O(log n) point/region queries |
| 16 | MCP tool consolidation (41 → 5) | Planned | Schema overhead reduction |

## Code Health Sprint (MRR-008)

Sourced from [MRR-008 (2026-04-30)](../reviews/MRR-008-2026-04-30.md). Full task breakdown across three phases. Complete before v1.0 launch prep.

### Phase 1 — Safe immediate fixes (✅ COMPLETE — 9 of 10 fixed, 1 already done)

| Task | Finding | File(s) | Effort |
|------|---------|---------|--------|
| Add `process.stderr.write` to 6 silent catch blocks | 13.4 | `post-capture-audit.js`, `middleware.js`, `source-linker.js`, `tool-helpers.js`, `spec-generator.js` | 30 min |
| Replace baseline stubs with explicit error responses | 13.5 | `native-message-handler.js:103-106` | 5 min |
| Fix indexer eviction to delete Map's first key instead of sort | 13.6 | `indexer.js:56-64` | 5 min |
| Fix TracePulse SSRF check to use `new URL().hostname` | 13.11 | `http-receiver.js:381` | 10 min |
| Fix `validate-path.js` trailing-slash comparison | 13.12 | `utils/validate-path.js:21` | 5 min |
| Replace O(n) challenge cleanup with per-challenge `setTimeout` | 13.16 | `auth/middleware.js:42-48` | 20 min |
| Add background expiry sweep to session-store | 13.17 | `auth/session-store.js` | 10 min |
| Replace `Math.random()` chunk IDs with `crypto.randomUUID()` | 13.23 | `native-host.js:56` | 5 min |
| Remove dead `httpReceiver.getInfo?.()` call | 13.24 | `index.js:246` | 15 min |
| Wrap get-capture.js diff-export I/O in try-catch | 13.26 | `tools/get-capture.js:59,79,90` | 10 min |

### Phase 2 — Refactors (✅ 6 of 12 fixed — remaining 6 are lower priority)

| Task | Finding | File(s) | Effort |
|------|---------|---------|--------|
| Convert `readAndParseMulti` to `Promise.all` + add `warnings` field | 13.1 | `utils/tool-helpers.js:159-165` | 20 min |
| Enforce `_MAX_FILE_SIZE` in source-linker + parallelize reads | 13.3 | `analysis/source-linker.js:31,94-115` | 1-2 hr |
| Single-pass JSON.stringify in get-capture-diff | 13.7 | `tools/get-capture-diff.js:77-90` | 30 min |
| Cache `getNodeDetails()` results in get-component-coverage | 13.8 | `tools/get-component-coverage.js:95-99` | 30 min |
| Replace node mutation with local Map in a11y-rules | 13.13 | `analysis/a11y-rules.js:94,119` | 45 min |
| Add rem/em/pt resolution to `contrast.js parseFontSize` | 13.14 | `analysis/contrast.js:96` | 1 hr |
| Add `bboxKnown: false` state to capture-diff missing-bbox case | 13.15 | `analysis/capture-diff.js:24-26` | 45 min |
| Extract `extractAllAnnotations()` and `getAnnotationSelector()` helpers | 13.19 | `utils/tool-helpers.js` + 7 callers | 1 hr |
| Migrate 12 remaining tools from bare response objects to `jsonResponse()` | 13.20 | Various `tools/*.js` | 1-2 hr |
| Standardize all tool response fields to camelCase | 13.21 | Various `tools/*.js` | 1-2 hr |
| Add `log()` helper, replace 15 `console.log` calls | 13.22 | `server/src/` wide | 30 min |

### Phase 3 — Structural (4 of 5 fixed/started, 1 deferred to v2.0)

| Task | Finding | File(s) | Effort |
|------|---------|---------|--------|
| O(N²→N) rewrite of consistency-checker — pre-index by testid | 13.2 | `analysis/consistency-checker.js:163-184` | 2-3 hr |
| Archive eligibility without full file reads | 13.9 | `archive.js:150-162` | 1-2 hr |
| Align WS/HTTP payload limits (or document constraint) | 13.10 | `ws-server.js:39`, `http-receiver.js:38` | 30 min |
| Implement `withCapture()` wrapper, migrate all 25 callers | 13.18 | `utils/tool-helpers.js` + all `tools/*.js` | 4-6 hr |
| Split `http-receiver.js` into router + config handler + TracePulse relay + capture receiver | 13.25 | `http-receiver.js` (623 lines) | 2-3 hr |

## Remaining Polish

| Item | Effort | Description |
|------|--------|-------------|
| Performance optimization | Medium | Lazy-load heavy modules, optimize DOM traversal for large pages |
| Extended Enrichment (Tier 2) | Medium | Error boundary state, service worker state, build metadata |

## Other Ideas (Backlog)

| Idea | Status | Doc |
|------|--------|-----|
| TracePulse Integration | Phase 1-3 shipped | [tracepulse-integration.md](../ideas/tracepulse-integration.md) |
| Panic Capture | Done | [panic-capture.md](../ideas/panic-capture.md) |
| Rolling Archive | Done | [rolling-archive.md](../ideas/rolling-archive.md) |
| Live Annotation Status | Done | [live-annotation-status.md](../ideas/live-annotation-status.md) |
| Extended Enrichment (Tier 1) | Done | [extended-capture-enrichment.md](../ideas/extended-capture-enrichment.md) |
| Themed Tooltip | Done | [themed-tooltip-component.md](../ideas/themed-tooltip-component.md) |
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
| SRR-010 | 2026-04-29 | Tier 2 post-cleanup | 2 MEDIUM (fingerprinting, inject guard), 10 test failures fixed |
| SRR-009 | 2026-04-29 | Tier 2 v3 enhancements | 1 HIGH (filePath write), 3 MEDIUM, 3 LOW fixed |
| SRR-008 | 2026-04-29 | Tier 3 full codebase | 1 CRITICAL (handshake), 3 HIGH, 4 MEDIUM fixed |
| SRR-007 | 2026-04-27 | Tier 3 sprint-end | [Report](../security/SRR-007-2026-04-27-T3.md) |
| SRR-006 | 2026-04-24 | Tier 3 sprint-end | [Report](../security/SRR-006-2026-04-24-T3.md) |

## Maintainability Reviews

| MRR | Date | Report |
|-----|------|--------|
| MRR-008 | 2026-04-30 | 22 new findings (5 HIGH, 11 MEDIUM, 6 LOW) — full server fresh-eyes pass. Performance, silent failures, abstraction debt. | [Report](../reviews/MRR-008-2026-04-30.md) |
| MRR-007 | 2026-04-29 | 6 HIGH (test gaps), 4 MEDIUM, 4 LOW. Test gaps documented for next sprint. |
| MRR-005 | 2026-04-27 | [Report](../reviews/MRR-005-2026-04-27.md) |
