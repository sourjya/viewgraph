# Quick Start (5 minutes)

<figure><img src="../.gitbook/assets/viewgraph-logo.png" alt="ViewGraph" width="420"></figure>

Go from zero to your first AI-assisted bug fix in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+ (LTS)
- [Chrome](https://www.google.com/chrome/) 116+ or [Firefox](https://www.mozilla.org/firefox/) 109+
- An MCP-compatible AI agent ([Kiro](https://kiro.dev/), [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview), [Cursor](https://www.cursor.com/), [Windsurf](https://windsurf.com/), [Cline](https://cline.bot/), or [Aider](https://aider.chat/))

## 1. Install the extension

[![Chrome - Install](https://img.shields.io/badge/Chrome-Install_Extension-4285F4?style=flat-square)](https://chromewebstore.google.com/detail/viewgraph-capture/dmgbneoidgmkdcfnlegmfijkedijjnjj) [![Firefox - Install](https://img.shields.io/badge/Firefox-Install_Extension-FF7139?style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/)

{% hint style="info" %}
**Store version outdated?** Chrome/Firefox store reviews can delay updates. Check your version in the sidebar footer. If it's behind, [install the latest from GitHub](manual-install.md) instead.
{% endhint %}

## 2. Connect to your AI agent

Add ViewGraph to your agent's MCP config. The server runs automatically via [`npx`](https://docs.npmjs.com/cli/commands/npx) - no install needed.

**For Kiro** (`~/.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["-y", "@viewgraph/core"],
      "autoApprove": [
        "list_captures", "get_capture", "get_latest_capture", "get_page_summary",
        "get_elements_by_role", "get_interactive_elements", "find_missing_testids",
        "audit_accessibility", "audit_layout", "compare_captures",
        "get_annotations", "get_annotation_context", "resolve_annotation",
        "get_unresolved", "request_capture", "get_request_status",
        "get_fidelity_report", "find_source", "get_capture_stats", "get_session_status"
      ]
    }
  }
}
```

The `autoApprove` list lets the agent call these tools without asking permission each time. All listed tools are read-only or low-risk (they don't modify your source code).

**For Claude Code** (`~/.claude/mcp.json`), **Cursor**, **Windsurf**, **Cline** - same JSON, different config file location. See [Installation](installation.md) for each agent's config path.

That's it. Open your project, start your agent, and the server auto-configures on first capture.

> **Alternative: npm install**
> If you prefer explicit control over versions and config:
> ```bash
> # Step 1: Install ViewGraph globally (one time only)
> npm install -g @viewgraph/core
>
> # Step 2: Set up your project
> cd ~/my-project
> viewgraph-init
> ```
> If your app runs on a local server (e.g., `localhost:3000`), tell ViewGraph the URL:
> ```bash
> viewgraph-init --url localhost:3000
> ```
> See [Installation](installation.md) for details.

## 3. Capture and annotate

1. Open your app in Chrome
2. Click the **ViewGraph** icon - sidebar opens, elements highlight on hover

![Element highlighted with tooltip](../.gitbook/assets/hover-highlight.png)

3. **Click** any element to annotate it - type what's wrong, set severity

![Annotation panel with comment and severity](../.gitbook/assets/annotation-panel.png)

4. **Shift+drag** to select a region
5. Click **Send to Agent**

![Send to Agent button](../.gitbook/assets/send-to-agent.png)

After sending, your annotations show "Sent to agent - waiting for fix...":

![Annotations sent and waiting for agent to fix](../.gitbook/assets/sent-waiting-for-fix.png)

## 4. Let your agent fix it

In your agent's chat, use the `@vg-review` prompt shortcut (if available) or just tell it:

```
Fix the annotations from the latest ViewGraph capture
```

Or be more specific - copy the capture filename from the sidebar footer and paste it:

```
Review and fix all annotations in viewgraph-localhost-2026-05-01-120000.json
```

The agent will:
1. Read your annotations with full DOM context (selectors, styles, a11y state)
2. Find the source files using `find_source`
3. Implement the fixes
4. Mark each annotation as resolved

Green checkmarks appear in the sidebar as each fix lands. If the agent has [Chrome DevTools MCP](https://github.com/anthropics/anthropic-devtools-mcp) installed, it will also take a screenshot to visually verify each fix.

{% hint style="success" %}
**Pro tip:** You don't need to describe the DOM. Just describe what looks wrong in plain language - "button too small", "text overlaps image", "missing label". ViewGraph attaches the element's exact selector, computed styles, bounding box, and accessibility state automatically. The agent gets everything it needs from the capture.
{% endhint %}

## What just happened?

1. You clicked a broken element and described the problem
2. ViewGraph captured the full DOM - every element's selector, styles, attributes, accessibility state, network errors, console warnings
3. Your annotation + the DOM context were sent to the MCP server
4. Your agent read the capture via MCP tools, found the source file, and fixed the code
5. The agent resolved the annotation, and the sidebar updated in real-time

## Next steps

- [Installation guide](installation.md) - detailed setup for Chrome, Firefox, and all agents
- [Multi-project setup](multi-project.md) - run multiple projects simultaneously
- Try the demo: open `docs/demo/index.html` in the ViewGraph repo - a login page with 8 planted bugs to practice on
- **Tip:** Enable HTML snapshots and screenshots in sidebar settings (footer link) for visual evidence alongside your captures
