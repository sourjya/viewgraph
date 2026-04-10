# ViewGraph Power Assets

Kiro-specific assets installed into user projects by `viewgraph-init.js`.
These enhance the AI agent's ability to work with ViewGraph captures.

## What Gets Installed

### For Kiro IDE

Three hooks appear in the **Agent Hooks** section of the Kiro sidebar:

| Hook | Trigger | What it does |
|---|---|---|
| **Capture and Audit Page** | Manual (click in sidebar) | Captures the current page, runs a11y audit, checks for missing testids and aria-labels. Summarizes all issues by severity. |
| **Fix ViewGraph Annotations** | Manual (click in sidebar) | Pulls unresolved annotations, maps them to source files, implements fixes in sequence, marks each resolved. |
| **Check TestID Coverage** | Auto on UI file edit | When you edit `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, or `.css` files, checks if interactive elements in recent captures are missing `data-testid`. |

The annotation hook is the most powerful workflow: annotate issues in the browser, click the hook in the sidebar, and Kiro fixes them all in sequence.

### For Kiro CLI

Type `@vg` then Tab to see all prompt shortcuts:

| Shortcut | Workflow |
|---|---|
| `@vg-audit` | Full audit: a11y + layout + testids |
| `@vg-review` | Fix all annotations from latest capture |
| `@vg-capture <url>` | Request fresh capture, summarize result |
| `@vg-diff` | Compare two most recent captures |
| `@vg-testids` | Find and add missing data-testid attributes |
| `@vg-a11y` | Deep a11y audit with automatic source fixes |

### Assets Installed

### Steering Docs (`.kiro/steering/`)

| File | Purpose |
|---|---|
| `viewgraph-workflow.md` | When and how to use captures, annotations, and audits |
| `viewgraph-resolution.md` | How to resolve annotations (action types, summary format) |

### Hook Scripts (`.kiro/hooks/`)

| File | Trigger | Purpose |
|---|---|---|
| `vg-context.sh` | agentSpawn | Injects capture count and latest filename on agent start |
| `vg-post-fix.sh` | postToolUse (fs_write) | Reminds agent to verify after editing UI files |
| `vg-fix-annotations.sh` | postToolUse (get_annotations) | Guides agent through annotation resolution workflow |
| `vg-check-testids.sh` | postToolUse (find_missing_testids) | Guides agent to add suggested testids to source code |

### Prompts (`.kiro/prompts/`)

| Prompt | Usage | Purpose |
|---|---|---|
| `vg-audit` | `@vg-audit` | Full audit: a11y + layout + testids |
| `vg-review` | `@vg-review` | Act on all annotations from latest capture |
| `vg-capture` | `@vg-capture <url>` | Request capture, summarize result |
| `vg-diff` | `@vg-diff` | Compare two most recent captures |
| `vg-testids` | `@vg-testids [scope]` | Find and fix missing data-testid attributes |
| `vg-a11y` | `@vg-a11y` | Deep a11y audit with source code fixes |

## Hook Integration

To activate the hooks, add them to your Kiro agent config (`.kiro/agents/your-agent.json`):

```json
{
  "hooks": {
    "agentSpawn": [
      {
        "command": ".kiro/hooks/vg-context.sh",
        "description": "ViewGraph: show available captures"
      }
    ],
    "postToolUse": [
      {
        "matcher": "write",
        "command": ".kiro/hooks/vg-post-fix.sh",
        "description": "ViewGraph: remind to verify UI fixes"
      },
      {
        "matcher": "@viewgraph/get_annotations",
        "command": ".kiro/hooks/vg-fix-annotations.sh",
        "description": "ViewGraph: guide annotation resolution"
      },
      {
        "matcher": "@viewgraph/find_missing_testids",
        "command": ".kiro/hooks/vg-check-testids.sh",
        "description": "ViewGraph: guide testid addition"
      }
    ]
  }
}
```

## Install / Update

Run from your project root:

```bash
node /path/to/viewgraph/scripts/viewgraph-init.js
```

Assets are only copied if they don't already exist (won't overwrite customizations).
