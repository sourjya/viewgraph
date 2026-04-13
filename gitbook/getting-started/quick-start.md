# Quick Start (5 minutes)

Go from zero to your first AI-assisted bug fix in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS)
- Chrome 116+ or Firefox 109+
- An MCP-compatible AI agent (Kiro, Claude Code, Cursor, Windsurf, Cline, or Aider)

## 1. Install the extension

<!-- TODO: Replace with actual CWS link when published -->
Install [ViewGraph Capture](https://chrome.google.com/webstore) from the Chrome Web Store.

Or [build from source](installation.md#from-source-for-development) if you prefer.

## 2. Initialize in your project

Open a terminal in **your project's root directory** (not the ViewGraph directory):

```bash
npx viewgraph-init
```

You'll see:

```
ViewGraph Init

  Created .viewgraph/captures/
  Detected Kiro

  Wrote .kiro/settings/mcp.json

Starting ViewGraph server...

  Started (PID 12345, port 9876)
  Extension popup should show green dot.

Done.
```

**Using a dev server?** Add `--url` so captures route correctly:

```bash
npx viewgraph-init --url localhost:3000
```

## 3. Capture and annotate

1. Open your app in Chrome
2. Click the **ViewGraph** icon - sidebar opens, elements highlight on hover
3. **Click** any element to annotate it - type what's wrong, set severity
4. **Shift+drag** to select a region
5. Click **Send to Agent**

## 4. Let your agent fix it

Tell your agent:

```
Fix the annotations from the latest ViewGraph capture
```

The agent reads your annotations with full DOM context, finds the source files, implements fixes, and marks each annotation as resolved. Green checkmarks appear in the sidebar.

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
