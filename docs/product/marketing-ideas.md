# Marketing Ideas - Token Efficiency & Agent Productivity

Extracted from TracePulse ecosystem research (2026-04-29) and ViewGraph experiment data. These are research-backed claims with citations for use in GitBook, README, store descriptions, and launch materials.

## Headline Stats (Citable)

### The Token Crisis
- **Agents spend 60-80% of their token budget on orientation and retrieval, not problem-solving** (Morph 2026, Cognition internal, SWE-Pruner arXiv 2601.16746)
- One developer reported Claude Code reading 25 files to answer a question that required 3. The answer needed ~800 tokens; the retrieval burned ~12,000.
- Playwright MCP consumes ~114,000 tokens per 10-step task. Playwright CLI: ~27,000. ViewGraph v3: ~7,000. (TestDino 2026, ytyng.com 2026)
- Chrome DevTools MCP loads ~17,000 tokens of tool definitions before a single page is visited - 9% of a 200K context window consumed before the agent does anything. (isagentready.com 2026)

### ViewGraph's Measured Impact
- **97% token reduction** on 10-step tasks (v2: ~1M tokens, v3: ~32K tokens)
- **80-85% reduction** on interactive element queries via Action Manifest
- **30-45% smaller captures** from style dedup + default omission
- **30-50% fewer nodes** from D2Snap container merging
- **64% smaller content script** (856KB to 305KB) from axe-core lazy loading
- **99.8% reduction** on capture transmission with file-backed receipts
- **50-1500x compression** on sequential captures with JSON Patch diffs

### Cost Translation
- v2 full captures: ~$3.00 per 10-step task at $3/M tokens
- v3 smart mode: ~$0.10 per 10-step task
- Monthly savings at 50 tasks/day: $4,500/month to $150/month

### Research-Backed Design Decisions
- **Fewer tools = better agent performance**: Vercel D0 research showed 2 tools achieved 100% success vs 17 tools at 80% success, in 72% less time, using 40% fewer tokens (Pulumi 2026)
- **26% reduction in agent interaction rounds** when context is more focused (ecosystem research)
- **DOM hierarchy is a signal**: D2Snap (arXiv 2508.04412) proved wholesale flattening is counterproductive. Targeted merging of empty containers while preserving meaningful hierarchy is the right approach.
- **High-capability models need more context, not less**: "Read More, Think More" (arXiv 2604.01535) found that for Claude/GPT-4, AXTree-only observation decreases task success vs full HTML. ViewGraph's observationDepth parameter lets agents choose.

## Cross-Cutting Benefits (ViewGraph + TracePulse)

### The Full-Stack Verification Loop
```
Developer fixes code
  -> TracePulse: get_build_errors() -> syntax clean?
  -> TracePulse: get_errors() -> runtime 500s?
  -> ViewGraph: verify_fix() -> a11y, layout, console, network, regressions?
  -> All pass? Done. Any fail? Fix and repeat.
```
**One composite check replaces 5+ manual verification steps.**

### Frontend-Backend Error Correlation
- ViewGraph captures console errors and failed network requests
- TracePulse captures backend stack traces and server logs
- ViewGraph bridges frontend errors to TracePulse's log collector
- `get_correlated_errors` pairs browser HTTP failures with backend exceptions
- **Agent sees the full picture without switching tools**

### Token Efficiency Is a Product Feature

### Test Generation → Monitoring Loop
- ViewGraph captures a page → `@vg-tests` generates a Playwright test file with correct locators for every interactive element
- `@viewgraph/playwright` fixture captures DOM during E2E tests for structural regression detection
- TracePulse parses pytest/jest output and surfaces test failures as structured events
- Together: generate tests (VG) → run tests → monitor results (TP) → fix failures → re-capture → verify
- One tool generates, the other monitors. No gap between "tests exist" and "tests are healthy."

### Token Efficiency Is a Product Feature
- Every ViewGraph response is designed with a token budget
- Provenance metadata tells agents which data to trust vs verify
- observationDepth lets agents request only what they need
- TOON compact format reduces repeated structures by 87%
- Structural fingerprint enables cache-hit detection (skip re-parsing unchanged pages)

## Marketing Angles by Audience

### For Individual Developers
- "Stop burning tokens on orientation. ViewGraph gives your agent exactly the context it needs."
- "Your agent reads 100K tokens per page capture. ViewGraph v3: 400 tokens for the same interactive elements."
- "$3 per task vs $0.10 per task. Same fixes, 97% less cost."

### For Teams
- "QA annotates in the browser. Developer's agent fixes in the IDE. Same tool, same format."
- "No account, no cloud, no data leaves your machine. AGPL-3.0 open source."
- "10 security reviews. STRIDE threat model. HMAC-signed communication. 5-layer prompt injection defense."

### For Enterprise
- "41 MCP tools. Works with Kiro, Claude Code, Cursor, Windsurf, Cline."
- "Structural regression detection without screenshots. Baseline comparison catches missing elements."
- "Checkpoint/resume for multi-step agent workflows. Recovery without full re-capture."

### For Test Automation Teams
- "ViewGraph generates the tests. TracePulse monitors the results. Full loop: capture page → `@vg-tests` → complete Playwright test file with correct locators → tests run → TracePulse parses pytest/jest output → failures surfaced as structured events → agent fixes → repeat."
- "`@viewgraph/playwright` fixture: add `await viewgraph.capture('checkout-page')` to existing tests. Diff captures between runs. Detect structural regressions without screenshots."
- "20-30 minutes of manual test inspection reduced to one prompt. The agent reads every interactive element, generates assertions for each, and produces a runnable test file."

## Competitive Positioning Claims

| Claim | Evidence |
|---|---|
| "4x more token-efficient than Playwright MCP" | TestDino 2026: 114K vs 27K (CLI), ViewGraph v3: 7K |
| "97% fewer tokens than full-capture approaches" | Measured: v2 1M vs v3 32K per 10-step task |
| "Only tool with structural regression detection" | No competitor offers DOM diff without screenshots |
| "Only tool with provenance metadata" | No competitor tags field sources (measured/derived/inferred) |
| "Only tool with error-to-element correlation" | Console errors linked to specific DOM refs |
| "Works without an AI agent" | Copy Markdown, Download ZIP - standalone QA tool |

## Content Ideas

### Blog Posts
1. "Why Your AI Agent Burns $3 Per Page Fix (And How to Cut It to $0.10)"
2. "The Token Crisis: 60-80% of Agent Budget Wasted on Orientation"
3. "ViewGraph v3: How We Achieved 97% Token Reduction With Research-Backed Format Design"
4. "DOM Hierarchy Is a Signal: What D2Snap Taught Us About Agent-Friendly Captures"
5. "From 856KB to 305KB: Lazy Loading axe-core Without Losing 100+ WCAG Rules"

### Infographic Ideas
1. Token consumption comparison bar chart (Chrome DevTools MCP vs Playwright MCP vs CLI vs ViewGraph v3)
2. Cost calculator: "How much are you spending on agent tokens per month?"
3. v2 vs v3 format comparison: before/after capture sizes
4. The full-stack verification loop diagram (ViewGraph + TracePulse)
5. "What your agent actually needs" - pie chart of token budget (60-80% orientation vs 20-40% problem-solving)
