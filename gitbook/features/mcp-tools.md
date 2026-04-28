# 41 MCP Tools

Your agent discovers these automatically. You don't call them - you describe what you want and the agent picks the right tool.

> "Fix the annotations from my last review" → agent calls `get_unresolved`, `get_annotation_context`, `find_source`, then `resolve_annotation` for each fix.

![Kiro using ViewGraph MCP tools](../.gitbook/assets/mcp-tools-kiro.png)

---

{% tabs %}

{% tab title="All" %}

**Core (5)**

| Tool | What the agent does with it |
|---|---|
| `list_captures` | Find captures by URL, date, or count |
| `get_capture` | Read full DOM structure of a page |
| `get_latest_capture` | Quick access to the most recent capture |
| `get_page_summary` | Lightweight overview before loading full capture |
| `get_session_status` | Check what data is available before choosing tools |

**Analysis (8)**

| Tool | What the agent does with it |
|---|---|
| `get_elements_by_role` | Find all buttons, links, inputs, headings, etc. |
| `get_interactive_elements` | List every clickable/editable element with selectors |
| `find_missing_testids` | Identify elements that need data-testid for testing |
| `audit_accessibility` | Run 100+ WCAG rules via axe-core |
| `audit_layout` | Detect overflow, overlap, and viewport issues |
| `compare_captures` | Diff two captures for structural changes |
| `get_annotations` | Read human feedback from review sessions |
| `get_annotation_context` | Get full DOM context around annotated elements |

**Bidirectional (3)**

| Tool | What the agent does with it |
|---|---|
| `request_capture` | Ask the user to capture a specific page |
| `get_request_status` | Check if the user accepted the capture request |
| `get_fidelity_report` | Verify capture accuracy against HTML snapshot |

**Baseline & Regression (3)**

| Tool | What the agent does with it |
|---|---|
| `set_baseline` | Save a capture as the golden reference |
| `compare_baseline` | Detect regressions against the baseline |
| `list_baselines` | See all stored baselines |

**Annotation Intelligence (7)**

| Tool | What the agent does with it |
|---|---|
| `resolve_annotation` | Mark issues as fixed, wontfix, duplicate, or invalid |
| `get_unresolved` | Find all open issues across captures |
| `check_annotation_status` | Check if old issues are still present in new captures |
| `diff_annotations` | Track which issues persist across deploys |
| `detect_recurring_issues` | Find elements that keep getting flagged |
| `analyze_patterns` | Generate recommendations from resolved issues |
| `generate_spec` | Turn annotations into Kiro specs (requirements + tasks) |

**Session & Journey (5)**

| Tool | What the agent does with it |
|---|---|
| `list_sessions` | Find recorded user journeys |
| `get_session` | Replay a multi-step flow |
| `analyze_journey` | Check for issues across journey steps |
| `visualize_flow` | Generate Mermaid state diagram from a session |
| `get_capture_stats` | Aggregate stats across all captures |

**Source & Quality (6)**

| Tool | What the agent does with it |
|---|---|
| `find_source` | Map a DOM element to its source file and line number |
| `check_consistency` | Detect style drift across pages |
| `compare_screenshots` | Pixel-by-pixel visual regression check |
| `compare_styles` | Diff computed CSS of an element between captures |
| `get_component_coverage` | Report testid coverage per framework component |
| `validate_capture` | Check capture quality (empty pages, missing data) |

**Verification (3)**

| Tool | What the agent does with it |
|---|---|
| `verify_fix` | One-call smoke test: a11y + layout + console + network + regressions |
| `get_capture_history` | Group captures by URL into timelines with change tracking |
| `get_capture_diff` | RFC 6902 JSON Patch between sequential captures (50-1500x smaller) |

{% endtab %}

{% tab title="Core (5)" %}
| Tool | What the agent does with it |
|---|---|
| `list_captures` | Find captures by URL, date, or count |
| `get_capture` | Read full DOM structure of a page |
| `get_latest_capture` | Quick access to the most recent capture |
| `get_page_summary` | Lightweight overview before loading full capture |
| `get_session_status` | Check what data is available before choosing tools |
{% endtab %}

{% tab title="Analysis (8)" %}
| Tool | What the agent does with it |
|---|---|
| `get_elements_by_role` | Find all buttons, links, inputs, headings, etc. |
| `get_interactive_elements` | List every clickable/editable element with selectors |
| `find_missing_testids` | Identify elements that need data-testid for testing |
| `audit_accessibility` | Run 100+ WCAG rules via axe-core |
| `audit_layout` | Detect overflow, overlap, and viewport issues |
| `compare_captures` | Diff two captures for structural changes |
| `get_annotations` | Read human feedback from review sessions |
| `get_annotation_context` | Get full DOM context around annotated elements |
{% endtab %}

{% tab title="Annotations (7)" %}
| Tool | What the agent does with it |
|---|---|
| `resolve_annotation` | Mark issues as fixed, wontfix, duplicate, or invalid |
| `get_unresolved` | Find all open issues across captures |
| `check_annotation_status` | Check if old issues are still present in new captures |
| `diff_annotations` | Track which issues persist across deploys |
| `detect_recurring_issues` | Find elements that keep getting flagged |
| `analyze_patterns` | Generate recommendations from resolved issues |
| `generate_spec` | Turn annotations into Kiro specs (requirements + tasks) |
{% endtab %}

{% tab title="Regression (6)" %}
| Tool | What the agent does with it |
|---|---|
| `set_baseline` | Save a capture as the golden reference |
| `compare_baseline` | Detect regressions against the baseline |
| `list_baselines` | See all stored baselines |
| `request_capture` | Ask the user to capture a specific page |
| `get_request_status` | Check if the user accepted the capture request |
| `get_fidelity_report` | Verify capture accuracy against HTML snapshot |
{% endtab %}

{% tab title="Source (6)" %}
| Tool | What the agent does with it |
|---|---|
| `find_source` | Map a DOM element to its source file and line number |
| `check_consistency` | Detect style drift across pages |
| `compare_screenshots` | Pixel-by-pixel visual regression check |
| `compare_styles` | Diff computed CSS of an element between captures |
| `get_component_coverage` | Report testid coverage per framework component |
| `validate_capture` | Check capture quality (empty pages, missing data) |
{% endtab %}

{% tab title="Sessions (5)" %}
| Tool | What the agent does with it |
|---|---|
| `list_sessions` | Find recorded user journeys |
| `get_session` | Replay a multi-step flow |
| `analyze_journey` | Check for issues across journey steps |
| `visualize_flow` | Generate Mermaid state diagram from a session |
| `get_capture_stats` | Aggregate stats across all captures |
{% endtab %}

{% endtabs %}

---

## MCP Prompts Discovery

The server exposes all 11 prompt shortcuts via the MCP `prompts/list` capability. Any MCP-compatible agent can discover available prompts automatically - no manual configuration or documentation lookup needed. When your agent connects, it sees `vg-review`, `vg-audit`, `vg-debug-ui`, and all other shortcuts as first-class prompt templates with parameter schemas.

---

## New Tool Parameters

Recent additions to existing tools:

| Tool | Parameter | What it does |
|---|---|---|
| `get_capture` | `filePath` | Write capture JSON to a file path instead of returning inline - saves context window tokens on large captures |
| `compare_screenshots` | `filePath` | Write the diff image to a file path and return the path |
| `resolve_annotation` | `includeCapture` | When `true`, triggers a fresh capture request after resolution and returns the request ID for verification |

---

## Slim Mode

For lightweight setups that only need basic browser context, start the server with `--slim`:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core", "--slim"] }
  }
}
```

Slim mode exposes 9 core tools: `list_captures`, `get_capture`, `get_latest_capture`, `get_page_summary`, `get_session_status`, `audit_accessibility`, `audit_layout`, `find_missing_testids`, and `get_interactive_elements`. All other tools are hidden. This reduces tool discovery noise for agents that only need basic page inspection.
