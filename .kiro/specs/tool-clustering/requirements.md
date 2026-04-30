# Tool Clustering + Progressive Disclosure - Requirements

Based on [MCP Tooling Research](../../../docs/references/mcp-tooling-research--the-case-for-rearchitecting-tracepulse-and-viewgraph.md), arXiv 2603.20313 (99.6% schema token reduction at 97.1% tool accuracy), and Speakeasy Dynamic Toolsets.

## Problem

ViewGraph registers 41 MCP tools. At ~200 tokens per tool schema, that's ~8,200 tokens injected into the agent's context on every turn -- regardless of whether those tools are relevant to the current task. Over a 25-turn session, that's ~205,000 tokens of schema overhead.

Most tasks only need 3-8 tools. An annotation review needs `list_captures`, `get_annotations`, `find_source`, `resolve_annotation`. A regression check needs `compare_captures`, `compare_screenshots`, `compare_baseline`. Exposing all 41 tools when only 5 are needed wastes context and can confuse tool selection.

## User Stories

### US-1: Clustered tool registration
As an MCP server, I want to group my 41 tools into 5-6 workflow clusters, so that agents only see tools relevant to their current task.

**Acceptance criteria:**
- Tools grouped into clusters: Capture, Audit, Compare, Annotate, Session, Admin
- Each cluster registered as a single "gateway" tool (e.g., `vg_capture` exposes `list_captures`, `get_capture`, `get_page_summary`, etc.)
- Agent calls the gateway with a sub-action parameter to invoke specific tools
- Total schema tokens reduced from ~8,200 to ~1,200 (6 gateway tools x ~200 tokens)
- 85%+ schema token reduction

### US-2: Progressive disclosure via gateway tools
As an agent, when I call a gateway tool without a sub-action, I want to receive a list of available sub-actions with brief descriptions, so I can discover capabilities without loading all schemas upfront.

**Acceptance criteria:**
- Calling `vg_capture` with no arguments returns the list of capture-related tools
- Each sub-action listed with name, one-line description, and required params
- Agent can then call `vg_capture` with `action: "get_page_summary"` and the relevant params
- Discovery response is < 500 tokens

### US-3: Backward compatibility
As an existing user, I want the option to register all 41 tools individually (flat mode), so that existing workflows and prompts don't break.

**Acceptance criteria:**
- Environment variable `VG_TOOL_MODE=flat|clustered` (default: `clustered`)
- `flat` mode registers all 41 tools individually (current behavior)
- `clustered` mode registers 6 gateway tools
- All existing tool names work in both modes
- No breaking change for existing users

### US-4: Token audit logging
As a developer, I want to see how many schema tokens ViewGraph contributes per session, so I can measure the impact of clustering.

**Acceptance criteria:**
- Server logs total schema tokens at startup: "Registered N tools (~X tokens)"
- Comparison logged when switching modes: "Clustered mode: ~1,200 tokens (vs ~8,200 flat)"

## Non-Functional Requirements

- Zero latency increase for tool calls (gateway dispatch is in-process)
- No new dependencies
- Cluster definitions in a config file, not hardcoded
- Works with all MCP-compatible agents (Kiro, Claude Code, Cursor, etc.)

## Out of Scope

- Semantic embedding-based cluster pre-warming (future)
- Cross-server clustering (TracePulse + ViewGraph combined)
- MCP protocol changes (works within current spec)

## Proposed Clusters

| Cluster | Gateway Tool | Tools Included | Count |
|---------|-------------|----------------|-------|
| Capture | `vg_capture` | list_captures, get_capture, get_latest_capture, get_page_summary, get_capture_diff, get_capture_history, get_capture_stats, request_capture, get_request_status, validate_capture | 10 |
| Audit | `vg_audit` | audit_accessibility, audit_layout, find_missing_testids, get_component_coverage, get_fidelity_report, get_elements_by_role, get_interactive_elements, verify_fix | 8 |
| Compare | `vg_compare` | compare_captures, compare_screenshots, compare_styles, compare_baseline, check_consistency, set_baseline, list_baselines | 7 |
| Annotate | `vg_annotate` | get_annotations, get_annotation_context, get_unresolved, resolve_annotation, diff_annotations, check_annotation_status, detect_recurring_issues, analyze_patterns, generate_spec | 9 |
| Session | `vg_session` | get_session_status, list_sessions, get_session, analyze_journey, visualize_flow, list_archived | 6 |
| Source | `vg_source` | find_source | 1 |

Total: 6 gateways covering 41 tools.
