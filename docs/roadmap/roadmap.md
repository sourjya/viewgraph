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

### Phase 3 — Structural (5 of 5 addressed, 2 deferred to v2.0)

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
| traverseDOM chunking | Medium | Split single-pass DOM traversal into chunks for 2000+ node pages (prevents long tasks). Needs profiling data. |
| generate_tests MCP tool | Medium | Dedicated tool that produces a complete Playwright/Cypress test file from a capture. Currently a prompt (`@vg-tests`) - elevate to a tool that returns runnable code with correct locators for every interactive element. |
| Extended Enrichment (Tier 2) | Medium | Error boundary state, service worker state, build metadata |

## Extension Performance Pipeline (Spec)

Automated performance regression detection for the extension. 3 phases, CI-ready.
Spec: [`.kiro/specs/extension-perf-pipeline/`](../../.kiro/specs/extension-perf-pipeline/requirements.md) | Reference: [`docs/references/extension-performance-testing-pipeline.md`](../references/extension-performance-testing-pipeline.md)

| Phase | Scope | Effort | Status |
|-------|-------|--------|--------|
| Phase 1 | Bundle size gate + vitest bench (traverser, serializer) + perf-gate.js | 1 day | Not started |
| Phase 2 | Puppeteer E2E perf (sidebar open, capture time, annotation render) + enrichment verification (console/network error capture against known fixtures) | 1-2 days | Not started |
| Phase 3 | GitHub Actions workflow + release.sh integration | 0.5 day | Not started |

## Tool Clustering + Progressive Disclosure (Spec)

Reduce MCP schema token overhead by 85%+ (from ~8,200 to ~1,200 tokens/turn) by grouping 41 tools into 6 workflow-based gateway tools. Agents discover sub-actions via progressive disclosure.
Spec: [`.kiro/specs/tool-clustering/`](../../.kiro/specs/tool-clustering/requirements.md) | Reference: [`docs/references/mcp-tooling-research--the-case-for-rearchitecting-tracepulse-and-viewgraph.md`](../references/mcp-tooling-research--the-case-for-rearchitecting-tracepulse-and-viewgraph.md)

| Phase | Scope | Effort | Status |
|-------|-------|--------|--------|
| Phase 1 | Gateway factory + cluster config + mode switching | 1-2 days | Not started |
| Phase 2 | Wire all 6 clusters (Capture, Audit, Compare, Annotate, Session, Source) | 1 day | Not started |
| Phase 3 | Update prompts, measure tokens, switch default to clustered | 0.5 day | Not started |

Key numbers: 41 tools -> 6 gateways. ~8,200 -> ~1,200 schema tokens/turn. ~205,000 tokens saved per 25-turn session.

## Schema Token Optimization (Spec)

Compress tool descriptions (25-35% reduction) and extract shared parameter schemas. Complements tool clustering.
Spec: [`.kiro/specs/schema-token-optimization/`](../../.kiro/specs/schema-token-optimization/requirements.md)

| Phase | Scope | Effort | Status |
|-------|-------|--------|--------|
| Phase 1 | Measure baseline token counts | 0.5 day | Not started |
| Phase 2 | Compress all 41 tool descriptions | 1 day | Not started |
| Phase 3 | Extract shared Zod param schemas | 0.5 day | Not started |

Key budgets: content script < 50KB, sidebar open < 500ms, capture < 2000ms, annotation render < 100ms.

## v1.0 Platform Expansion

Based on [ViewGraph & TracePulse v1.0 Platform Strategy](../references/viewgraph-tracepulse-v1-platform-strategy.md). Goal: expand ViewGraph from JS/TS-only to full coverage of the 4 dominant full-stack topologies identified in the research.

| # | Feature | Justification | Effort | Spec |
|---|---|---|---|---|
| 1 | Framework Component Capture (React/Vue/Angular) | 80% of users on React (44.7%), Angular (18.2%), Vue (17.6%). Agent gets `ProductCard` instead of `div.css-xyz`. Extends existing components enrichment collector. (SO 2025, Octoverse 2025) | 2-3 days | [`.kiro/specs/framework-component-capture/`](../../.kiro/specs/framework-component-capture/requirements.md) |
| 2 | @viewgraph/vitest Plugin | Vitest is 2-4x faster than Jest, default for new Vite projects. Closes gap between "test failed" and "here's what the UI looked like." Complements @viewgraph/playwright for E2E. (SO 2025, JetBrains 2025) | 2-3 days | [`.kiro/specs/viewgraph-vitest/`](../../.kiro/specs/viewgraph-vitest/requirements.md) |
| 3 | Playwright Python Fixture | Python is #1 growth language (+7pp in SO 2025). FastAPI/Django teams run Playwright Python for E2E. Completes the Python story. Published as `viewgraph-playwright` on PyPI. (SO 2025) | 2-3 days | [`.kiro/specs/playwright-python/`](../../.kiro/specs/playwright-python/requirements.md) |
| 4 | Playwright Strict TypeScript Types | TypeScript is #1 on GitHub (Octoverse 2025). Strict TS teams reject loose types. Current `@viewgraph/playwright` capture payloads typed as `any`. (Octoverse 2025, JetBrains 2025) | 1-2 days | [`.kiro/specs/playwright-strict-types/`](../../.kiro/specs/playwright-strict-types/requirements.md) |
| 5 | Angular Component Tree Capture | 18.2% usage, enterprise segment with highest agent tool adoption and willingness to pay. Pairs with Spring Boot backend story. (SO 2025) | 2-3 days | [`.kiro/specs/angular-component-capture/`](../../.kiro/specs/angular-component-capture/requirements.md) |
| 6 | Documented Capture Gaps | Svelte has 62.4% admiration from 7.2% usage - teams WILL ask. React Native is dominant mobile framework. Documenting gaps prevents user frustration and shows transparency. (SO 2025) | 0.5 day | [`.kiro/specs/documented-gaps/`](../../.kiro/specs/documented-gaps/requirements.md) |

**Total estimated effort:** 10-15 days

**Research sources:** Stack Overflow Developer Survey 2025 (49k+ devs), JetBrains Developer Ecosystem Survey 2025 (24.5k devs), GitHub Octoverse 2025, State of JS 2025.

## Session Intelligence Roadmap

Based on [ViewGraph Future Directions v2](../references/viewgraph-future-directions-v2-from-annotated-bug-capture-to-multi-output-session-intelligence.md). Goal: transform ViewGraph from a single-shot bug capture tool into a multi-output session engine. One annotated recording session produces artifacts for five distinct consumer personas - developer, QA engineer, technical writer, product manager, and compliance officer - without re-recording.

**Central insight:** Every output path (Playwright test, QA export, tutorial, onboarding flow, regression baseline) requires exactly the same underlying data. What differs is the renderer, not the recording. The session schema is the platform.

### Phase 1 - v1.1: Steps Recorder + Agent-to-Playwright Path

**The primary differentiator. Build first.**

| # | Feature | Description |
|---|---|---|
| 1 | Record Session mode | Guided step-by-step recording UX in extension sidebar (pause-and-annotate between actions) |
| 2 | Session schema writer | Append-safe, crash-resistant session.json writer in MCP server |
| 3 | Agent-generated Playwright tests | Primary export - agent converts intent annotations to parameterized tests with real assertions |
| 4 | QA export | Jira/GitHub structured test cases per step (preconditions, steps, expected result, screenshot) |
| 5 | Session viewer | Browse, reorder, delete, and edit steps in extension sidebar |
| 6 | Multi-tab continuity | Track tab switches as navigation steps via `tabs.onActivated` |
| 7 | Automatic PII masking | Capture-time redaction for password/cc/ssn fields (before payload leaves extension) |
| 8 | Shadow DOM traversal | Recursive `shadowRoot` query via `composedPath()` for open-mode shadow roots |
| 9 | SPA navigation patching | History API interception (`pushState`, `replaceState`) in main world context |
| 10 | Capture-phase event listeners | Framework-agnostic event capture before React/Angular/Vue synthetic event systems |

**Justification:** "Non-technical testers produce real Playwright tests without knowing Playwright exists." No tool does this today. Playwright codegen has no intent, no assertions, no non-technical path. Scribe/Tango have no DOM semantics, no test output. The session schema is output-agnostic from day one - every subsequent renderer is a plug-in on the same schema.

**Competitive insight:** The annotation layer is the bridge between human intent and automated tests. The LLM is the translator. The session schema is the medium. This pipeline does not exist in any tool today.

**Effort:** 3-4 weeks

**Spec:** [`.kiro/specs/session-recorder/`](../../.kiro/specs/session-recorder/requirements.md)

**Key technical dependencies:** v3 actionManifest (element resolver), delta capture (post_delta at 90-99% token reduction), structuralFingerprint (significance detection), observationDepth interactive-only (live recording at ~400 tokens/step), checkpoint envelope (agent-side session mirror).

### Phase 2 - v1.2: Tutorial Designer

| # | Feature | Description |
|---|---|---|
| 1 | Tutorial recording mode | Annotation prompts tuned for documentation ("How would you describe this step to a new user?") |
| 2 | LLM cache generation | Batch generation at session end: auto_title, auto_description per audience, inferred_section |
| 3 | Section grouping | LLM groups steps under headings derived from context.nearest_heading and context.landmark |
| 4 | HTML export | Self-contained interactive tutorial with SoM screenshots embedded, step navigation |
| 5 | Markdown export | Notion/Confluence-compatible with proper heading hierarchy and screenshot links |
| 6 | PDF export | Paginated with bookmarks, TOC, header/footer with version stamp |
| 7 | Voice-to-text annotation | Web Speech API transcription during recording (zero backend cost) |
| 8 | Screenshot annotation tools | Crop, zoom, callout boxes, arrows in session viewer |
| 9 | Audience selection | Same recording exports with different prose: end user, developer, QA |
| 10 | Pass/fail per-step annotation | QA execution mode with actual_outcome and expected vs actual diff view |

**Justification:** Scribe/Tango are screenshot pipelines. They give their LLM a pixel image. ViewGraph gives its LLM ARIA roles, component names, network state, form context, and navigation outcomes per step. The LLM writes "Click Submit to create your account. You'll see your dashboard if everything looks good." not "Click the button." This quality gap is structural and not closable without re-architecting around DOM capture.

**Competitive insight:** Glyde is the closest architectural relative (DOM capture for documentation). But Glyde has no ARIA semantics, no network state, no agent integration, no test output. The gap is the entire semantic layer. ViewGraph's auto-generated prose is factually grounded in measured DOM state, not inferred from pixels.

**Effort:** 2-3 weeks

**Spec:** [`.kiro/specs/tutorial-designer/`](../../.kiro/specs/tutorial-designer/requirements.md)

**Key technical dependencies:** Session schema from v1.1, llm_cache fields, renderer_hints.tutorial namespace, v3 correlatedRefs (error context in prose), containerMerging (cleaner hierarchy for section grouping).

### Phase 3 - v1.3: Tutorial Distribution

| # | Feature | Description |
|---|---|---|
| 1 | Shareable public links | Hosted tutorial viewer with step-level deep-links (`#step-N`) |
| 2 | Confluence publish | Direct OAuth 2.0 integration, create/update pages with screenshots as attachments |
| 3 | Notion publish | Direct API integration, block-based page creation with image blocks |
| 4 | Staleness detection | DOM drift flagging via structuralFingerprint comparison + per-element semantic diff |
| 5 | Agent-maintained docs | Agent rewrites drifted steps using new DOM context; human approves before re-publish |
| 6 | Tutorial completion webhook | Client-side event emission for CRM/analytics integration (PostHog, Amplitude, Mixpanel) |
| 7 | Version history | Track changes across re-publishes with exportable diff ("What changed in v3") |
| 8 | Locator stability benchmark | Measure ViewGraph selector stability vs codegen selectors over N UI change cycles |

**Justification:** This is the "living documentation" capability. When the UI changes, the agent flags which tutorial steps drifted and rewrites them. No competitor has this. Scribe tutorials break silently. ViewGraph tutorials self-heal. The staleness detection is only possible because ViewGraph stores semantic context (ARIA labels, component names, structural fingerprints), not pixel data.

**Competitive insight:** The combination of staleness detection + agent rewrite + human approval creates a documentation maintenance loop that eliminates the #1 pain point of every documentation tool: tutorials going stale. This is a product category that does not exist today.

**Effort:** 2-3 weeks

**Spec:** [`.kiro/specs/tutorial-distribution/`](../../.kiro/specs/tutorial-distribution/requirements.md)

**Key technical dependencies:** v3 structuralFingerprint (fast-path staleness gate), actionManifest locator strategies (three-tier element re-location), llm_cache invalidation (lazy regeneration on drift).

### Phase 4 - v1.4: Regression Baseline Mode

| # | Feature | Description |
|---|---|---|
| 1 | Regression baseline recording | `recording_mode: "regression_baseline"` stores full DOM snapshot per step in `baselines/` |
| 2 | Structural regression diffing | Compare current DOM against baseline using structuralFingerprint + per-element semantic diff |
| 3 | CI integration | Playwright test generated from session includes baseline comparison assertions |
| 4 | Trace linking | Session steps link to Playwright trace viewer via checkpoint.traceId |
| 5 | CI failure annotation | Failed Playwright test links back to original session step with intent annotation |

**Justification:** Visual regression testing with annotated semantic context - richer than pixel-diff tools and more meaningful for agents investigating what broke. A button that moved 5px does not fail. A button that changed its ARIA label from "Submit" to "Continue" does. The agent knows why the test exists (from the annotation) and what specifically changed (from the semantic diff).

**Competitive insight:** Self-healing selector tools (Healwright, Playwright AI Healer) react to broken selectors. ViewGraph generates selectors that are less likely to break in the first place. The regression baseline mode quantifies this advantage.

**Effort:** 2 weeks

**Spec:** Not yet created (v1.4 is post-v1.3)

### Phase 5 - v2.0: Onboarding Platform

| # | Feature | Description |
|---|---|---|
| 1 | Embeddable JS onboarding widget | WalkMe-lite overlay, no SDK required, reads from published session JSON |
| 2 | Semantic element re-location | In-app step overlay using ARIA + testId locator strategies (survives UI changes) |
| 3 | Compliance audit trail | Timestamped tested-scenario export with DOM proof per step (signed artifacts) |
| 4 | Cross-session analytics | Which steps fail most often, which tutorials are abandoned |
| 5 | Branching decision trees | Conditional tutorial flows (if user sees X, goto step Y) |

**Justification:** The embeddable widget is the WalkMe-lite path - architecturally significant because it requires no SDK integration. A single script tag reads the session JSON and overlays step annotations on matching DOM elements. Element re-location uses semantic locator strategies (ARIA + testId), making it substantially more resilient than any screenshot-based overlay tool that relies on pixel coordinates.

**Competitive insight:** WalkMe costs $1.5B (SAP acquisition) and requires 8-12 weeks setup. ViewGraph's widget is a one-file embed that reads from the same session JSON that produces Playwright tests and tutorials. The schema is the platform.

**Effort:** 4-6 weeks

**Spec:** Not yet created (v2.0 is long-term)

**Design constraint:** Build the HTML/Markdown export first (v1.2). The embeddable widget shares the same renderer logic but adds live DOM matching. It is the right v2.0 feature, not v1.2.

---

### Schema Freeze Recommendation

Freeze the session schema before writing a single renderer. Once `session.json` files exist in the wild, changing the schema is a migration cost. The schema should be reviewed and locked before v1.1 ships publicly - even if that delays the initial release by a week. The cost of that week is paid once. The cost of a schema migration is paid in every consumer that reads the format.

---

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
| SRR-008 | 2026-04-30 | Tier 3 full codebase | 0 CRITICAL, 1 HIGH (carried), 2 new MEDIUM (filePath traversal, URL match inconsistency), 1 new LOW. S3-8 filePath fixed + 4 security tests. [Report](../security/SRR-008-2026-04-30-T3.md) |
| SRR-007 | 2026-04-27 | Tier 3 sprint-end | [Report](../security/SRR-007-2026-04-27-T3.md) |
| SRR-006 | 2026-04-24 | Tier 3 sprint-end | [Report](../security/SRR-006-2026-04-24-T3.md) |

## Maintainability Reviews

| MRR | Date | Report |
|-----|------|--------|
| MRR-009 | 2026-04-30 | 8 new findings, 6 resolved from MRR-008. 14.1 verify-fix.js bug fixed. [Report](../reviews/MRR-009-2026-04-30.md) |
| MRR-008 | 2026-04-30 | 22 new findings (5 HIGH, 11 MEDIUM, 6 LOW) -- full server fresh-eyes pass. [Report](../reviews/MRR-008-2026-04-30.md) |
| MRR-005 | 2026-04-27 | [Report](../reviews/MRR-005-2026-04-27.md) |

## Other Reviews (2026-04-30)

| Review | Report |
|--------|--------|
| Dependency Risk | Zero CVEs, 10 findings (version pinning, license fields, single-maintainer risk). [Report](../reviews/dependency-risk-2026-04-30.md) |
| Test Quality | 1 HIGH (no setSvg tests -- fixed), 4 MEDIUM, 5 LOW. 1804 tests total. [Report](../reviews/test-quality-2026-04-30.md) |
