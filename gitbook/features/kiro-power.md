# Kiro Power (Hooks & Prompts)

When you run `viewgraph-init` in a Kiro project, ViewGraph installs hooks, prompts, and steering docs that automate common workflows.

## Kiro IDE vs Kiro CLI

ViewGraph workflows are available in both environments, but the invocation is different.

### Kiro IDE - Use Hooks (sidebar)

In Kiro IDE, use the **Hooks panel** in the sidebar. Click a hook to run it. Do **not** type `@vg-review` in the IDE chat - Kiro IDE interprets the `@` as a spec reference and prompts you to create a new spec.

| How to run | Where |
|---|---|
| Open Hooks panel in sidebar | Click the hook name to trigger it |
| Or type the workflow name in chat **without `@`** | e.g., `vg-review`, `vg-audit` |

<!-- Screenshot: Kiro IDE hooks panel with ViewGraph hooks will be added here -->

### Kiro CLI - Use `@` Prompt Shortcuts

In Kiro CLI, type `@vg` then Tab to see all shortcuts. The `@` prefix triggers prompt expansion.

```
@vg-review    # Fix all annotations
@vg-audit     # Full a11y + layout audit
@vg-ideate    # Generate specs from ideas
```

<!-- Screenshot: Kiro CLI @vg tab completion will be added here -->

### Quick Reference

| Workflow | Kiro IDE | Kiro CLI |
|---|---|---|
| Fix annotations | Hooks panel → "Fix ViewGraph Annotations" | `@vg-review` |
| Full audit | Hooks panel → "Capture and Audit Page" | `@vg-audit` |
| Deep a11y fix | Type `vg-a11y` in chat | `@vg-a11y` |
| Generate tests | Type `vg-tests` in chat | `@vg-tests` |
| Generate specs from ideas | Type `vg-ideate` in chat | `@vg-ideate` |
| Compare captures | Type `vg-diff` in chat | `@vg-diff` |
| Request capture | Type `vg-capture` in chat | `@vg-capture` |
| Add missing testids | Type `vg-testids` in chat | `@vg-testids` |
| List all tools | Type `vg-help` in chat | `@vg-help` |
| Debug UI issues | Type `vg-debug-ui` in chat | `@vg-debug-ui` |
| Full-stack debug | Type `vg-debug-fullstack` in chat | `@vg-debug-fullstack` |

---

## Hooks (3)

| Hook | Trigger | What it does |
|---|---|---|
| **Capture and Audit Page** | IDE sidebar or `@vg-audit` (CLI) | Captures the current page, runs a11y audit, checks for missing testids. Summarizes all issues by severity. |
| **Fix ViewGraph Annotations** | IDE sidebar or `@vg-review` (CLI) | Pulls unresolved annotations, maps them to source files, implements fixes in sequence, marks each resolved. |
| **Check TestID Coverage** | Auto on UI file edit | When you edit `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, or `.css` files, checks if interactive elements in recent captures are missing `data-testid`. |

## Prompt Shortcuts (11)

| Shortcut | Workflow |
|---|---|
| `@vg-audit` | Full audit: a11y + layout + testids |
| `@vg-review` | Fix all annotations from latest capture |
| `@vg-capture` | Request fresh capture, summarize result |
| `@vg-diff` | Compare two most recent captures |
| `@vg-testids` | Find and add missing data-testid attributes |
| `@vg-a11y` | Deep a11y audit with automatic source fixes |
| `@vg-tests` | Generate Playwright E2E tests from capture |
| `@vg-ideate` | Generate feature specs from idea-mode annotations |
| `@vg-help` | List all ViewGraph tools with explanations |
| `@vg-debug-ui` | 5-step UI debugging recipe (assess, annotate, audit, fix, verify) |
| `@vg-debug-fullstack` | Full-stack debug with Chrome DevTools MCP + [TracePulse](https://chaoslabz.gitbook.io/tracepulse) |

## Steering Docs (3)

Installed to `.kiro/steering/` to guide the agent's behavior:

| Doc | Purpose |
|---|---|
| `viewgraph-workflow.md` | When and how to use captures, annotations, and verification |
| `viewgraph-resolution.md` | How to resolve annotations with correct action types and summaries |
| `viewgraph-hostile-dom.md` | How to handle degraded captures, empty pages, and hostile DOM conditions |

## Other Agents

ViewGraph works with any MCP-compatible agent via the standard MCP protocol. The 41 tools are the same regardless of agent. Dedicated Power packages for Claude Code, Cursor, Windsurf, and Cline are planned.
