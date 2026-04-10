# ViewGraph Power Assets

Kiro-specific assets installed into user projects by `viewgraph-init.js`.
These enhance the AI agent's ability to work with ViewGraph captures.

## What Gets Installed

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
