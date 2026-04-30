# Autonomous ViewGraph: From Manual Capture to Event-Driven Companion

**Created:** 2026-05-01
**Status:** Research
**Category:** Architecture Evolution

## Abstract

ViewGraph currently requires the user to click a toolbar icon to capture a page. The agent then queries the capture via MCP tools. This research explores how ViewGraph could evolve into an autonomous, event-driven companion that automatically captures, diffs, and surfaces UI changes to AI coding agents — without flooding them with noise.

The research covers seven topics: event-driven MCP patterns, autonomous browser monitoring, Chrome DevTools MCP complementarity, the autonomous loop architecture, existing art, token budget concerns, and user control. Each section includes citations, feasibility assessment, and architectural implications.

---

## 1. Event-Driven MCP Patterns

### 1.1 The MCP Notification Spec

The MCP specification (2025-03-26) defines two notification mechanisms relevant to autonomous ViewGraph:

**Resource Subscriptions.** Servers declare `resources.subscribe: true` in their capabilities. Clients subscribe to specific resource URIs via `resources/subscribe`. When a resource changes, the server emits a `notifications/resources/updated` notification with the resource URI. The client can then re-read the resource to get the new content. ([MCP Spec: Resources](https://modelcontextprotocol.io/specification/2025-03-26/server/resources))

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": { "uri": "viewgraph://captures/latest" }
}
```

**List Changed Notifications.** Servers declare `resources.listChanged: true`. When the set of available resources changes (e.g., a new capture file appears), the server emits `notifications/resources/list_changed`. This is the "new capture available" signal.

**Logging Notifications.** The MCP logging utility allows servers to send structured log messages at various severity levels. This could carry lightweight event summaries without requiring the client to poll. ([MCP Spec: Logging](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/logging))

### 1.2 Transport Implications

**stdio transport** (how ViewGraph runs today): The server writes JSON-RPC notifications to stdout. The client reads them. This is fully bidirectional — the server can emit notifications at any time without the client requesting them. This is the simplest path for ViewGraph.

**Streamable HTTP transport** (2025-03-26): Replaces the older HTTP+SSE transport. The client can issue an HTTP GET to open an SSE stream, and the server pushes notifications on that stream. This enables remote/multi-client scenarios but adds complexity. ([MCP Spec: Transports](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports))

### 1.3 How TracePulse Emits Events (Reference Architecture)

TracePulse monitors backend dev server logs and emits events to agents. From the TracePulse deep research document:

- **Signal scoring**: Each error gets a numeric score based on severity, novelty, and recurrence. Only errors above a threshold are surfaced.
- **Fingerprint deduplication**: Errors are hashed into fingerprints. Duplicate occurrences increment a counter rather than emitting new events.
- **Batching**: Multiple events within a time window are batched into a single summary.
- **Occurrence counting**: "This error occurred 47 times" rather than 47 separate notifications.

The TracePulse research notes a key risk: "The MCP 2025-11-25 spec doesn't have server-initiated notifications, but a follow-on spec likely will." This was written before the 2025-03-26 spec, which *does* have `notifications/resources/updated` and `list_changed`. ViewGraph can use these today.

### 1.4 What ViewGraph Can Emit

Mapping MCP notification primitives to ViewGraph events:

| ViewGraph Event | MCP Mechanism | Payload |
|---|---|---|
| New capture available | `notifications/resources/list_changed` | (none — client calls `list_captures`) |
| Specific capture updated | `notifications/resources/updated` | `uri: viewgraph://captures/{filename}` |
| DOM change summary | `notifications/message` (logging) | Structured JSON: elements added/removed/changed |
| A11y regression detected | `notifications/message` (logging) | Severity + element details |
| HMR capture + diff ready | `notifications/resources/updated` | `uri: viewgraph://diffs/latest` |

### 1.5 Feasibility Assessment

**High feasibility.** The MCP spec already supports everything needed. ViewGraph's server runs on stdio, which supports bidirectional notifications natively. The extension already pushes captures to the server via HTTP. The server just needs to emit MCP notifications when new captures arrive.

**Key gap:** Most MCP clients (Kiro, Claude Code, Cursor) don't yet fully support server-initiated notifications. They poll or wait for tool responses. The notification will arrive, but the client may not act on it until the next agent turn. This is acceptable for a "background companion" model — the data is ready when the agent next looks.

---

## 2. Autonomous Browser Monitoring: Signal vs Noise

### 2.1 The MutationObserver Challenge

MutationObserver is the browser's API for detecting DOM changes. It fires a callback with an array of `MutationRecord` objects after a batch of DOM changes. The challenge for autonomous monitoring is that modern frameworks generate enormous volumes of mutations that are semantically meaningless:

- A React re-render of a list component may produce hundreds of `childList` mutations (remove all children, add all children) even when the data hasn't changed.
- CSS-in-JS libraries (styled-components, Emotion) generate `attributes` mutations on every render as class names change.
- Animation libraries produce continuous `attributes` mutations on `style` and `transform`.

ViewGraph's existing `continuous-capture.js` already handles this with several heuristics:
- **2-second debounce** after last mutation (catches React batch renders)
- **1-second debounce** for HMR events (discrete, not streaming)
- **5-second minimum interval** between captures (hard rate limit)
- **2000-element ceiling** — auto-capture disabled on large pages
- **Attribute filtering** — only watches `data-testid`, `role`, `class`, `aria-label`, `aria-hidden`
- **Self-exclusion** — ignores mutations from ViewGraph's own UI (`[data-vg-annotate]`)
- **Visibility pause** — disconnects observer when tab is backgrounded

### 2.2 How Session Replay Tools Filter Noise

**rrweb** (used by Sentry, PostHog, LogRocket, FullStory) takes a different approach: record everything, filter on replay. rrweb's observer records all DOM mutations via MutationObserver, using a "lazy processing" strategy:

1. Collect all raw mutation records in a callback batch
2. After processing all records, deduplicate: each node is serialized only once
3. "Dropped nodes" (added then removed in the same batch) are discarded
4. Attribute changes are overwritten: only the final value of an attribute within a single callback is recorded

([rrweb observer.md](https://github.com/rrweb-io/rrweb/blob/master/docs/observer.md))

**Sentry Session Replay** adds mutation limits on top of rrweb:
- `mutationBreadcrumbLimit: 750` — warns when mutations exceed this per batch
- `mutationLimit: 10000` — stops recording entirely to prevent performance degradation
- These are safety valves, not signal filters

([Sentry Session Replay Configuration](https://docs.sentry.io/platforms/javascript/session-replay/configuration/))

**LogRocket** takes the most sophisticated approach to main-thread protection:
- Event handlers do minimal work: push events to an in-memory queue
- Processing is offloaded to a Web Worker thread
- Main thread is never blocked for more than 5 milliseconds
- Built-in circuit breakers throttle or stop capture of specific data types when unusual behavior is detected (e.g., thousands of console messages per second)
- Recording quality is automatically reduced to avoid impacting the recorded app

([LogRocket Performance](https://docs.logrocket.com/v1.0/docs/performance))

**PostHog** batches rrweb events into `$snapshot_items` arrays, compresses with Snappy, and flushes every 10 seconds or 100MB. The architecture is: browser → Rust capture service → Kafka → Node.js blob ingestion → S3 + ClickHouse.

([PostHog Session Replay Architecture](https://posthog.com/handbook/engineering/session-replay/session-replay-architecture))

### 2.3 Heuristics for Meaningful Change Detection

For ViewGraph's autonomous mode, the goal is different from session replay. We don't need to record everything — we need to detect *meaningful structural changes* that an agent should know about. Key heuristics:

**Structural significance scoring:**
| Change Type | Signal Score | Rationale |
|---|---|---|
| Element with `data-testid` added/removed | High | Test-relevant element changed |
| Interactive element (button, input, link) added/removed | High | User-facing functionality changed |
| Heading or landmark element changed | High | Page structure changed |
| `aria-*` attribute changed | High | Accessibility impact |
| Text content of visible element changed | Medium | Content update |
| `class` attribute changed | Low | Often cosmetic (CSS-in-JS) |
| `style` attribute changed | Low | Animation, transition |
| Container div added/removed with no interactive children | Noise | Framework wrapper |

**Batch-level heuristics:**
- If >50 mutations in a single callback and >80% are `childList` on the same parent → likely a list re-render → Low signal
- If mutations touch elements with `data-testid` → High signal regardless of volume
- If mutations follow an HMR event within 2 seconds → High signal (developer's change)
- If mutations only affect `style` or `class` attributes → Low signal (animation/transition)

### 2.4 Feasibility Assessment

**High feasibility.** ViewGraph already has the MutationObserver infrastructure. The missing piece is a scoring function that classifies mutation batches as "meaningful" vs "noise" before triggering a capture. This is a content-script-side filter (~50-100 lines) that runs before the debounce timer fires.

**Risk:** False negatives. A scoring heuristic might miss a meaningful change that doesn't touch testids or interactive elements. Mitigation: the user can always manually capture, and the heuristics should be tunable.

---

## 3. Chrome DevTools MCP Complementarity

### 3.1 What Chrome DevTools MCP Does

Chrome DevTools MCP (`chrome-devtools-mcp`) by Google provides 33 tools across 8 categories for live browser control:

- **Input automation** (9 tools): click, drag, fill, hover, press_key, type_text, etc.
- **Navigation** (6 tools): navigate_page, new_page, list_pages, wait_for, etc.
- **Emulation** (2 tools): viewport, device emulation
- **Performance** (3 tools): trace recording and insight analysis
- **Network** (2 tools): request inspection
- **Debugging** (6 tools): evaluate_script, console messages, Lighthouse, **take_snapshot**, take_screenshot
- **Extensions** (5 tools): install, reload, trigger extension actions
- **Memory** (1 tool): heap snapshots

([Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp))

The key tool for comparison is `take_snapshot`, which captures the page's accessibility tree as a text representation. It uses Puppeteer's accessibility tree API, producing a flat list of elements with roles, names, and values.

### 3.2 What ViewGraph Captures That DevTools MCP Doesn't

| Dimension | Chrome DevTools MCP `take_snapshot` | ViewGraph `get_capture` |
|---|---|---|
| **Structure** | A11y tree (roles, names, values) | Full DOM tree with parent-child relationships |
| **Selectors** | Element UIDs (session-scoped) | CSS selectors, data-testid, aria-label |
| **Styles** | None | Computed styles, style dedup table |
| **Layout** | None | Bounding boxes, overflow detection, stacking context |
| **Accessibility** | Basic a11y tree | axe-core audit results (100+ WCAG rules) |
| **Test IDs** | None | data-testid extraction and coverage reporting |
| **Enrichment** | None | Console errors, network failures, landmarks, focus traps |
| **Framework** | None | Component detection (React, Vue, Angular, Svelte) |
| **Annotations** | None | Human review comments with severity |
| **Diffing** | None (point-in-time only) | Structural diff, JSON Patch, baseline comparison |
| **Persistence** | None (ephemeral) | .viewgraph.json files, archive, baselines |
| **Token efficiency** | ~500-2000 tokens per snapshot | 80-85% reduction via Action Manifest, observationDepth |

### 3.3 What DevTools MCP Does That ViewGraph Doesn't

| Capability | Chrome DevTools MCP | ViewGraph |
|---|---|---|
| **Live interaction** | Click, type, fill forms, drag | None (read-only captures) |
| **JavaScript execution** | `evaluate_script` in page context | None |
| **Performance tracing** | Full Chrome trace with insights | None |
| **Network inspection** | Request/response bodies, headers | Failed requests only (in enrichment) |
| **Memory profiling** | Heap snapshots | None |
| **Real-time console** | Live console message stream | Point-in-time console snapshot |
| **Device emulation** | Viewport, user agent, geolocation | None |
| **Multi-page control** | Open, close, switch tabs | None |

### 3.4 The Complementarity Model

The three tools form a stack with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│  Chrome DevTools MCP                                     │
│  "The hands" — live interaction, execution, performance  │
│  Best for: clicking, typing, running JS, tracing         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  ViewGraph                                               │
│  "The eyes" — structured UI perception, diffing, audit   │
│  Best for: understanding what's on the page, what changed│
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  TracePulse                                              │
│  "The ears" — backend runtime feedback, error detection  │
│  Best for: server crashes, build errors, log analysis    │
└─────────────────────────────────────────────────────────┘
```

**In the autonomous loop, each tool has a distinct role:**
- TracePulse detects that something happened (hot-reload, error)
- ViewGraph captures and analyzes what the UI looks like now
- Chrome DevTools MCP verifies interactively if needed (click a button, check a specific element)

### 3.5 Why Autonomous ViewGraph ≠ Repeated `take_snapshot`

An agent could theoretically poll `take_snapshot` after every change. But this fails for several reasons:

1. **No diffing.** `take_snapshot` returns a new tree each time. The agent must diff in-context, consuming tokens. ViewGraph diffs server-side and returns only changes.
2. **No enrichment.** `take_snapshot` doesn't include a11y audit results, console errors, network failures, or test ID coverage.
3. **No persistence.** Snapshots are ephemeral. ViewGraph captures are files that can be compared across sessions, promoted to baselines, and archived.
4. **Token cost.** A `take_snapshot` of a medium page is 500-2000 tokens of raw a11y tree. ViewGraph's `get_capture_diff` returns 50-1500x smaller JSON Patches. For autonomous monitoring, the diff is what matters, not the full state.
5. **No signal scoring.** `take_snapshot` always returns the full tree. ViewGraph can score changes and only notify when something meaningful happened.

---

## 4. The Autonomous Loop

### 4.1 The Envisioned Flow

```
Developer saves file
       │
       ▼
┌──────────────────┐
│ TracePulse        │ Detects hot-reload via dev server log
│ emits: HMR event  │ (Vite: "hmr update /src/App.tsx")
└────────┬─────────┘
         │ MCP notification or agent polls get_status()
         ▼
┌──────────────────┐
│ ViewGraph         │ Extension's continuous-capture fires
│ auto-captures     │ (MutationObserver + HMR listener)
│ diffs vs previous │ Server computes JSON Patch diff
└────────┬─────────┘
         │ MCP notification: resources/updated
         ▼
┌──────────────────┐
│ Agent evaluates   │ Reads diff summary (~100-200 tokens)
│ decides action    │ "3 elements added, 1 a11y issue, 0 layout breaks"
└────────┬─────────┘
         │ If action needed:
         ▼
┌──────────────────┐
│ Agent acts        │ Calls ViewGraph tools (audit_a11y, find_source)
│                   │ Calls DevTools MCP (take_screenshot, evaluate_script)
│                   │ Fixes code, requests verification capture
└──────────────────┘
```

### 4.2 Trigger Chain Analysis

The trigger chain has three stages, each with different latency:

| Stage | Trigger | Latency | Source |
|---|---|---|---|
| 1. File save → HMR | Developer saves | 50-500ms | Vite/webpack |
| 2. HMR → DOM settle | Module replacement | 100-2000ms | Framework re-render |
| 3. DOM settle → Capture | MutationObserver debounce | 2000ms (configured) | ViewGraph extension |
| 4. Capture → Diff | Server receives capture | 50-200ms | ViewGraph server |
| 5. Diff → Notification | Server emits MCP notification | <10ms | ViewGraph server |
| 6. Notification → Agent action | Agent processes notification | 0-∞ | Agent client |

**Total latency from file save to diff ready: ~2.5-5 seconds.** This is acceptable for a background companion — the developer is still looking at the page when the diff is ready.

### 4.3 Event Storm Prevention

The biggest risk is event storms: rapid file saves during active development could trigger a cascade of captures, diffs, and notifications that overwhelm the agent's context window.

**Prevention strategies (layered):**

1. **Extension-level rate limiting** (already built): Max 1 capture per 5 seconds. Debounce timers collapse rapid mutations.

2. **Server-level deduplication**: If two captures arrive within 5 seconds and the diff is empty (no structural changes), suppress the notification. Only emit when the diff is non-empty.

3. **Signal scoring** (new): Score each diff by significance:
   - Interactive elements changed: +10 per element
   - A11y attributes changed: +5 per element
   - Test IDs changed: +5 per element
   - Text content changed: +2 per element
   - Container/wrapper changes only: +0
   - Threshold: only notify if score > 5

4. **Batching window**: If multiple captures arrive within a 10-second window, batch them into a single summary: "3 captures since last check, net change: +2 buttons, -1 input, 1 new a11y issue."

5. **Agent-side budget**: The agent can set a token budget for autonomous notifications. ViewGraph respects it by adjusting summary verbosity or suppressing low-score events.

### 4.4 Token Cost Estimation

| Component | Tokens | Frequency |
|---|---|---|
| Diff summary (compact) | 100-200 | Per meaningful change |
| Full diff (JSON Patch) | 500-2000 | On-demand (agent requests) |
| A11y regression alert | 50-100 | Per regression |
| Batched summary (10s window) | 150-300 | Per batch |
| Full capture (if agent requests) | 5000-50000 | Rare (agent pulls) |

**Estimated autonomous overhead: 200-500 tokens per meaningful UI change.** At typical development pace (1-2 meaningful changes per minute during active coding), this is 200-1000 tokens/minute — well within agent context budgets.

For comparison, a single `take_snapshot` call costs 500-2000 tokens. The autonomous diff approach is 2-10x more token-efficient than polling.

### 4.5 Feasibility Assessment

**High feasibility.** Every component exists:
- Extension: continuous-capture with MutationObserver + HMR detection ✅
- Server: JSON Patch diffing, capture comparison ✅
- MCP: notification primitives in the spec ✅
- Missing: signal scoring function, batching logic, MCP notification emission

**Estimated effort:** 2-3 weeks for a working prototype:
- Week 1: Signal scoring in extension, notification emission in server
- Week 2: Batching logic, agent-side budget configuration
- Week 3: Integration testing, token cost measurement, documentation

---

## 5. Existing Art

### 5.1 Anthropic's MCP Notification Spec

The MCP specification (2025-03-26) defines three notification types relevant to autonomous tools:

- `notifications/resources/list_changed` — the set of available resources changed
- `notifications/resources/updated` — a specific subscribed resource changed
- `notifications/tools/list_changed` — the set of available tools changed

The subscription model is explicit: clients call `resources/subscribe` with a URI, and the server emits `notifications/resources/updated` when that resource changes. This is pull-on-push: the notification says "something changed," and the client decides whether to re-read.

The Streamable HTTP transport (replacing HTTP+SSE) allows servers to push notifications via SSE streams opened by client GET requests. This enables remote/multi-client scenarios where the server isn't a subprocess.

**Relevance to ViewGraph:** The spec supports exactly the pattern we need. ViewGraph can expose captures as resources (`viewgraph://captures/{filename}`) and emit `updated` notifications when new captures arrive. The agent subscribes once and gets notified automatically.

### 5.2 BrowserTools MCP (AgentDeskAI)

BrowserTools MCP is a Chrome extension + Node.js server that gives AI agents access to browser debugging data: console logs, network requests, screenshots, and selected DOM elements. Key architecture:

- Chrome extension captures data and sends to a local Node.js server (port 3025) via WebSocket
- Node.js server exposes MCP tools for agents to query
- Tools include: `getConsoleLogs`, `getConsoleErrors`, `getNetworkLogs`, `takeScreenshot`, `getSelectedElement`
- "Debugger Mode" and "Audit Mode" are composite workflows using multiple tools

([BrowserTools MCP](https://browsertools.agentdesk.ai/))

**Key difference from ViewGraph:** BrowserTools is reactive (agent asks for data) not proactive (tool pushes data). It doesn't auto-capture or diff. It doesn't persist captures or compute structural changes. It's closer to a simplified Chrome DevTools MCP than to ViewGraph's structured perception model.

**Lesson for ViewGraph:** BrowserTools' "Debugger Mode" (a composite prompt that chains multiple tools) is a good UX pattern. ViewGraph's `@vg-review` prompt is similar. The autonomous mode could add a `@vg-watch` prompt that activates background monitoring.

### 5.3 Sentry Session Replay's DOM Diffing

Sentry Session Replay uses rrweb to record DOM mutations as incremental snapshots. The architecture:

1. **Full snapshot**: Complete DOM serialization at session start
2. **Incremental snapshots**: MutationObserver records changes as deltas
3. **Mutation limits**: `mutationBreadcrumbLimit: 750` (warn), `mutationLimit: 10000` (stop recording)
4. **Compression**: Events are batched and compressed before transmission
5. **Replay**: Server reconstructs DOM state by applying incremental snapshots to the full snapshot

([Sentry Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/configuration/))

**Relevance to ViewGraph:** Sentry's mutation limits are a safety valve pattern ViewGraph should adopt. The 10,000-mutation hard stop prevents runaway recording on pathological pages. ViewGraph's 2000-element ceiling serves a similar purpose but at a different level (page size vs mutation volume).

**Key insight from rrweb:** The "lazy processing" pattern — collect all mutations in a batch, then deduplicate and order — is essential for correctness. ViewGraph's MutationObserver callback should adopt this pattern rather than processing mutations individually.

### 5.4 WebArena and Mind2Web (Autonomous Web Agents)

**WebArena** (CMU, 2023-2024) is a benchmark for autonomous web agents operating on real websites. Agents observe the page (via accessibility tree or screenshot), decide on an action, execute it, and observe the result. The observe-act loop is the core pattern.

([WebArena: A Realistic Web Environment for Building Autonomous Agents](https://arxiv.org/abs/2307.13854))

**Mind2Web** (OSU, 2023) is a dataset for generalist web agents. It provides 2,350 tasks across 137 real websites. The key finding: agents that use structured DOM representations (filtered HTML with key attributes) outperform those using raw HTML or screenshots alone.

([Mind2Web: Towards a Generalist Agent for the Web](https://arxiv.org/abs/2306.06070))

**ScribeAgent** (2024) achieves state-of-the-art on both WebArena and Mind2Web by fine-tuning on production workflow data. It improves task success rate by 7.3% over previous text-only agents.

([ScribeAgent: Towards Specialized Web Agents](https://arxiv.org/abs/2411.15004))

**"An Illusion of Progress?"** (2025) is a critical assessment finding that despite benchmark improvements, real-world web agent performance remains limited. The paper identifies key failure modes: context loss over long horizons, inability to recover from errors, and poor generalization.

([An Illusion of Progress? Assessing the Current State of Web Agents](https://arxiv.org/abs/2504.01382))

**Relevance to ViewGraph:** These papers validate that structured DOM representations (what ViewGraph produces) are superior to raw HTML for agent perception. The autonomous loop pattern (observe → act → observe) is exactly what ViewGraph's watch mode would enable. The "context bloat" problem identified in the critical assessment is why ViewGraph's token-efficient diffs matter.

### 5.5 The Agentic Loop Pattern (Claude Code, Kiro, Cursor)

The agentic loop is the fundamental pattern powering modern coding agents:

**Claude Code's loop** (documented by Anthropic):
1. Receive prompt
2. Evaluate and respond (may include tool calls)
3. Execute tools, collect results
4. Repeat until no more tool calls
5. Return result

The loop includes automatic context compaction when the window fills, hooks for intercepting tool calls (`PreToolUse`, `PostToolUse`, `Stop`), and subagent delegation for isolated subtasks.

([Claude Code Agent Loop](https://code.claude.com/docs/en/agent-sdk/agent-loop))

**The Observe-Think-Act (OTA) cycle** is the generalized pattern:
- **Observe**: Read tool results, user messages, environment state
- **Think**: Use the LLM as a reasoning engine to decide next action
- **Act**: Call a tool or produce a response
- Repeat until goal achieved or stopping condition hit

([Agent Loops: Observe-Think-Act Cycles](https://www.kindatechnical.com/agentic-ai/agent-loops-observe-think-act-cycles.html))

**Anthropic's finding:** "The most reliable pattern in agentic development is also the least exciting: small, well-scoped tasks with tight human feedback loops consistently outperform ambitious autonomous workflows."

([Agentic Coding Patterns](https://claude.ai/public/artifacts/c5d52fba-e13a-4d50-b971-d2144b2a14bb))

**Relevance to ViewGraph:** The autonomous ViewGraph doesn't replace the human feedback loop — it augments the observe phase. Instead of the agent manually calling `list_captures` → `get_page_summary` → `compare_captures`, the observe phase is pre-populated with a diff summary. The agent still decides whether to act.

### 5.6 Vercel Dev3000

Vercel's `dev3000` project captures "your web app's complete development timeline — server logs, browser events, console messages, network requests, and automatic screenshots — in a unified, timestamped feed for AI debugging."

([dev3000](https://github.com/vercel-labs/dev3000))

This is the closest existing art to the autonomous ViewGraph + TracePulse vision: a unified timeline of backend and frontend events. The key difference is that dev3000 is a standalone tool, while ViewGraph + TracePulse are MCP servers that integrate with any agent.

### 5.7 Playwright MCP

Playwright MCP provides browser automation via structured accessibility snapshots. It emphasizes "structuring interactions through accessibility snapshots rather than pixel-based visuals." Cloudflare's hosted version adds session recording and "Live View" for human-in-the-loop monitoring.

([Playwright MCP](https://playwright.dev/mcp/introduction))
([Cloudflare Playwright MCP](https://developers.cloudflare.com/browser-rendering/playwright/playwright-mcp/))

**Relevance:** Playwright MCP doesn't have a "watch mode" — it's request-response like Chrome DevTools MCP. But Cloudflare's "Live View" feature (human sees what the agent sees in real-time) is a UX pattern worth considering for ViewGraph's autonomous mode.

---

## 6. Token Budget Concerns

### 6.1 The O(N²) Problem

Naive agent loops compound token costs at O(N²) because LLM APIs bill for the entire conversation history on every call. A 10-step agent run sends the full history 10 times. Each autonomous notification adds to this history.

([AI Agent Loop Token Costs](https://www.augmentcode.com/guides/ai-agent-loop-token-cost-context-constraints))

The "Context Bloat" problem is well-documented: "As interaction history grows, computational costs explode, latency increases, and reasoning capabilities degrade due to distraction by irrelevant past errors."

([Autonomous Memory Management in LLM Agents](https://arxiv.org/html/2601.07190))

### 6.2 How TracePulse Manages Token Budget

From the TracePulse deep research:

1. **Signal scoring**: Each error gets a numeric score. Only high-score events are surfaced. This is the primary filter — most events never reach the agent.

2. **Fingerprint deduplication**: Errors are hashed. "This error occurred 47 times" is one message, not 47. The counter increments; the context doesn't grow.

3. **Tool description audit**: TracePulse keeps tool definitions under 1K tokens. "A naive TracePulse install that adds 5K tokens of tool definitions to every agent message is a competitive liability no matter how good the underlying signal is."

4. **Dynamic toolsets**: Less-frequent tools are loaded on demand rather than registered upfront, reducing the per-request overhead.

5. **Pre-assembled prompt context**: `get_prompt_context(error_id)` returns a token-budgeted block ready for the agent, rather than requiring multiple tool calls.

### 6.3 ViewGraph's Existing Token Efficiency

ViewGraph v3 already has aggressive token optimization:

| Optimization | Measured Impact |
|---|---|
| Action Manifest | 80-85% reduction on interactive queries |
| Style dedup | 50% dedup rate across 175 captures |
| Default omission | 41.8% of style values removed |
| Container merging | 30-50% fewer nodes |
| observationDepth | 96% reduction at interactive-only |
| File-backed receipts | 99.8% reduction on transmission |
| JSON Patch diffs | 50-1500x compression |

### 6.4 Token Budget for Autonomous Mode

The autonomous mode needs a new optimization layer: **diff summaries**. Instead of sending the full diff, send a structured summary:

**Compact summary format (~100-150 tokens):**
```json
{
  "trigger": "hmr",
  "timestamp": "2026-05-01T02:15:00Z",
  "changes": {
    "elements_added": 2,
    "elements_removed": 1,
    "attributes_changed": 3,
    "text_changed": 1
  },
  "significance": {
    "score": 15,
    "reasons": ["new button without testid", "aria-label removed from input"]
  },
  "a11y_delta": { "new_issues": 1, "resolved_issues": 0 },
  "capture_file": "viewgraph-localhost-2026-05-01T021500.json"
}
```

**Token budget tiers:**

| Tier | Tokens | Content | When |
|---|---|---|---|
| Silent | 0 | Nothing — change below threshold | Score < 5 |
| Whisper | 50-100 | One-line summary in logging notification | Score 5-10 |
| Summary | 100-200 | Structured change summary | Score 10-20 |
| Alert | 200-500 | Summary + top issues + suggested action | Score > 20 or a11y regression |
| Full | On-demand | Agent calls `get_capture_diff` | Agent decides |

### 6.5 Comparison with Polling Approaches

| Approach | Tokens per check | Checks per minute | Tokens/minute |
|---|---|---|---|
| Poll `take_snapshot` (DevTools MCP) | 500-2000 | 6-12 (every 5-10s) | 3000-24000 |
| Poll `get_page_summary` (ViewGraph) | 500 | 6-12 | 3000-6000 |
| Autonomous diff summary (proposed) | 100-200 | 1-2 (only on change) | 100-400 |
| Autonomous with batching (proposed) | 150-300 | 0.5-1 (batched) | 75-300 |

**The autonomous approach is 10-100x more token-efficient than polling.** This is the core economic argument for event-driven over request-response.

### 6.6 Feasibility Assessment

**High feasibility.** The token budget is manageable. The key insight is that most file saves during development produce either no visible UI change (backend-only changes, CSS tweaks below the significance threshold) or changes that can be summarized in <200 tokens. The agent only pays full token cost when it decides to investigate further.

---

## 7. User Control

### 7.1 The Opt-In Principle

Autonomous monitoring must be explicitly opt-in. Users who install ViewGraph for manual annotation should never be surprised by background captures consuming resources.

### 7.2 How Other Tools Handle Autonomous vs Manual Modes

**LogRocket / Sentry Session Replay:** Always-on by default (it's the product's purpose), but with sample rates. `replaysSessionSampleRate: 0.1` means only 10% of sessions are recorded. Users configure the rate, not individual sessions.

**BrowserTools MCP:** Fully manual. The agent asks for data; the extension provides it. No background monitoring.

**Chrome DevTools MCP:** Fully manual. Tools are request-response. No watch mode.

**Cursor Debug Mode:** Activated by the agent when debugging. The agent instruments code, captures logs, and generates hypotheses. The user triggers it by asking the agent to debug.

**TracePulse:** Always-on once started. It watches the dev server log continuously. The user starts it by running the MCP server; stopping it stops the monitoring. The "always-on" model works because log tailing has near-zero overhead.

**Vite/webpack HMR:** Always-on during development. The dev server watches files and pushes updates. No opt-in per change — the developer opted in by running the dev server.

### 7.3 Proposed UX for ViewGraph Watch Mode

**Three modes, progressive activation:**

| Mode | Activation | Behavior | Overhead |
|---|---|---|---|
| **Manual** (default) | Click toolbar icon | Capture on demand only | Zero when idle |
| **Auto-capture** (existing) | Toggle in Inspect tab | Capture on HMR + DOM mutations | Low (MutationObserver + debounce) |
| **Watch mode** (new) | Toggle in Inspect tab or agent command | Auto-capture + diff + MCP notifications | Low-medium (adds server-side diffing) |

**Watch mode activation paths:**

1. **From extension UI:** Toggle "WATCH MODE" in the Inspect tab. Green pulsing indicator shows it's active. Settings persist per-tab via `chrome.storage.local`.

2. **From agent:** Agent calls a new `start_watch` tool with optional parameters:
   ```json
   {
     "url_filter": "localhost:5173",
     "significance_threshold": 10,
     "notification_tier": "summary",
     "batch_window_ms": 10000
   }
   ```

3. **From TracePulse integration:** When TracePulse detects a hot-reload, it could signal ViewGraph to capture. This requires the cross-tool communication channel described in the TracePulse integration idea doc.

**Watch mode deactivation:**
- User toggles off in extension UI
- Agent calls `stop_watch`
- Tab is closed
- Page navigates away from watched URL
- Automatic timeout after 30 minutes of no changes (configurable)

### 7.4 Notification Preferences

Users (or agents) should be able to configure what triggers a notification:

```json
{
  "watch_config": {
    "notify_on_a11y_regression": true,
    "notify_on_layout_break": true,
    "notify_on_missing_testid": false,
    "notify_on_structural_change": true,
    "significance_threshold": 10,
    "batch_window_ms": 10000,
    "max_notifications_per_minute": 3,
    "quiet_after_minutes": 30
  }
}
```

### 7.5 Feasibility Assessment

**High feasibility.** The UX is straightforward — it's an extension of the existing auto-capture toggle. The agent-side activation via `start_watch` / `stop_watch` tools is a natural addition to the MCP tool set.

---

## 8. Recommended Architecture

### 8.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Extension)                                              │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ MutationObs.  │    │ HMR Listener │    │ Signal Scorer│       │
│  │ (existing)    │───►│ (existing)   │───►│ (NEW)        │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│                                                  │               │
│                                          Score > threshold?      │
│                                            │ yes      │ no       │
│                                            ▼          ▼          │
│                                     ┌──────────┐  (suppress)    │
│                                     │ Capture   │               │
│                                     │ + Push    │               │
│                                     └─────┬────┘               │
│                                           │                     │
└───────────────────────────────────────────┼─────────────────────┘
                                            │ HTTP POST
                                            ▼
┌───────────────────────────────────────────────────────────────┐
│ ViewGraph MCP Server                                           │
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ HTTP Receiver │───►│ Diff Engine  │───►│ Notification │     │
│  │ (existing)    │    │ (existing)   │    │ Emitter (NEW)│     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
│                                                  │             │
│                              ┌───────────────────┼─────┐       │
│                              │ Batcher (NEW)     │     │       │
│                              │ - 10s window      │     │       │
│                              │ - Dedup empty diffs│     │       │
│                              │ - Token budget     │     │       │
│                              └───────────────────┼─────┘       │
│                                                  │             │
│                                    MCP notification (stdio)    │
│                                                  │             │
└──────────────────────────────────────────────────┼─────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────┐
│ Agent (Kiro / Claude Code / Cursor)                           │
│                                                               │
│  Receives notification → reads diff summary → decides action  │
│  May call: get_capture_diff, audit_accessibility, find_source │
│  May call: DevTools MCP take_screenshot for visual verify     │
│  May call: TracePulse get_errors for backend correlation      │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 New Components Required

| Component | Location | Effort | Description |
|---|---|---|---|
| Signal Scorer | Extension (`lib/session/`) | 1 week | Scores mutation batches by significance. Filters noise before capture. |
| Notification Emitter | Server (`src/`) | 3-5 days | Emits MCP `notifications/resources/updated` and logging notifications when new captures arrive with non-empty diffs. |
| Batcher | Server (`src/`) | 3-5 days | Batches multiple captures within a time window into a single summary notification. Deduplicates empty diffs. |
| `start_watch` / `stop_watch` tools | Server (`src/tools/`) | 2-3 days | MCP tools for agent-controlled watch mode activation. |
| Watch mode UI | Extension (`lib/sidebar/`) | 2-3 days | Toggle in Inspect tab, status indicator, configuration panel. |
| Diff summary format | Server (`src/`) | 2-3 days | Compact JSON summary of structural changes, a11y delta, significance score. |

**Total estimated effort: 3-4 weeks.**

### 8.3 Implementation Phases

**Phase 1: Foundation (Week 1-2)**
- Signal scorer in extension content script
- Notification emitter in server (emit on new capture with non-empty diff)
- Diff summary format design and implementation
- `start_watch` / `stop_watch` MCP tools

**Phase 2: Intelligence (Week 3)**
- Batcher with configurable time window
- Token budget tiers (silent/whisper/summary/alert)
- A11y regression detection in diff pipeline
- Watch mode UI in extension sidebar

**Phase 3: Integration (Week 4)**
- TracePulse cross-tool signaling (HMR event → ViewGraph capture)
- Agent-side configuration via tool parameters
- Documentation, prompts (`@vg-watch`), steering updates

### 8.4 What NOT to Build

1. **Don't build a full session replay.** rrweb-style recording is a different product. ViewGraph captures structured snapshots, not mutation streams.

2. **Don't try to replace Chrome DevTools MCP.** ViewGraph is perception (what does the page look like?), not interaction (click this button). Keep the separation clean.

3. **Don't auto-fix.** The autonomous mode observes and reports. The agent decides whether to act. ViewGraph should never modify the page or the codebase autonomously.

4. **Don't emit on every mutation.** The signal scorer is the critical component. Without it, the system is worse than manual capture because it floods the agent with noise.

5. **Don't require TracePulse.** The autonomous mode should work standalone. TracePulse integration is an enhancement, not a dependency.

---

## 9. Open Questions

1. **Client support for notifications.** How do Kiro, Claude Code, and Cursor handle unsolicited MCP notifications today? If they ignore them, the notification model degrades to "data is ready when the agent next polls." This is still valuable but less responsive.

2. **Multi-tab watching.** Should ViewGraph watch multiple tabs simultaneously? The extension already captures per-tab. The server would need to route notifications by URL pattern.

3. **Baseline auto-promotion.** When watch mode is active and the developer is satisfied with the current state, should ViewGraph auto-promote the capture to a baseline? This enables automatic regression detection on subsequent changes.

4. **Cross-origin iframes.** ViewGraph can't see inside cross-origin iframes. If a watched page has embedded content, changes there are invisible. Should the notification include a "blind spots" warning?

5. **Performance on large SPAs.** The 2000-element ceiling for auto-capture may be too low for production SPAs. Should watch mode have a separate, higher ceiling with more aggressive filtering?

---

## 10. References

### MCP Specification
- [MCP Resources Spec (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/server/resources)
- [MCP Transports Spec (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [MCP Logging Spec (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/logging)

### Session Replay and DOM Recording
- [rrweb Observer Architecture](https://github.com/rrweb-io/rrweb/blob/master/docs/observer.md)
- [Sentry Session Replay Configuration](https://docs.sentry.io/platforms/javascript/session-replay/configuration/)
- [LogRocket Performance](https://docs.logrocket.com/v1.0/docs/performance)
- [PostHog Session Replay Architecture](https://posthog.com/handbook/engineering/session-replay/session-replay-architecture)

### Browser MCP Tools
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [BrowserTools MCP](https://browsertools.agentdesk.ai/)
- [Playwright MCP](https://playwright.dev/mcp/introduction)
- [Vercel dev3000](https://github.com/vercel-labs/dev3000)

### Autonomous Web Agents
- [WebArena: A Realistic Web Environment](https://arxiv.org/abs/2307.13854)
- [Mind2Web: Towards a Generalist Agent for the Web](https://arxiv.org/abs/2306.06070)
- [ScribeAgent: Towards Specialized Web Agents](https://arxiv.org/abs/2411.15004)
- [An Illusion of Progress? Assessing Web Agents](https://arxiv.org/abs/2504.01382)

### Agentic Loop Patterns
- [Claude Code Agent Loop](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- [Agentic Coding Patterns: What Works vs What Fails](https://claude.ai/public/artifacts/c5d52fba-e13a-4d50-b971-d2144b2a14bb)
- [The Agentic Loop Explained](https://stackviv.ai/blog/agentic-loop-think-act-observe)

### Token Cost and Context Management
- [AI Agent Token Cost Optimization](https://fast.io/resources/ai-agent-token-cost-optimization/)
- [AI Agent Loop Token Costs](https://www.augmentcode.com/guides/ai-agent-loop-token-cost-context-constraints)
- [Autonomous Memory Management in LLM Agents](https://arxiv.org/html/2601.07190)
- [MCP Token Overhead](https://docs.bswen.com/blog/2026-04-24-mcp-token-overhead/)

### ViewGraph Internal
- [Continuous Capture Design Spec](/.kiro/specs/continuous-capture/design.md)
- [TracePulse Integration Ideas](docs/ideas/tracepulse-integration.md)
- [ViewGraph v3 Format Spec](docs/architecture/viewgraph-v3-format-agentic-enhancements.md)
- [TracePulse Deep Research - Competitive Landscape & Roadmap 2026](/home/sourjya/coding/tracepulse/docs/research/agentic-debug-loop-deep-research-2-2026.md)
