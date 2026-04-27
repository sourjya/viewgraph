# Cross-Tool Setup

ViewGraph works alongside other MCP tools to give your agent complete visibility across the stack. This guide shows you how to set up ViewGraph with Chrome DevTools MCP and TracePulse so your agent can debug frontend, backend, and UI issues in one workflow.

## What Each Tool Does

| Tool | What it sees | When to use it |
|---|---|---|
| **ViewGraph** | DOM structure, accessibility, layout, annotations, test generation | UI looks wrong, elements are broken, a11y issues |
| **Chrome DevTools MCP** | Console errors, network requests, performance traces, page interaction | JavaScript errors, API failures, slow page loads |
| **TracePulse** | Server logs, build errors, hot-reload status | Backend crashes, API errors, build failures |

You don't need all three. Each works independently. But together, they let the agent trace a problem from the server log to the browser console to the broken UI element.

## Step 1: Install ViewGraph

If you haven't already, follow the [Quick Start](../getting-started/quick-start.md) guide. You need:

1. The browser extension (Chrome or Firefox)
2. The MCP server in your agent's config:

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["-y", "@viewgraph/core"],
      "autoApprove": [
        "list_captures",
        "get_capture",
        "get_latest_capture",
        "get_page_summary",
        "get_elements_by_role",
        "get_interactive_elements",
        "find_missing_testids",
        "audit_accessibility",
        "audit_layout",
        "compare_captures",
        "get_annotations",
        "get_annotation_context",
        "resolve_annotation",
        "get_unresolved",
        "request_capture",
        "get_request_status",
        "get_fidelity_report",
        "find_source",
        "get_capture_stats",
        "get_session_status"
      ]
    }
  }
}
```

The `autoApprove` list lets the agent call these tools without asking you each time. All tools listed above are read-only or low-risk. Tools like `resolve_annotation` modify capture files but only to mark annotations as resolved - they don't change your source code.

3. Run `viewgraph-init` from your project folder to configure URL patterns.

Verify it works: open your app in the browser, click the ViewGraph icon, and check for the green dot in the sidebar.

## Step 2: Install Chrome DevTools MCP

Chrome DevTools MCP is Google's official tool for giving AI agents access to Chrome's debugging capabilities.

Add it to your MCP config (same file as ViewGraph):

```json
{
  "mcpServers": {
    "viewgraph": { "..." : "..." },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"],
      "autoApprove": [
        "list_pages", "select_page", "new_page", "close_page",
        "navigate_page", "wait_for", "take_snapshot", "take_screenshot",
        "click", "fill", "fill_form", "hover", "type_text", "press_key",
        "evaluate_script", "emulate", "resize_page",
        "list_console_messages", "get_console_message",
        "list_network_requests", "get_network_request",
        "lighthouse_audit",
        "performance_start_trace", "performance_stop_trace",
        "performance_analyze_insight"
      ]
    }
  }
}
```

### Headless mode (WSL, Linux, CI)

If you don't have a display (WSL, remote server, CI), run Chrome headless with an isolated profile:

```json
{
  "chrome-devtools": {
    "command": "npx",
    "args": [
      "-y", "chrome-devtools-mcp@latest",
      "--headless",
      "--isolated"
    ],
    "autoApprove": ["...same as above..."]
  }
}
```

If Chrome isn't on the default path, add `--executable-path=/path/to/chrome`. For snap-installed Chromium on Ubuntu: `--executable-path=/snap/bin/chromium`.

**Important:** Chrome DevTools MCP controls a separate Chrome window (or headless instance). Your ViewGraph extension runs in your regular Chrome. These are two different browser instances - they don't interfere with each other.

## Step 3: Install TracePulse (Optional)

TracePulse monitors your backend dev server and exposes errors to the agent. If you only work on frontend code, you can skip this.

Add it to your MCP config:

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["-y", "@viewgraph/core"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "tracepulse": {
      "command": "npx",
      "args": ["-y", "@tracepulse/core", "start", "npm run dev"]
    }
  }
}
```

Replace `npm run dev` with whatever command starts your dev server. TracePulse spawns it as a child process and captures stdout/stderr.

## Step 4: Verify the Setup

Restart your agent (or reconnect MCP). Then ask:

```
What MCP tools do you have available?
```

You should see tools from all installed servers:

- **ViewGraph:** list_captures, get_capture, audit_accessibility, etc.
- **Chrome DevTools MCP:** take_snapshot, list_console_messages, navigate_page, etc.
- **TracePulse:** get_errors, watch_for_errors, get_runtime_status, etc.

## How to Use Them Together

### Quick check: "Is anything broken?"

```
Check if there are any errors on my app. Use all available tools.
```

The agent will:
1. Check TracePulse for server errors
2. Check Chrome DevTools for console errors and failed network requests
3. Check ViewGraph for accessibility and layout issues

### After making a change: "Did my fix work?"

```
I just fixed the login form. Verify it works across the stack.
```

The agent will:
1. TracePulse: `watch_for_errors(15)` - wait for hot-reload, check for server errors
2. Chrome DevTools: navigate to the login page, check console and network
3. ViewGraph: request a capture, compare with the previous one, audit accessibility

### Using the debug recipe

The fastest way is the `@vg-debug-fullstack` prompt:

```
@vg-debug-fullstack
```

This runs the full debug sequence automatically. See the [Debug Skills tutorial](debug-skills.md) for details.

## Tips

- **Start with the cheapest check.** TracePulse is instant (no browser needed). Chrome DevTools needs to open a page. ViewGraph needs a capture. The agent knows this order.

- **You don't need to capture manually for every check.** ViewGraph's `request_capture` asks you to capture only when the agent needs fresh DOM state. For console errors and server logs, the other tools handle it.

- **Each tool has its own connection.** If one tool's server goes down, the others keep working. ViewGraph on port 9876, Chrome DevTools on its own Chrome instance, TracePulse on its own process.

- **The agent adapts.** If you only have ViewGraph installed, the debug skills still work - they just skip the backend and browser steps. You can add tools later without changing your workflow.
