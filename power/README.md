# ViewGraph Power Assets

Kiro-specific assets that get installed into your project by `viewgraph-init.js`.
These enhance the AI agent's ability to work with ViewGraph captures.

**[Documentation](https://chaoslabz.gitbook.io/viewgraph)** - **[GitHub](https://github.com/sourjya/viewgraph)**

You don't need to install these manually - the init script handles it. This README documents what gets installed and how it works.

## What Gets Installed

### Hooks (3)

These appear in the **Agent Hooks** section of the Kiro IDE sidebar, or can be triggered via CLI prompts:

| Hook | Trigger | What it does |
|---|---|---|
| **Capture and Audit Page** | Manual (click in sidebar) | Captures the current page, runs a11y audit, checks for missing testids and aria-labels. Summarizes all issues by severity. |
| **Fix ViewGraph Annotations** | Manual (click in sidebar) | Pulls unresolved annotations, maps them to source files, implements fixes in sequence, marks each resolved. |
| **Check TestID Coverage** | Auto on UI file edit | When you edit `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, or `.css` files, checks if interactive elements in recent captures are missing `data-testid`. |

The annotation hook is the most powerful workflow: annotate issues in the browser, click the hook in the sidebar, and Kiro fixes them all in sequence.

### CLI Prompt Shortcuts (7)

In Kiro CLI, type `@vg` then Tab to see all shortcuts:

| Shortcut | Workflow |
|---|---|
| `@vg-audit` | Full audit: a11y + layout + testids |
| `@vg-review` | Fix all annotations from latest capture |
| `@vg-capture <url>` | Request fresh capture, summarize result |
| `@vg-diff` | Compare two most recent captures |
| `@vg-testids` | Find and add missing data-testid attributes |
| `@vg-a11y` | Deep a11y audit with automatic source fixes |
| `@vg-help` | ViewGraph usage guide and tool reference |

### Steering Docs (`.kiro/steering/`)

These guide the agent on when and how to use ViewGraph:

| File | Purpose |
|---|---|
| `viewgraph-workflow.md` | When and how to use captures, annotations, and audits |
| `viewgraph-resolution.md` | How to resolve annotations (action types, summary format) |
| `viewgraph-hostile-dom.md` | How to handle degraded, empty, or broken captures |

### Hook Scripts (`.kiro/hooks/`)

These fire automatically during agent workflows:

| File | Trigger | Purpose |
|---|---|---|
| `vg-context.sh` | Agent starts | Injects capture count and latest filename into agent context |
| `vg-post-fix.sh` | After file write | Reminds agent to verify after editing UI files |
| `vg-fix-annotations.sh` | After get_annotations | Guides agent through annotation resolution workflow |
| `vg-check-testids.sh` | After find_missing_testids | Guides agent to add suggested testids to source code |

### Prompt Files (`.kiro/prompts/`)

| Prompt | Usage | Purpose |
|---|---|---|
| `vg-audit` | `@vg-audit` | Full audit: a11y + layout + testids |
| `vg-review` | `@vg-review` | Act on all annotations from latest capture |
| `vg-capture` | `@vg-capture <url>` | Request capture, summarize result |
| `vg-diff` | `@vg-diff` | Compare two most recent captures |
| `vg-testids` | `@vg-testids [scope]` | Find and fix missing data-testid attributes |
| `vg-a11y` | `@vg-a11y` | Deep a11y audit with source code fixes |
| `vg-help` | `@vg-help` | ViewGraph usage guide and tool reference |

## Install / Update

Run from your project root:

```bash
npx viewgraph-init
```

The init script copies assets only if they don't already exist, so it won't overwrite your customizations. To force-update, delete the files first and re-run.

## Advanced: Manual Hook Configuration

The init script registers hooks automatically. If you need to customize the hook configuration (e.g., change triggers or add conditions), edit `.kiro/agents/your-agent.json`:

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
