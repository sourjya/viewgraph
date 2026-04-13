# Quick Start (5 minutes)

<figure><img src="/.gitbook/assets/viewgraph-combined.png" alt="ViewGraph" width="480"></figure>

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

Open a terminal in **your project's root directory**:

```bash
npm install viewgraph
npx viewgraph-init
```

![viewgraph-init terminal output](/.gitbook/assets/init-output.png)

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

![Element highlighted with tooltip](/.gitbook/assets/hover-highlight.png)

3. **Click** any element to annotate it - type what's wrong, set severity

![Annotation panel with comment and severity](/.gitbook/assets/annotation-panel.png)

4. **Shift+drag** to select a region
5. Click **Send to Agent**

![Send to Agent button](/.gitbook/assets/send-to-agent.png)

After sending, the button confirms with a green checkmark:

![Send success](/.gitbook/assets/send-to-agent-success.png)

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
