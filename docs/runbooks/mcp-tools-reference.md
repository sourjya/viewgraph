# ViewGraph MCP Tools - Quick Reference

31 tools in 6 categories. Ask your AI agent to run any of these.

---

## Discovery - "What captures do I have?"

| Tool | What it does | When to use |
|---|---|---|
| `list_captures` | Shows all saved page captures, newest first | "Show me my captures" or "Do I have a capture of the login page?" |
| `get_capture` | Gets the full DOM snapshot for one capture | "Show me everything about this page" |
| `get_latest_capture` | Gets the most recent capture (auto-summarizes if large) | "What does my page look like right now?" |
| `get_page_summary` | Quick overview: element counts, layout, styles, clusters | "Give me a quick summary of this page" |

## Auditing - "What's wrong with my page?"

| Tool | What it does | When to use |
|---|---|---|
| `audit_accessibility` | Checks for a11y issues: missing labels, alt text, contrast. Includes axe-core (100+ WCAG rules) when available | "Run an accessibility audit" |
| `audit_layout` | Finds layout bugs: elements overflowing containers, siblings overlapping, things off-screen | "Are there any layout issues?" |
| `find_missing_testids` | Lists interactive elements without `data-testid` and suggests IDs | "Which elements need test IDs?" |
| `get_elements_by_role` | Filters elements by type: buttons, links, inputs, headings, images, tables, nav, forms | "Show me all the buttons on this page" |
| `get_interactive_elements` | All clickable/editable elements with their selectors and labels | "What can users interact with?" |
| `find_source` | Finds which source file renders a DOM element (searches by testid, label, selector, or text) | "Where in my code is this button defined?" |
| `check_consistency` | Compares the same element across multiple pages to find style drift | "Is my header consistent across all pages?" |

## Annotations - "What did the reviewer flag?"

| Tool | What it does | When to use |
|---|---|---|
| `get_annotations` | Returns all human annotations (comments, severity, category) from a capture | "What issues were flagged on this page?" |
| `get_annotation_context` | Same as above but includes the full DOM context around each annotated element | "Show me the flagged issues with full context" |
| `get_unresolved` | All open (unfixed) annotations across all captures | "What's still broken?" |
| `resolve_annotation` | Marks an annotation as fixed/wontfix/duplicate/invalid with a summary | "Mark this issue as fixed" |
| `check_annotation_status` | Compares old annotations against a new capture to see what's still relevant | "Are these old annotations still valid?" |
| `diff_annotations` | Compares annotations across captures to track persistent vs new vs resolved issues | "Which bugs keep coming back?" |
| `detect_recurring_issues` | Scans all captures to find UI elements flagged repeatedly (hot spots) | "What parts of the UI keep breaking?" |
| `generate_spec` | Converts annotations into a Kiro spec (requirements.md + tasks.md) | "Turn these review notes into a spec" |
| `analyze_patterns` | Analyzes resolved annotations to detect recurring patterns and recommend fixes | "What types of issues do we keep having?" |

## Comparison - "What changed?"

| Tool | What it does | When to use |
|---|---|---|
| `compare_captures` | Diffs two captures: added/removed elements, layout shifts, testid changes | "What changed between these two versions?" |
| `compare_screenshots` | Pixel-by-pixel PNG comparison with diff percentage and verdict | "Are there visual differences between these screenshots?" |
| `set_baseline` | Saves a capture as the "known good" state for a page | "This page looks correct - save it as baseline" |
| `compare_baseline` | Compares current capture against the saved baseline | "Did my changes break anything?" |
| `list_baselines` | Shows all saved baselines | "Which pages have baselines?" |
| `get_fidelity_report` | Measures how complete a capture is compared to the actual HTML | "How accurate is this capture?" |

## Agent-to-Browser - "Capture this page for me"

| Tool | What it does | When to use |
|---|---|---|
| `request_capture` | Asks the browser extension to capture a page (user sees a notification) | "I need a fresh capture of the login page" |
| `get_request_status` | Checks if the capture request was fulfilled | "Did the browser capture my page yet?" |

## Sessions - "Walk me through this flow"

| Tool | What it does | When to use |
|---|---|---|
| `list_sessions` | Shows recorded multi-step user flows | "What user flows have been captured?" |
| `get_session` | Full step-by-step detail of a recorded flow with diffs between steps | "Show me the checkout flow step by step" |
| `visualize_flow` | Builds a Mermaid state diagram from session captures showing what changes at each step | "Show me the login flow as a state machine" |

---

## Common Workflows

**"Fix all the UI issues"**
```
get_unresolved -> for each: get_annotation_context -> find_source -> fix -> resolve_annotation
```

**"Full page audit"**
```
get_latest_capture -> audit_accessibility + audit_layout + find_missing_testids
```

**"Did my fix work?"**
```
request_capture (verify) -> compare_captures (before vs after)
```

**"Is my design system consistent?"**
```
list_captures -> check_consistency (pick captures from different pages)
```
