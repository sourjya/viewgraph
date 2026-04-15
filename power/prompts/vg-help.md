---
description: "Show all ViewGraph tools with plain-English explanations"
---

# @vg-help

List all ViewGraph MCP tools grouped by category. REPORT ONLY - do not call any tools except list_captures for connectivity check.

1. Call `list_captures` to verify the server is connected. If it fails, tell the user: "ViewGraph server not connected. Run `npx viewgraph-init` from your project folder."
2. Present all 36 tools in this format:

### Core
| Tool | What it does | When to use it |
|---|---|---|

### Analysis
| Tool | What it does | When to use it |
|---|---|---|

### Annotations
| Tool | What it does | When to use it |
|---|---|---|

### Comparison
| Tool | What it does | When to use it |
|---|---|---|

### Sessions
| Tool | What it does | When to use it |
|---|---|---|

### Source & Quality
| Tool | What it does | When to use it |
|---|---|---|

### Agent-to-Browser
| Tool | What it does | When to use it |
|---|---|---|

3. After the tables, list the available prompt shortcuts:

**Shortcuts:** @vg-audit (report), @vg-a11y (fix a11y), @vg-review (fix annotations), @vg-capture (capture page), @vg-diff (compare), @vg-testids (add testids), @vg-tests (generate tests), @vg-help (this list)
