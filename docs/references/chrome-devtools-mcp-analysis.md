# Chrome DevTools MCP - Deep Analysis & ViewGraph Enhancement Plan

**Date:** 2026-04-27
**Source:** github.com/ChromeDevTools/chrome-devtools-mcp (v0.23.0, 37.4k stars)
**Related:** [feature-architecture-analysis.md](/home/sourjya/coding/new-ai-dev-tool/docs/ideas/feature-architecture-analysis.md)

---

## 1. Architecture Summary

```
AI Agent (Kiro, Claude, Cursor, etc.)
    | MCP (JSON-RPC over stdio)
    v
chrome-devtools-mcp (Node.js)
    | Puppeteer (CDP WebSocket)
    v
Chrome Browser (launched or connected)
```

34 tools across 8 categories: Input (9), Navigation (6), Emulation (2), Performance (3), Network (2), Debugging (6), Extensions (5), Memory (1).

Built on Puppeteer (not raw CDP). Persistent Chrome profile by default. Page selection model (list_pages -> select_page -> tools target selected page).

## 2. The Snapshot-UID Pattern (Why It Feels Smooth)

The core interaction model:

1. `take_snapshot` returns an accessibility tree with a `uid` per element
2. All interaction tools (`click`, `fill`, `hover`) reference elements by `uid`
3. If an element isn't found, take a fresh snapshot

This is why agents using Chrome DevTools MCP feel smooth - the agent always has a structured, current view of the page state, and every interaction is deterministic (uid-based, not selector-based).

**ViewGraph equivalent:** We already have this pattern:
- `get_page_summary` / `get_capture` = our "snapshot"
- `nid` (node ID) = our "uid"
- But we don't have interaction tools (click, fill) - and we shouldn't. That's Chrome DevTools MCP's domain.

**What we should do:** Make the snapshot -> nid -> action pattern explicit in our tool descriptions and skills. When ViewGraph identifies a broken element, the agent should know to use Chrome DevTools MCP's `click(uid)` to interact with it.

## 3. The Skills System (How Agents Learn Debug Sequences)

### How Skills Are Delivered

This is the key question: "How does DevTools MCP pass skills to Kiro without installing Power files?"

**Answer: It doesn't pass skills to Kiro.** Skills are delivered through agent-specific plugin systems:

| Agent | Delivery Mechanism | Files |
|---|---|---|
| **Claude Code** | `.claude-plugin/plugin.json` + `skills/` directory. Installed via `/plugin marketplace add` | Plugin marketplace |
| **Gemini CLI** | `.gemini/` directory + `gemini-extension.json`. Installed via `gemini extensions install` | Gemini extensions |
| **VS Code Copilot** | Installed as "agent plugin" via Command Palette -> "Chat: Install Plugin From Source" | VS Code plugin system |
| **Kiro** | **No skill delivery mechanism.** Only MCP tools are exposed. Skills are NOT delivered to Kiro. | N/A |

**For Kiro, the skills don't load.** Kiro only sees the 34 MCP tools. The agent has to figure out the workflow from tool descriptions alone. This is why Chrome DevTools MCP works "smoothly" in Claude Code (which has the skills) but may be less smooth in Kiro (which doesn't).

**ViewGraph's advantage:** We already have a skill delivery mechanism for Kiro - our Power package (`power/prompts/`, `power/steering/`, `power/hooks/`). We can ship ViewGraph-specific debug skills that Kiro loads via `viewgraph-init`.

### The 6 Skills

| Skill | What It Teaches |
|---|---|
| `chrome-devtools` | Core workflow: navigate -> wait -> snapshot -> interact. Page selection. Efficient data retrieval. |
| `debug-optimize-lcp` | 5-step LCP debugging recipe with specific tool call sequences |
| `memory-leak-debugging` | Baseline/target/final heap snapshots -> memlab analysis |
| `a11y-debugging` | Lighthouse audit + snapshot inspection + keyboard nav testing |
| `troubleshooting` | Self-diagnosis when the tool has issues |
| `chrome-devtools-cli` | CLI-specific patterns |

**Key insight:** Each skill is a numbered recipe. The agent doesn't improvise - it follows steps. This is what makes "Kiro know debug sequences properly."

## 4. Design Principles Comparison

| Chrome DevTools MCP | ViewGraph | Gap |
|---|---|---|
| Agent-Agnostic API | Same (MCP standard) | None |
| Token-Optimized | Same (summaries, progressive disclosure) | None |
| Small, Deterministic Blocks | Same (38 composable tools) | None |
| Self-Healing Errors | Partial (fuzzy filename matching) | Could improve error messages |
| Human-Agent Collaboration | Same (structured + readable) | None |
| Progressive Complexity | Same (summary -> elements -> full capture) | None |
| Reference over Value | **Gap** - we inline screenshots in metadata | Should return file paths for large assets |

## 5. What ViewGraph Should Borrow

### HIGH Priority

#### 5.1 Skills as Debug Recipes for Kiro

Ship SKILL.md-equivalent files as Kiro Power prompts. We already have `@vg-audit`, `@vg-review`, etc. But we need **orchestration skills** that teach the agent multi-tool sequences:

| New Skill | Sequence |
|---|---|
| `@vg-debug-ui` | `get_page_summary` -> identify issues -> `audit_accessibility` -> `audit_layout` -> for each issue: `find_source` -> fix -> `request_capture` -> `compare_captures` -> verify |
| `@vg-debug-fullstack` | ViewGraph `get_annotations` (UI issues) + Chrome DevTools `list_console_messages` (JS errors) + Chrome DevTools `list_network_requests` (API failures) -> correlate -> fix backend first, then frontend |
| `@vg-perf-audit` | Chrome DevTools `performance_start_trace` -> `performance_analyze_insight` -> ViewGraph `get_page_summary` (DOM size, render-blocking) -> combined recommendations |

The `@vg-debug-fullstack` skill is the **complement story** - it teaches the agent to use ViewGraph AND Chrome DevTools MCP together.

#### 5.2 File Paths for Heavy Output

Chrome DevTools MCP returns file paths for screenshots, traces, and heap snapshots. ViewGraph should do the same for:
- `get_capture` when output > 100KB (already auto-summarizes, but could write to file)
- `compare_screenshots` diff images
- `generate_spec` output

#### 5.3 Explicit Cross-Tool Orchestration in SERVER_INSTRUCTIONS

Update our `SERVER_INSTRUCTIONS` constant to include guidance for using ViewGraph alongside Chrome DevTools MCP:

```
When both ViewGraph and Chrome DevTools MCP are available:
1. Use ViewGraph for: DOM structure, a11y audit, layout audit, annotation review, test generation
2. Use Chrome DevTools MCP for: console errors, network requests, performance traces, page interaction
3. For full-stack debugging: check ViewGraph annotations first (UI issues), then Chrome DevTools console/network (runtime errors)
```

### MEDIUM Priority

#### 5.4 Snapshot -> ID -> Drill-Down Pattern (Make Explicit)

Our tools already follow this pattern but we don't document it:
- `get_page_summary` = snapshot (cheap, ~500 tokens)
- `nid` / `testid` = element identifier
- `get_elements_by_role` / `get_annotation_context` = drill-down

Document this in SERVER_INSTRUCTIONS so agents recognize the progressive disclosure pattern.

#### 5.5 Category Flags

Chrome DevTools MCP uses `--category-performance=false` to disable tool groups. ViewGraph could support:
- `--no-audit` - disable audit tools (for agents that only need capture/annotation)
- `--no-baseline` - disable baseline tools
- `--slim` - only core tools (list_captures, get_capture, get_annotations, resolve_annotation)

#### 5.6 `includeSnapshot` Pattern on Resolve

Chrome DevTools MCP's interaction tools have `includeSnapshot: boolean` to optionally return updated state. ViewGraph's `resolve_annotation` could have `includeCapture: boolean` that triggers a fresh capture after resolution, returning the updated page state in one round-trip.

### LOW Priority (Future)

#### 5.7 Emulation Support

Chrome DevTools MCP's `emulate` tool (dark mode, network throttling, viewport) is powerful for responsive testing. ViewGraph could add a `request_capture` variant that asks the user to capture at a specific viewport or with specific conditions.

#### 5.8 Extension Testing Support

Chrome DevTools MCP can install, reload, and trigger extensions. ViewGraph could detect when it's running as an extension being tested and provide self-diagnostic tools.

## 6. What ViewGraph Should NOT Touch

| Feature | Why Not |
|---|---|
| Input automation (click, fill, drag) | Chrome DevTools MCP owns this |
| Page navigation | Chrome DevTools MCP owns this |
| Performance tracing | Chrome DevTools MCP owns this |
| Console log capture (live) | Chrome DevTools MCP owns this (we capture at snapshot time) |
| Memory snapshots | Chrome DevTools MCP owns this |
| Lighthouse audits | Chrome DevTools MCP owns this (we use axe-core for a11y) |

## 7. The Three-Tool Complement

```
Visual verification:  ViewGraph (DOM state, a11y, layout, annotations, test generation)
Browser verification: Chrome DevTools MCP (console, network, page interaction, performance)
Backend verification: devwatch (server logs, build errors, edit-verify loop)
```

The `@vg-debug-fullstack` skill teaches the agent to use all three in sequence. That's the product story - not three competing tools, but three layers of a complete debugging stack.

## 8. Skill Delivery Strategy

### Multi-Channel Delivery (Do Both)

| Channel | Audience | Mechanism | Friction |
|---|---|---|---|
| **MCP SERVER_INSTRUCTIONS** | All MCP clients | Embedded in server startup, every client reads it | Zero - automatic |
| **MCP prompts/list** | All MCP clients that support prompt discovery | Server exposes prompt templates via MCP spec | Zero - automatic |
| **Kiro Power package** | Kiro users | `viewgraph-init` copies prompts/steering/hooks | One-time setup |
| **Claude plugin** | Claude Code users | `.claude-plugin/` in repo, `/plugin install` | One-time setup |
| **Gemini extension** | Gemini CLI users | `gemini-extension.json`, `gemini extensions install` | One-time setup |

SERVER_INSTRUCTIONS is the baseline that works everywhere. Power is for Kiro-specific features (hooks, steering). Agent-specific plugins are for agents that support them. Don't pick one - layer all three.

### Graceful Degradation in Cross-Tool Skills

Skills must detect available tools and adapt, not assume all tools are present:

```markdown
@vg-debug-fullstack:

1. Check available tools:
   - ViewGraph tools present? -> use for DOM/a11y/layout
   - Chrome DevTools MCP tools present? -> use for console/network/performance
   - devwatch tools present? -> use for server logs/build errors

2. Use what's available:
   - All three: full-stack sequence (backend -> browser -> visual)
   - ViewGraph only: DOM-focused debug (annotations -> audit -> fix -> verify)
   - ViewGraph + Chrome DevTools: frontend debug (console -> DOM -> fix)
   - ViewGraph + devwatch: backend-aware UI debug (server errors -> UI correlation)
```

The agent already knows which MCP tools are connected. Skills say "if you have X, use it for Y" rather than "call X." This means `@vg-debug-ui` (ViewGraph-only) is the primary skill that always works, and `@vg-debug-fullstack` enhances progressively as more tools are available.

## 9. Implementation Plan

### Phase 1: Skills (1-2 days)

1. Create `power/prompts/vg-debug-ui.md` - UI debugging recipe
2. Create `power/prompts/vg-debug-fullstack.md` - cross-tool orchestration
3. Update `SERVER_INSTRUCTIONS` with cross-tool guidance
4. Update `viewgraph-init` to install new prompts

### Phase 2: Progressive Disclosure (1 day)

1. Add `filePath` parameter to `get_capture` for writing large captures to disk
2. Document the snapshot -> id -> drill-down pattern in SERVER_INSTRUCTIONS

### Phase 3: Tool Surface (1 day)

1. Add `--slim` mode (core tools only)
2. Add `includeCapture` to `resolve_annotation`

### Phase 4: Cross-Tool Testing (ongoing)

1. Test ViewGraph + Chrome DevTools MCP together in Kiro
2. Verify the `@vg-debug-fullstack` skill works end-to-end
3. Document the three-tool setup in GitBook
