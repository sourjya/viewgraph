# Kiro Power (Hooks & Prompts)

When you run `npx viewgraph-init` in a Kiro project, ViewGraph installs hooks, prompts, and steering docs that automate common workflows. These work in both Kiro IDE and Kiro CLI.

## Hooks (3)

| Hook | Trigger | What it does |
|---|---|---|
| **Capture and Audit Page** | Manual (IDE sidebar) or `@vg-audit` (CLI) | Captures the current page, runs a11y audit, checks for missing testids. Summarizes all issues by severity. |
| **Fix ViewGraph Annotations** | Manual (IDE sidebar) or `@vg-review` (CLI) | Pulls unresolved annotations, maps them to source files, implements fixes in sequence, marks each resolved. |
| **Check TestID Coverage** | Auto on UI file edit | When you edit `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, or `.css` files, checks if interactive elements in recent captures are missing `data-testid`. |

## Prompt Shortcuts (8)

In Kiro CLI, type `@vg` then Tab to see all shortcuts:

| Shortcut | Workflow |
|---|---|
| `@vg-audit` | Full audit: a11y + layout + testids |
| `@vg-review` | Fix all annotations from latest capture |
| `@vg-capture` | Request fresh capture, summarize result |
| `@vg-diff` | Compare two most recent captures |
| `@vg-testids` | Find and add missing data-testid attributes |
| `@vg-a11y` | Deep a11y audit with automatic source fixes |
| `@vg-tests` | Generate Playwright E2E tests from capture |
| `@vg-help` | List all ViewGraph tools with explanations |

## Steering Docs (3)

Installed to `.kiro/steering/` to guide the agent's behavior:

| Doc | Purpose |
|---|---|
| `viewgraph-workflow.md` | When and how to use captures, annotations, and verification |
| `viewgraph-resolution.md` | How to resolve annotations with correct action types and summaries |
| `viewgraph-hostile-dom.md` | How to handle degraded captures, empty pages, and hostile DOM conditions |

## Other Agents

ViewGraph works with any MCP-compatible agent via the standard MCP protocol. The 34 tools are the same regardless of agent. Dedicated Power packages for Claude Code, Cursor, Windsurf, and Cline are planned.
