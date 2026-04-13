# MCP Tools (34)

ViewGraph exposes 34 tools to your AI agent via the Model Context Protocol. The agent discovers them automatically - you don't call them directly.

![ViewGraph sidebar with annotations](../.gitbook/assets/sidebar-annotations.png)

## Core (4 tools)

| Tool | Description |
|---|---|
| `list_captures` | List available captures with URL filter and limit |
| `get_capture` | Retrieve full capture JSON by filename |
| `get_latest_capture` | Most recent capture (summary if >100KB) |
| `get_page_summary` | Compact summary: URL, title, viewport, element counts, clusters |

## Analysis (8 tools)

| Tool | Description |
|---|---|
| `get_elements_by_role` | Filter nodes by role: buttons, links, inputs, headings, etc. |
| `get_interactive_elements` | All clickable/editable elements with selectors and labels |
| `find_missing_testids` | Interactive elements lacking data-testid, with suggestions |
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels, contrast ratios, axe-core results |
| `audit_layout` | Layout audit: element overflow, sibling overlap, viewport overflow |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotation_context` | Capture filtered to annotated nodes + comments |

## Bidirectional (3 tools)

| Tool | Description |
|---|---|
| `request_capture` | Request a capture from the browser extension |
| `get_request_status` | Poll for capture request completion |
| `get_fidelity_report` | Compare capture against HTML snapshot for fidelity metrics |

## Baseline and Regression (3 tools)

| Tool | Description |
|---|---|
| `set_baseline` | Promote a capture to golden baseline for its URL |
| `compare_baseline` | Diff latest capture vs baseline - detect structural regressions |
| `list_baselines` | List all stored baselines with metadata |

## Annotation Intelligence (7 tools)

| Tool | Description |
|---|---|
| `resolve_annotation` | Mark annotation as fixed/wontfix/duplicate/invalid |
| `get_unresolved` | Unresolved annotations from one or all captures |
| `check_annotation_status` | Compare annotations against newer capture to detect resolved issues |
| `diff_annotations` | Track persistent issues across multiple captures |
| `detect_recurring_issues` | Find UI elements flagged repeatedly across captures |
| `analyze_patterns` | Detect recurring issue patterns from resolved annotations |
| `generate_spec` | Generate Kiro spec (requirements + tasks) from annotations |

## Session and Journey (5 tools)

| Tool | Description |
|---|---|
| `list_sessions` | List capture sessions (grouped user journeys) |
| `get_session` | Full step sequence for a capture session |
| `analyze_journey` | Analyze recorded user journey for issues across steps |
| `visualize_flow` | Build Mermaid state machine diagram from session |
| `get_capture_stats` | Aggregate statistics across all captures |

## Source and Quality (4 tools)

| Tool | Description |
|---|---|
| `find_source` | Find source file that renders a DOM element (testid, label, selector, React fiber) |
| `check_consistency` | Compare elements across pages for style inconsistencies |
| `compare_screenshots` | Pixel-by-pixel screenshot comparison |
| `validate_capture` | Check capture for quality issues (empty pages, missing data) |
