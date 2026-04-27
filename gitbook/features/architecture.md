# How the Extension Communicates

ViewGraph's browser extension communicates with the MCP server through a service worker - a background process that Chrome manages automatically. This page explains how data flows between the parts and why it's designed this way.

## The Three Layers

```
Your browser tab (content script)
    |
    | chrome.runtime.sendMessage
    v
Service worker (background.js)
    |
    | HTTP / WebSocket
    v
MCP server (Node.js on localhost)
```

**Content script** - runs inside the web page you're viewing. It captures the DOM, renders the sidebar, and handles your annotations. It never talks to the server directly.

**Service worker** - runs in the background, managed by Chrome. It handles all server communication: discovering which server to connect to, authenticating, sending captures, receiving real-time events. It stays alive even when you close the sidebar.

**MCP server** - runs on your machine as a Node.js process. It stores captures, serves them to your AI agent via MCP, and coordinates between the extension and the agent.

## Why a Service Worker?

Before v0.6.0, the content script talked to the server directly. This caused three problems:

1. **Lost connections** - every time you closed the sidebar, the connection dropped. Reopening meant re-discovering the server and re-authenticating.

2. **Duplicate connections** - if you had three tabs open, each tab had its own connection to the server. That's three times the network traffic for the same data.

3. **No background sync** - when the sidebar was closed, nothing happened. If the agent resolved an annotation, you wouldn't know until you reopened the sidebar.

The service worker fixes all three. It maintains a single connection that survives sidebar open/close cycles, shares across tabs, and syncs in the background.

## How Data Flows

### When you open the sidebar

1. The content script sends a `vg-sidebar-opened` message to the service worker
2. The service worker connects a WebSocket to the MCP server (if not already connected)
3. The service worker scans ports 9876-9879 to find the server (cached for 15 seconds)
4. The sidebar loads - it asks the service worker for server info, captures, and resolved annotations
5. All responses come back through `chrome.runtime.sendMessage`

### When you send annotations to the agent

1. You click **Send to Agent** in the sidebar
2. The content script packages the DOM capture with your annotations
3. It sends the package to the service worker via `chrome.runtime.sendMessage`
4. The service worker POSTs it to the MCP server over HTTP
5. The MCP server writes the capture to `.viewgraph/captures/`
6. Your AI agent picks it up via MCP tools

### When the agent resolves an annotation

1. The agent calls `resolve_annotation` via MCP
2. The MCP server updates the capture file and broadcasts a WebSocket event
3. The service worker receives the event and writes it to `chrome.storage.local`
4. The content script's `chrome.storage.onChanged` listener fires
5. The sidebar updates - the annotation shows as resolved with a green checkmark

### When the sidebar is closed

The service worker keeps working:

1. Every 30 seconds, it polls the server for resolved annotations and pending capture requests
2. If the agent requests a capture, the service worker sets a badge number on the extension icon
3. When you reopen the sidebar, it reads the latest state from `chrome.storage.local` - no waiting

## The Service Worker Modules

| Module | What it does |
|---|---|
| `transport-handler.js` | Routes messages from the content script to the server. 14 operations (getInfo, sendCapture, etc.) |
| `discovery-sw.js` | Finds running ViewGraph servers by scanning ports. Caches results in storage. |
| `auth-sw.js` | Handles HMAC authentication. Session persists in `chrome.storage.session`. |
| `ws-manager.js` | Manages the WebSocket connection. Connects when any sidebar is open, disconnects when all close. |
| `sync-alarms.js` | Polls for resolved annotations and pending requests every 30 seconds using Chrome alarms. |

## What This Means for You

You don't need to do anything differently. The extension works the same way it always has - open the sidebar, annotate, send to agent. The difference is:

- **Faster sidebar open** - the server is already discovered and authenticated
- **Real-time updates** - annotation resolutions appear instantly via WebSocket
- **Background awareness** - badge shows when the agent needs your attention
- **Resolved history** - the Resolved tab shows past resolutions even after reloading the extension
